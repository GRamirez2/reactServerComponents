# Epic Upload Algorithm Flow

## Overview

The Epic upload feature processes spreadsheet data through three main phases:

1. **File Parsing** - Extract rows from Excel file
2. **Preview** - Compute assignments without persisting (validation step)
3. **Create** - Persist assignments to database with deduplication

This document describes the current flow and recommendations for adding a registry pattern to support complex parsing algorithms.

---

## Current Flow - Step by Step

### Phase 1: File Upload & Parsing

**Components & Files Involved:**

- `EpicSpreadsheetUpload.tsx` (client component)
- `parseEpicData.ts` (server action)

**Flow:**

1. **User selects file** in `EpicSpreadsheetUpload`
   - File input accepts `.xlsx` and `.xlsb` formats
   - Submits form to `parseEpicData` server action

2. **Validate file extension** in `parseEpicData()`
   - Only `.xlsx` and `.xlsb` allowed
   - `.xlsb` rejected with note that officeparser doesn't support it

3. **Parse Excel file** using `officeparser` library
   - Converts binary Excel file to Abstract Syntax Tree (AST)
   - Extracts spreadsheet structure

4. **Convert AST to JSON** via `contentToJson()`
   - Extracts header row (row 0)
   - Maps header cell text to column numbers
   - Converts each subsequent row to object using header map
   - Returns array of `Record<string, string>[]`

5. **Return ParseEpicResult** to client
   - Contains: fileName, text, metadata, content, and **json** array
   - Client `useEffect` watches `state.result`
   - Calls `onUploadSuccess(true, rows)` callback

6. **Store in parent state**
   - `ScheduleUploadsClient` receives rows via callback
   - Stores in `epicRows` state
   - Clears `previewedEpicJson` to invalidate stale previews

---

### Phase 2: Preview Assignments

**Components & Files Involved:**

- `ScheduleUploadsClient.tsx` (client component)
- `previewEpicAssignmentsAction()` (server action)
- `computeEpicAssignments()` (core algorithm)

**Flow:**

1. **User clicks "Preview Assignments"** (only visible when both Epic and Calendar files uploaded)
   - Form submission with `epicJson` hidden input containing `JSON.stringify(epicRows)`
   - Calls `previewEpicAssignmentsAction()`

2. **Validate JSON payload** in `previewEpicAssignmentsAction()`
   - Calls `parseEpicJsonRows()` to safely parse JSON string
   - Handles parse errors and empty arrays
   - Returns user-facing error if invalid

3. **Execute core assignment logic** via `computeEpicAssignments(rows)`
   - **Database queries** (parallel):
     - Fetch all specialties with their `codeRange` fields
     - Fetch all doctor-specialty mappings (users with DOCTOR role)
   - **Parse specialty ranges**:
     - For each specialty, parse `codeRange` string (e.g., "100-200,300-350")
     - Extract numeric ranges using `parseCodeRange()` helper
     - Filter out specialties with invalid or empty ranges
   - **Build lookup maps**:
     - Map specialty ID → doctor (picks primary doctor if available, else first)
   - **Process each row**:
     - Extract `CASE_ID` using flexible header matching (handles "CASE_ID", "CASE ID", "CASEID")
     - If no valid `CASE_ID`, skip row and increment counter
     - Call `findMatchingSpecialty(caseId, specialtiesWithRanges)`
       - Find all specialties whose ranges contain the case ID
       - Sort by specificity (smallest range span wins)
       - Return most specific match
     - If no matching specialty, skip row
     - Look up assigned doctor for matched specialty
     - If no doctor assigned, skip row
     - Extract other fields (specimen name, ID, points, frozen status)
     - Build task record with all fields
     - Track counts for each specialty and doctor
   - **Aggregate metrics**:
     - Count total rows, rows with CASE_ID, specialty matches, doctor matches, skipped
     - Get top 5 specialties by matched row count
     - Get top 5 doctors by assigned row count

