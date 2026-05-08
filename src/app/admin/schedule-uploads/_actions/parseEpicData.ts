'use server';

import { parseOffice } from 'officeparser';
import { eq } from 'drizzle-orm';
import db from '@/lib/db';
import { specialties, tasks, userSpecialties, users } from '@/lib/schema';

const allowedExtensions = new Set(['.xlsx', '.xlsb']);

type CellNode = {
  type: string;
  text: string;
  children: CellNode[];
  metadata?: { row: number; col: number };
};

type SheetNode = {
  type: string;
  children: CellNode[];
};

export type ParseEpicResult = {
  fileName: string;
  text: string;
  metadata: unknown;
  content: unknown;
  json: Record<string, string>[];
};

export type ParseEpicActionState = {
  errorMessage: string | null;
  result: ParseEpicResult | null;
};

export type CreateAssignmentsActionState = {
  errorMessage: string | null;
  successMessage: string | null;
  insertedCount: number;
  skippedCount: number;
};

export type AssignmentPreview = {
  totalRows: number;
  rowsWithCaseId: number;
  specialtyMatchedRows: number;
  doctorMatchedRows: number;
  skippedRows: number;
  uniqueMatchedSpecialties: number;
  uniqueMatchedDoctors: number;
  topSpecialties: Array<{
    specialtyId: number;
    codeRange: string;
    count: number;
  }>;
  topDoctors: Array<{ doctorId: string; doctorEmail: string; count: number }>;
};

export type PreviewAssignmentsActionState = {
  errorMessage: string | null;
  preview: AssignmentPreview | null;
};

type ParsedRange = {
  start: number;
  end: number;
};

type SpecialtyWithRanges = {
  id: number;
  codeRange: string;
  ranges: ParsedRange[];
};

type AssignmentComputation = {
  taskRows: (typeof tasks.$inferInsert)[];
  preview: AssignmentPreview;
};

function contentToJson(content: SheetNode[]): Record<string, string>[] {
  const sheet = content.find((node) => node.type === 'sheet');
  if (!sheet?.children) return [];

  const rows = sheet.children.filter((node) => node.type === 'row');
  if (rows.length < 2) return [];

  const headerCells = rows[0].children ?? [];
  const headerMap: Record<number, string> = {};
  headerCells.forEach((cell) => {
    const col = cell.metadata?.col ?? 0;
    headerMap[col] = cell.text ?? '';
  });

  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    Object.values(headerMap).forEach((header) => {
      obj[header] = '';
    });
    (row.children ?? []).forEach((cell) => {
      const col = cell.metadata?.col ?? 0;
      const header = headerMap[col];
      if (header !== undefined) {
        obj[header] = cell.text ?? '';
      }
    });
    return obj;
  });
}

function getFileExtension(fileName: string) {
  const extensionIndex = fileName.lastIndexOf('.');
  return extensionIndex === -1
    ? ''
    : fileName.slice(extensionIndex).toLowerCase();
}

/**
 * Normalizes a spreadsheet header into an uppercase alphanumeric key so
 * equivalent headers with different spacing/punctuation can be matched.
 */
