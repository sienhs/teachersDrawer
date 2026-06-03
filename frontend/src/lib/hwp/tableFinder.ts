import type { HwpDocument } from '@rhwp/core';

export interface CellData {
  ci: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  text: string;
}

export interface TableData {
  sec: number;
  para: number;
  ctrl: number;
  rowCount: number;
  colCount: number;
  cellCount: number;
  cells: CellData[];
  cellByPos: Map<string, CellData>; // key: "row,col"
}

export function loadTable(
  doc: HwpDocument,
  sec: number,
  para: number,
  ctrl: number,
): TableData {
  const dims: { rowCount: number; colCount: number; cellCount: number } = JSON.parse(
    doc.getTableDimensions(sec, para, ctrl),
  );

  const cells: CellData[] = [];
  const cellByPos = new Map<string, CellData>();

  for (let ci = 0; ci < dims.cellCount; ci++) {
    const info: { row: number; col: number; rowSpan: number; colSpan: number } = JSON.parse(
      doc.getCellInfo(sec, para, ctrl, ci),
    );
    const text = readCellText(doc, sec, para, ctrl, ci);
    const cd: CellData = {
      ci,
      row: info.row,
      col: info.col,
      rowSpan: info.rowSpan ?? 1,
      colSpan: info.colSpan ?? 1,
      text,
    };
    cells.push(cd);
    cellByPos.set(`${info.row},${info.col}`, cd);
  }

  return { sec, para, ctrl, ...dims, cells, cellByPos };
}

export function readCellText(
  doc: HwpDocument,
  sec: number,
  para: number,
  ctrl: number,
  ci: number,
): string {
  try {
    const paraCount = doc.getCellParagraphCount(sec, para, ctrl, ci);
    const parts: string[] = [];
    for (let cp = 0; cp < paraCount; cp++) {
      try {
        const len = doc.getCellParagraphLength(sec, para, ctrl, ci, cp);
        if (len > 0) {
          parts.push(doc.getTextInCell(sec, para, ctrl, ci, cp, 0, len));
        }
      } catch {
        /* 빈 문단 */
      }
    }
    return parts.join('\n');
  } catch {
    return '';
  }
}