4. **Return AssignmentPreview** to client
   - Contains all counts and top specialties/doctors
   - `ScheduleUploadsClient` displays stats in read-only preview section

5. **Store preview state**
   - Saves `previewState.preview` object
   - Saves `previewedEpicJson` (serialized rows) to detect if data changed

---

### Phase 3: Create Assignments

**Components & Files Involved:**

- `ScheduleUploadsClient.tsx` (client component)
- `createEpicAssignmentsAction()` (server action)

**Flow:**

1. **User clicks "Create Assignments"** (only visible when preview is fresh and has doctor matches)
   - Form submission with `epicJson` and `previewEpicJson` hidden inputs
   - Calls `createEpicAssignmentsAction()`

2. **Validate data hasn't changed**
   - Compares `epicJson` with `previewEpicJson` string equality
   - Rejects creation if data changed (user must preview again)

3. **Re-run computations**
   - Calls same `computeEpicAssignments()` logic
   - Ensures consistency between preview and creation

4. **Fetch existing specimen IDs** from database
   - Query all existing tasks, extract their `specimenId` values
   - Store in Set for O(1) lookup

5. **Deduplicate**
   - Filter `taskRows` to only include new `specimenId` values
   - Allows multiple tasks for same `caseId` if they have different `specimenId`
   - Prevents re-creating tasks for already-processed specimens

6. **Batch insert**
   - Insert new task rows into `tasks` table using `db.insert()`

7. **Return success message**
   - Shows inserted count and skipped count
   - Updates `ScheduleUploadsClient` UI with results

---

## Current Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: FILE UPLOAD & PARSING                                  │
└─────────────────────────────────────────────────────────────────┘

User selects file
    ↓
EpicSpreadsheetUpload component
    ↓
parseEpicData server action
    ├─→ Validate extension
    ├─→ Parse Excel with officeparser
    ├─→ contentToJson() → array of row objects
    └─→ Return ParseEpicResult
            ↓
        useEffect → onUploadSuccess callback
            ↓
        ScheduleUploadsClient stores epicRows state


┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: PREVIEW ASSIGNMENTS                                    │
└─────────────────────────────────────────────────────────────────┘

User clicks "Preview Assignments"
    ↓
previewEpicAssignmentsAction server action
    ├─→ parseEpicJsonRows() - validate JSON
    └─→ computeEpicAssignments()
        ├─→ Fetch specialties from DB
        ├─→ Fetch doctor→specialty mappings from DB
        ├─→ Parse code ranges into numeric spans
        ├─→ FOR EACH ROW:
        │   ├─→ Extract CASE_ID (flexible header matching)
        │   ├─→ Find matching specialty (by code range)
        │   ├─→ Lookup assigned doctor
        │   ├─→ Extract specimen/case details
        │   └─→ Build task record & update counts
        └─→ Aggregate metrics (top specialties/doctors)
            ↓
        Return AssignmentPreview
            ↓
        ScheduleUploadsClient displays stats


┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: CREATE ASSIGNMENTS                                     │
└─────────────────────────────────────────────────────────────────┘

User clicks "Create Assignments"
    ↓
createEpicAssignmentsAction server action
    ├─→ Validate epicJson matches previewEpicJson
    ├─→ computeEpicAssignments() (same as preview)
    ├─→ Fetch existing specimenIds from DB
    ├─→ Filter taskRows (only new specimenIds)
    ├─→ Batch insert into tasks table
    └─→ Return success/error message
