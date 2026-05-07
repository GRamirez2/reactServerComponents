'use server';

import { parseOffice } from 'officeparser';

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

export type ParseResult = {
  fileName: string;
  text: string;
  metadata: unknown;
  content: unknown;
  json: Record<string, string>[];
};

export type ParseActionState = {
  errorMessage: string | null;
  result: ParseResult | null;
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

export async function parseDataAction(
  _prevState: ParseActionState,
  formData: FormData,
): Promise<ParseActionState> {
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