function normalizeHeader(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Reads the first non-empty cell value from a row using a list of possible
 * header aliases (for example: CASE_ID, CASE ID, CASEID).
 */
function getRowValue(row: Record<string, string>, headers: string[]) {
  const normalizedRow = new Map<string, string>();

  Object.entries(row).forEach(([key, value]) => {
    normalizedRow.set(normalizeHeader(key), value ?? '');
  });

  for (const header of headers) {
    const value = normalizedRow.get(normalizeHeader(header));
    if (value !== undefined && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

/**
 * Converts a raw string into an integer. Returns null when the value is empty
 * or not a valid whole number.
 */
function parseInteger(value: string): number | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/,/g, '').trim();
  if (!/^-?\d+$/.test(sanitized)) {
    return null;
  }

  const parsed = Number.parseInt(sanitized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Parses common truthy spellings used in spreadsheets.
 */
function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ['true', 't', 'yes', 'y', '1'].includes(normalized);
}

/**
 * Parses one code-range segment into an inclusive numeric range.
 */
function parseRangeSegment(segment: string): ParsedRange | null {
  const values = segment.match(/\d+/g)?.map((raw) => Number.parseInt(raw, 10));

  if (!values || values.length === 0 || values.some(Number.isNaN)) {
    return null;
  }

  if (values.length === 1) {
    return { start: values[0], end: values[0] };
  }

  const start = Math.min(values[0], values[1]);
  const end = Math.max(values[0], values[1]);
  return { start, end };
}

/**
 * Parses a specialty code_range field that may contain one or more ranges
 * separated by commas/semicolons/pipes.
 */
function parseCodeRange(codeRange: string): ParsedRange[] {
  return codeRange
    .split(/[,;|]/)
    .map((segment) => parseRangeSegment(segment.trim()))
    .filter((segment): segment is ParsedRange => segment !== null);
}

function matchesAnyRange(caseId: number, ranges: ParsedRange[]) {
  return ranges.some((range) => caseId >= range.start && caseId <= range.end);
}

function rangeSpan(ranges: ParsedRange[]) {
  if (ranges.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...ranges.map((range) => range.end - range.start));
}

function findMatchingSpecialty(
  caseId: number,
  specialtiesWithRanges: SpecialtyWithRanges[],
): SpecialtyWithRanges | null {
  const matches = specialtiesWithRanges.filter((specialty) =>
    matchesAnyRange(caseId, specialty.ranges),
  );

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    const bySpecificity = rangeSpan(left.ranges) - rangeSpan(right.ranges);
    if (bySpecificity !== 0) {
      return bySpecificity;
    }

    return left.id - right.id;
  });

  return matches[0] ?? null;
}

/**
 * Parses Epic JSON payload posted from the client and validates the top-level
 * shape. Returns a user-facing error when invalid.
 */
function parseEpicJsonRows(epicJson: string): {
  rows: Record<string, string>[];
  errorMessage: string | null;
} {
  try {
    const parsed = JSON.parse(epicJson) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        errorMessage: 'Epic upload data is invalid. Upload Epic data again.',
      };
    }

    return {
      rows: parsed.filter(
        (entry): entry is Record<string, string> =>
          typeof entry === 'object' && entry !== null,
      ),
      errorMessage: null,
    };
  } catch {
    return {
      rows: [],
      errorMessage: 'Epic upload data is invalid. Upload Epic data again.',
    };
  }
}

/**
 * Computes assignment candidates and preview metrics without persisting.
 * This shared method keeps preview and create logic identical.
 */