```

---

## Key Helper Functions

### Row Field Extraction

**`getRowValue(row, headers)`**

- Extracts first non-empty cell value from row using list of header aliases
- Handles spacing/punctuation differences (CASE_ID, CASE ID, CASEID)
- Returns trimmed string or empty string if not found

**`parseInteger(value)`**

- Converts string to integer, handles commas (1,000 → 1000)
- Returns null if invalid or empty

**`parseBoolean(value)`**

- Converts various truthy spellings (true, t, yes, y, 1) to boolean

### Range Matching

**`parseCodeRange(codeRange)`**

- Converts specialty code range string into array of numeric ranges
- Supports separators: commas, semicolons, pipes
- Examples: "100-200,300-350" → [{start: 100, end: 200}, {start: 300, end: 350}]

**`matchesAnyRange(caseId, ranges)`**

- Tests if caseId falls within any of the parsed ranges

**`rangeSpan(ranges)`**

- Calculates specificity (smallest range span)
- Used to prefer more specific matches

**`findMatchingSpecialty(caseId, specialtiesWithRanges)`**

- Finds all specialties that match the caseId
- Sorts by specificity (smallest span wins)
- Returns most specific match or null

---

## Recommendations for Registry Pattern

As you add more complex parsing requirements, implement a **registry pattern** to keep code modular and allow feature flags or dynamic strategy selection.

### Recommended Approach: Row Extraction Registry

**Why this approach:**

- Current code mixes field extraction logic with assignment logic in `computeEpicAssignments()`
- As you add more data sources (Calendar uploads, custom exports), you'll duplicate extraction logic
- Registry allows plugging in different extractors without modifying core assignment logic

**Architecture:**

```
src/app/admin/schedule-uploads/_actions/
├── parseEpicData.ts          (current - main entry point)
├── parsers/
│   ├── rowExtractorRegistry.ts   (NEW - registry pattern)
│   ├── epicRowExtractor.ts       (NEW - extracted logic)
│   └── types.ts                  (NEW - shared types)
└── computeAssignments.ts         (NEW - refactored core logic)
```

### Step 1: Create Row Extractor Interface

```typescript
// src/app/admin/schedule-uploads/_actions/parsers/types.ts

export interface RowExtractor {
  name: string;
  canHandle: (row: Record<string, string>) => boolean;
  extract: (row: Record<string, string>) => ExtractedRow;
}

export interface ExtractedRow {
  caseId: number | null;
  specimenName: string;
  specimenId: number | null;
  points: number | null;
  specFrozen: boolean;
  isValid: boolean; // whether row should be included
}
```

### Step 2: Implement Registry

```typescript
// src/app/admin/schedule-uploads/_actions/parsers/rowExtractorRegistry.ts

import { RowExtractor } from './types';
import epicRowExtractor from './epicRowExtractor';

class RowExtractorRegistry {
  private extractors: RowExtractor[] = [];

  register(extractor: RowExtractor) {
    this.extractors.push(extractor);
  }

  extract(row: Record<string, string>): ExtractedRow {
    // Try each extractor in order
    for (const extractor of this.extractors) {
      if (extractor.canHandle(row)) {
        return extractor.extract(row);
      }
    }
    // Default: no extractor matched
    return { isValid: false };
  }
}

// Singleton instance
export const rowExtractorRegistry = new RowExtractorRegistry();

// Register built-in extractors
rowExtractorRegistry.register(epicRowExtractor);
// Future: rowExtractorRegistry.register(calendarRowExtractor);
```

### Step 3: Implement Epic Extractor

```typescript
// src/app/admin/schedule-uploads/_actions/parsers/epicRowExtractor.ts

import { RowExtractor, ExtractedRow } from './types';
import {
  getRowValue,
  parseInteger,
  parseBoolean,
} from '../helpers/fieldParsers';

const epicRowExtractor: RowExtractor = {
  name: 'epic',

  canHandle: (row: Record<string, string>) => {
    // Check if row has Epic-specific headers
    return Boolean(getRowValue(row, ['CASE_ID', 'CASE ID', 'CASEID']));
  },

  extract: (row: Record<string, string>): ExtractedRow => {
    const caseId = parseInteger(
      getRowValue(row, ['CASE_ID', 'CASE ID', 'CASEID']),
    );

    if (caseId === null) {
      return { isValid: false };
    }

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

    return {
      caseId,
      specimenName,
      specimenId,
      points,
      specFrozen,
      isValid: true,
    };
  },
};

export default epicRowExtractor;
```

### Step 4: Refactor Core Logic

```typescript
// src/app/admin/schedule-uploads/_actions/computeAssignments.ts

import { rowExtractorRegistry } from './parsers/rowExtractorRegistry';

export async function computeEpicAssignments(
  rows: Record<string, string>[],
): Promise<AssignmentComputation> {
  const [specialtyRows, mappingRows] = await Promise.all([
    // ... existing DB queries
  ]);

  // ... existing setup code ...

  for (const row of rows) {
    // Use registry instead of inline extraction
    const extracted = rowExtractorRegistry.extract(row);

    if (!extracted.isValid) {
      skippedRows += 1;
      continue;
    }

    // Rest of logic uses extracted.caseId, extracted.specimenName, etc.
    const matchingSpecialty = findMatchingSpecialty(
      extracted.caseId,
      specialtiesWithRanges,
    );

    // ... rest unchanged ...
  }

  // ... return logic unchanged ...
}
```

---

## Benefits of Registry Pattern

✅ **Modular**: Each data source has its own extractor  
✅ **Testable**: Extractors can be tested independently  
✅ **Extensible**: Add new extractors without modifying core logic  
✅ **Flexible**: Can support feature flags (enable/disable extractors)  
✅ **Clear Separation**: Extraction concerns separate from matching logic

---

## Alternative: Matching Strategy Registry

If matching logic becomes complex (multiple strategies, scoring, fallbacks):

```typescript
// src/app/admin/schedule-uploads/_actions/matchers/matchingStrategyRegistry.ts

export interface MatchingStrategy {
  name: string;
  weight: number; // priority order
  findMatch: (caseId: number, specialties: Specialty[]) => Specialty | null;
}

class MatchingStrategyRegistry {
  private strategies: MatchingStrategy[] = [];

  register(strategy: MatchingStrategy) {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.weight - a.weight); // high weight = try first
  }

  findMatch(caseId: number, specialties: Specialty[]): Specialty | null {
    for (const strategy of this.strategies) {
      const match = strategy.findMatch(caseId, specialties);
      if (match) return match;
    }
    return null;
  }
}
```

---

## Implementation Roadmap

**Phase 1 (Current):** Understand existing flow ✅  
**Phase 2 (Next):** Extract helper functions into separate files  
**Phase 3:** Create row extractor registry (Option 1)  
**Phase 4:** Add Calendar row extractor  
**Phase 5:** Add matching strategy registry (if needed)  
**Phase 6:** Add configuration/feature flags for enabling/disabling strategies

---

## File Organization After Registry Implementation

```
src/app/admin/schedule-uploads/
├── _actions/
│   ├── parseEpicData.ts              (entry point - remains largely unchanged)
│   ├── computeAssignments.ts         (refactored core logic)
│   ├── helpers/
│   │   ├── fieldParsers.ts          (getRowValue, parseInteger, etc.)
│   │   └── rangeMatchers.ts         (parseCodeRange, findMatchingSpecialty, etc.)
│   ├── parsers/
│   │   ├── types.ts                 (RowExtractor interface)
│   │   ├── rowExtractorRegistry.ts  (registry implementation)
│   │   ├── epicRowExtractor.ts      (Epic extractor)
│   │   └── calendarRowExtractor.ts  (Calendar extractor - future)
│   └── matchers/
│       ├── types.ts                 (MatchingStrategy interface)
│       └── matchingStrategyRegistry.ts (registry - future)
└── _components/
    ├── ScheduleUploadsClient.tsx
    ├── EpicSpreadsheetUpload.tsx
    └── CalendarSpreadsheetUpload.tsx
```