async function computeEpicAssignments(
  rows: Record<string, string>[],
): Promise<AssignmentComputation> {
  const [specialtyRows, mappingRows] = await Promise.all([
    db
      .select({ id: specialties.id, codeRange: specialties.codeRange })
      .from(specialties),
    db
      .select({
        specialtyId: userSpecialties.specialtyId,
        doctorId: userSpecialties.userId,
        doctorEmail: users.email,
        isPrimary: userSpecialties.isPrimary,
      })
      .from(userSpecialties)
      .innerJoin(users, eq(userSpecialties.userId, users.id))
      .where(eq(users.role, 'DOCTOR')),
  ]);

  const specialtiesWithRanges = specialtyRows
    .map((specialty) => ({
      id: specialty.id,
      codeRange: specialty.codeRange,
      ranges: parseCodeRange(specialty.codeRange),
    }))
    .filter((specialty) => specialty.ranges.length > 0);

  const doctorBySpecialty = new Map<
    number,
    { doctorId: string; doctorEmail: string }
  >();

  mappingRows
    .slice()
    .sort((left, right) => {
      if (left.specialtyId !== right.specialtyId) {
        return left.specialtyId - right.specialtyId;
      }

      if (left.isPrimary === right.isPrimary) {
        return 0;
      }

      return left.isPrimary ? -1 : 1;
    })
    .forEach((mapping) => {
      if (!doctorBySpecialty.has(mapping.specialtyId)) {
        doctorBySpecialty.set(mapping.specialtyId, {
          doctorId: mapping.doctorId,
          doctorEmail: mapping.doctorEmail,
        });
      }
    });

  const taskRows: (typeof tasks.$inferInsert)[] = [];
  const specialtyCountById = new Map<number, number>();
  const doctorCountById = new Map<
    string,
    { doctorEmail: string; count: number }
  >();

  let rowsWithCaseId = 0;
  let specialtyMatchedRows = 0;
  let doctorMatchedRows = 0;
  let skippedRows = 0;

  for (const row of rows) {
    const caseId = parseInteger(
      getRowValue(row, ['CASE_ID', 'CASE ID', 'CASEID']),
    );

    if (caseId === null) {
      skippedRows += 1;
      continue;
    }

    rowsWithCaseId += 1;

    const matchingSpecialty = findMatchingSpecialty(
      caseId,
      specialtiesWithRanges,
    );
    if (!matchingSpecialty) {
      skippedRows += 1;
      continue;
    }

    specialtyMatchedRows += 1;
    specialtyCountById.set(
      matchingSpecialty.id,
      (specialtyCountById.get(matchingSpecialty.id) ?? 0) + 1,
    );

    const assignedDoctor = doctorBySpecialty.get(matchingSpecialty.id);
    if (!assignedDoctor) {
      skippedRows += 1;
      continue;
    }

    doctorMatchedRows += 1;
    const doctorCounts = doctorCountById.get(assignedDoctor.doctorId);
    doctorCountById.set(assignedDoctor.doctorId, {
      doctorEmail: assignedDoctor.doctorEmail,
      count: (doctorCounts?.count ?? 0) + 1,
    });

    const specimenName =
      getRowValue(row, [
        'SPECIMEN_TYPE_C_NAME',
        'SPECIMAN_NAME',
        'SPECIMAN NAME',
        'SPECIMEN_NAME',
        'SPECIMEN NAME',
        'SPECIMEN',
      ]) || `Case ${caseId}`;
    const specimenId = parseInteger(
      getRowValue(row, [
        'SPECIMEN_ID',
        'SPECIMEN ID',
        'SPECIMAN_ID',
        'SPECIMAN ID',
      ]),
    );
    const points = parseInteger(getRowValue(row, ['POINTS', 'POINT', 'RVU']));
    const specFrozen = parseBoolean(
      getRowValue(row, ['SPEC_FROZEN', 'SPEC FROZEN', 'FROZEN', 'IS_FROZEN']),
    );

    taskRows.push({
      doctorId: assignedDoctor.doctorId,
      specimanName: specimenName,
      specimenId,
      caseId,
      points,
      specFrozen,
      completed: false,
    });
  }

  const topSpecialties = Array.from(specialtyCountById.entries())
    .map(([specialtyId, count]) => {
      const codeRange =
        specialtyRows.find((specialty) => specialty.id === specialtyId)
          ?.codeRange ?? 'Unknown range';
      return { specialtyId, codeRange, count };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const topDoctors = Array.from(doctorCountById.entries())
    .map(([doctorId, value]) => ({
      doctorId,
      doctorEmail: value.doctorEmail,
      count: value.count,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  return {
    taskRows,
    preview: {
      totalRows: rows.length,
      rowsWithCaseId,
      specialtyMatchedRows,
      doctorMatchedRows,
      skippedRows,
      uniqueMatchedSpecialties: specialtyCountById.size,
      uniqueMatchedDoctors: doctorCountById.size,
      topSpecialties,
      topDoctors,
    },
  };
}

export async function parseEpicData(
  _prevState: ParseEpicActionState,
  formData: FormData,
): Promise<ParseEpicActionState> {
  const file = formData.get('document');

  if (!(file instanceof File)) {
    return { errorMessage: 'A spreadsheet file is required.', result: null };
  }

  const fileExtension = getFileExtension(file.name);

  if (!allowedExtensions.has(fileExtension)) {
    return {
      errorMessage: 'Only .xlsx and .xlsb files are allowed.',
      result: null,
    };
  }

  if (fileExtension === '.xlsb') {
    return {
      errorMessage:
        'officeparser does not support .xlsb files. Upload an .xlsx file to render parsed JSON.',
      result: null,
    };
  }

  try {
    const fileBuffer = await file.arrayBuffer();
    const ast = await parseOffice(fileBuffer, {
      includeRawContent: false,
    });

    return {
      errorMessage: null,
      result: {
        fileName: file.name,
        text: ast.toText(),
        metadata: ast.metadata,
        content: ast.content,
        json: contentToJson(ast.content as SheetNode[]),
      },
    };
  } catch {
    return {
      errorMessage: 'The spreadsheet could not be parsed.',
      result: null,
    };
  }
}

/**
 * Persists task assignments for Epic rows, but only when the payload exactly
 * matches the payload that was previewed on the client.
 *
 * Implements deduplication based on specimenId to prevent duplicate specimen
 * entries. This allows a single CASE_ID to have multiple different SPECIMEN_IDs
 * without re-creating tasks for specimens that have already been processed.
 * If a specimenId already exists in the database, the corresponding task row
 * is skipped during insertion.
 *
 * @param _prevState - The previous action state
 * @param formData - Form data containing epicJson and previewEpicJson
 * @returns CreateAssignmentsActionState with counts and status messages
 */
export async function createEpicAssignmentsAction(
  _prevState: CreateAssignmentsActionState,
  formData: FormData,
): Promise<CreateAssignmentsActionState> {
  const epicJson = String(formData.get('epicJson') ?? '[]');
  const previewEpicJson = String(formData.get('previewEpicJson') ?? '');

  if (!previewEpicJson || previewEpicJson !== epicJson) {
    return {
      errorMessage:
        'Epic data changed since preview. Preview assignments again before creating.',
      successMessage: null,
      insertedCount: 0,
      skippedCount: 0,
    };
  }

  const { rows, errorMessage } = parseEpicJsonRows(epicJson);
  if (errorMessage) {
    return {
      errorMessage,
      successMessage: null,
      insertedCount: 0,
      skippedCount: 0,
    };
  }

  if (rows.length === 0) {
    return {
      errorMessage: 'No Epic rows were found to assign.',
      successMessage: null,
      insertedCount: 0,
      skippedCount: 0,
    };
  }

  const { taskRows, preview } = await computeEpicAssignments(rows);

  /**
   * Query existing specimenIds to prevent duplicate specimen entries.
   * This ensures that if the same specimen has already been processed
   * and inserted into the database, we won't create a duplicate task.
   */
  const existingSpecimens = await db
    .select({ specimenId: tasks.specimenId })
    .from(tasks);

  const existingSpecimenIds = new Set(
    existingSpecimens
      .map((specimen) => specimen.specimenId)
      .filter((id): id is number => id !== null),
  );

  /**
   * Filter task rows to only include those with specimenIds that don't
   * already exist in the database. This prevents duplicate entries while
   * allowing multiple tasks for the same caseId with different specimenIds.
   */
  const newTaskRows = taskRows.filter(
    (row) =>
      row.specimenId === null || !existingSpecimenIds.has(row.specimenId ?? 0),
  );

  if (newTaskRows.length > 0) {
    await db.insert(tasks).values(newTaskRows);
  }

  return {
    errorMessage: null,
    successMessage: `Created ${newTaskRows.length} assignments. Skipped ${preview.skippedRows} specimens with no doctor match.`,
    insertedCount: newTaskRows.length,
    skippedCount: preview.skippedRows,
  };
}

/**
 * Builds a non-persistent assignment preview so users can verify match counts
 * and distribution before inserting tasks.
 */
export async function previewEpicAssignmentsAction(
  _prevState: PreviewAssignmentsActionState,
  formData: FormData,
): Promise<PreviewAssignmentsActionState> {
  const epicJson = String(formData.get('epicJson') ?? '[]');
  const { rows, errorMessage } = parseEpicJsonRows(epicJson);

  if (errorMessage) {
    return {
      errorMessage,
      preview: null,
    };
  }

  if (rows.length === 0) {
    return {
      errorMessage: 'No Epic rows were found to preview.',
      preview: null,
    };
  }

  const { preview } = await computeEpicAssignments(rows);

  return {
    errorMessage: null,
    preview,
  };
}
