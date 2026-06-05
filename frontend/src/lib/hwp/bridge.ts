// Tiptap JSON → rhwp/core → HWP 변환 브릿지
// 서식 변환 확정 형식 (props_json 검증 완료):
//   applyCharFormat: {bold, italic, underline, strikethrough, textColor:"#RRGGBB", fontSize(HWPUNIT), fontId}
//   applyParaFormat: {alignment:"left"|"center"|"right"|"justify", lineSpacing(퍼센트)}
//   createTableEx: {sectionIdx, paraIdx, charOffset, rowCount, colCount, colWidths?:[u32,...]}
//   setCellProperties: {paddingLeft?, paddingRight?, paddingTop?, paddingBottom?, height?, verticalAlign?}
//
// 표 레이아웃 단위 (rhwp/core layout HWPUNIT = 1/7200 inch):
//   1pt = 100 layout-HWPUNIT, 1px(96DPI) = 75 layout-HWPUNIT
//   ※ 한컴 검증 후 비율 맞지 않으면 아래 두 상수 조정
//   verticalAlign: 0=위, 1=가운데, 2=아래 (숫자 형식 시도)

const PX_TO_HWP_LAYOUT = 75;   // Tiptap colwidth px → layout HWPUNIT
const PT_TO_HWP_LAYOUT = 100;  // 셀 padding·height pt → layout HWPUNIT

const VA_MAP: Record<string, number> = { top: 0, center: 1, bottom: 2 };

import init, { HwpDocument } from '@rhwp/core';
import type { JSONContent } from '@tiptap/react';

function ensureMeasureCallback(): void {
  if (typeof (globalThis as Record<string, unknown>)['measureTextWidth'] === 'function') return;
  let ctx: CanvasRenderingContext2D | null = null;
  let lastFont = '';
  (globalThis as Record<string, unknown>)['measureTextWidth'] = (font: string, text: string): number => {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return text.length * 10;
    if (font !== lastFont) { ctx.font = font; lastFont = font; }
    return ctx.measureText(text).width;
  };
}

// ── Tiptap mark 목록 → HWP charFormat props ──────────────────────────────────

type Mark = NonNullable<JSONContent['marks']>[number];

function buildCharProps(marks: Mark[], doc: HwpDocument): Record<string, unknown> | null {
  if (marks.length === 0) return null;
  const props: Record<string, unknown> = {};

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':        props.bold = true; break;
      case 'italic':      props.italic = true; break;
      case 'underline':   props.underline = true; break;
      case 'strike':      props.strikethrough = true; break;
      case 'textStyle': {
        const a = (mark.attrs ?? {}) as Record<string, unknown>;
        // 글자색: "#RRGGBB" 형식 필수
        if (typeof a.color === 'string' && a.color.startsWith('#')) {
          props.textColor = a.color;
        }
        // 폰트 크기: pt 단위 → HWPUNIT (1pt = 200 HWPUNIT)
        if (a.fontSize != null) {
          const pt = parseFloat(String(a.fontSize));
          if (!isNaN(pt) && pt > 0) props.fontSize = Math.round(pt * 200);
        }
        // 폰트 패밀리: 이름 → fontId 변환 필수
        if (typeof a.fontFamily === 'string' && a.fontFamily) {
          try {
            const fontId = doc.findOrCreateFontId(a.fontFamily);
            if (fontId >= 0) props.fontId = fontId;
          } catch { /* ignore */ }
        }
        break;
      }
      // highlight(형광펜): HWP 변환 불가 — 무시 (화면 전용)
    }
  }

  return Object.keys(props).length > 0 ? props : null;
}

// ── Tiptap textAlign attr → HWP alignment 문자열 ─────────────────────────────

function getAlignStr(textAlign: unknown): string | null {
  if (textAlign === 'left')    return 'left';
  if (textAlign === 'center')  return 'center';
  if (textAlign === 'right')   return 'right';
  if (textAlign === 'justify') return 'justify';
  return null;
}

// ── Tiptap 노드 트리 → [{text, marks}] 평탄화 ────────────────────────────────

interface Segment {
  text: string;
  marks: Mark[];
}

function extractSegments(node: JSONContent): Segment[] {
  if (node.type === 'text') {
    return [{ text: node.text ?? '', marks: node.marks ?? [] }];
  }
  return (node.content ?? []).flatMap(extractSegments);
}

// ── 본문 문단 쓰기 ───────────────────────────────────────────────────────────

function writeParaContent(doc: HwpDocument, sec: number, para: number, node: JSONContent): void {
  // 정렬 적용
  const align = getAlignStr(node.attrs?.textAlign);
  if (align) {
    try { doc.applyParaFormat(sec, para, JSON.stringify({ alignment: align })); } catch { /* ignore */ }
  }

  // 텍스트 세그먼트별 삽입 + 서식 적용
  let offset = 0;
  for (const seg of extractSegments(node)) {
    if (!seg.text) continue;
    try {
      doc.insertText(sec, para, offset, seg.text);
      const props = buildCharProps(seg.marks, doc);
      if (props) {
        doc.applyCharFormat(sec, para, offset, offset + seg.text.length, JSON.stringify(props));
      }
      offset += seg.text.length;
    } catch { /* 개별 세그먼트 오류 무시 */ }
  }
}

// ── 셀 속성 적용 (padding / height / verticalAlign → HWP 보존) ───────────────

function applyCellProps(
  doc: HwpDocument,
  sec: number,
  tableParaIdx: number,
  ctrlIdx: number,
  cellIdx: number,
  attrs: Record<string, unknown>,
): void {
  const props: Record<string, unknown> = {};

  const ptToHwp = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return isNaN(n) || n <= 0 ? null : Math.round(n * PT_TO_HWP_LAYOUT);
  };

  const pL = ptToHwp(attrs.cellPaddingLeft);
  const pR = ptToHwp(attrs.cellPaddingRight);
  const pT = ptToHwp(attrs.cellPaddingTop);
  const pB = ptToHwp(attrs.cellPaddingBottom);
  if (pL != null) props.paddingLeft = pL;
  if (pR != null) props.paddingRight = pR;
  if (pT != null) props.paddingTop = pT;
  if (pB != null) props.paddingBottom = pB;

  const h = ptToHwp(attrs.cellHeight);
  if (h != null) props.height = h;

  // verticalAlign: 숫자 형식(0=위/1=가운데/2=아래) 시도
  // 한컴 검증 후 작동 안 하면 string("top"/"center"/"bottom") 으로 교체
  const va = attrs.cellVerticalAlign;
  if (typeof va === 'string' && va in VA_MAP) {
    props.verticalAlign = VA_MAP[va];
  }

  if (Object.keys(props).length > 0) {
    try {
      doc.setCellProperties(sec, tableParaIdx, ctrlIdx, cellIdx, JSON.stringify(props));
    } catch { /* ignore — 형식 불일치 시 에러 무시 */ }
  }
}

// ── 표 셀 쓰기 (다중 문단 지원) ──────────────────────────────────────────────

function writeCellContent(
  doc: HwpDocument,
  sec: number,
  tableParaIdx: number,
  ctrlIdx: number,
  cellIdx: number,
  cellNode: JSONContent,
): void {
  let paraOffset = 0;

  for (const child of cellNode.content ?? []) {
    if (child.type !== 'paragraph') continue;

    // 두 번째 이상 문단: 이전 문단 끝에서 split → 새 cellPara 생성
    if (paraOffset > 0) {
      try {
        const prevLen = doc.getCellParagraphLength(sec, tableParaIdx, ctrlIdx, cellIdx, paraOffset - 1);
        doc.splitParagraphInCell(sec, tableParaIdx, ctrlIdx, cellIdx, paraOffset - 1, prevLen);
      } catch { break; } // split 실패 시 이후 문단 포기
    }

    // 정렬
    const align = getAlignStr(child.attrs?.textAlign);
    if (align) {
      try { doc.applyParaFormatInCell(sec, tableParaIdx, ctrlIdx, cellIdx, paraOffset, JSON.stringify({ alignment: align })); } catch { /* ignore */ }
    }

    // 텍스트 + 서식
    let offset = 0;
    for (const seg of extractSegments(child)) {
      if (!seg.text) continue;
      try {
        doc.insertTextInCell(sec, tableParaIdx, ctrlIdx, cellIdx, paraOffset, offset, seg.text);
        const props = buildCharProps(seg.marks, doc);
        if (props) {
          doc.applyCharFormatInCell(
            sec, tableParaIdx, ctrlIdx, cellIdx, paraOffset,
            offset, offset + seg.text.length,
            JSON.stringify(props),
          );
        }
        offset += seg.text.length;
      } catch { /* ignore */ }
    }

    paraOffset++;
  }

  // 셀 레이아웃 속성 (padding / height / verticalAlign) 적용
  applyCellProps(doc, sec, tableParaIdx, ctrlIdx, cellIdx, (cellNode.attrs ?? {}) as Record<string, unknown>);
}

// ── 메인: Tiptap JSON → HwpDocument 기록 ─────────────────────────────────────

export function writeJsonToDoc(json: JSONContent, doc: HwpDocument): void {
  doc.createBlankDocument();
  let currentPara = 0;

  const nodes = json.type === 'doc' ? (json.content ?? []) : [];
  for (const node of nodes) {
    try {
      if (node.type === 'paragraph' || node.type === 'heading') {
        writeParaContent(doc, 0, currentPara, node);
        const len = doc.getParagraphLength(0, currentPara);
        doc.splitParagraph(0, currentPara, len);
        currentPara++;

      } else if (node.type === 'table') {
        const rows = node.content ?? [];
        const rowCount = rows.length;
        const firstRow = rows[0]?.content ?? [];
        const colCount = firstRow.length;
        if (colCount === 0) continue;

        // Tiptap colwidth(px) → layout HWPUNIT — 첫 번째 행에서 추출
        const colWidthsPx = firstRow.map(cell => {
          const cw = (cell.attrs?.colwidth as number[] | null | undefined)?.[0];
          return typeof cw === 'number' && cw > 0 ? cw : 0;
        });
        const allHaveWidth = colWidthsPx.every(w => w > 0);

        let tableParaIdx: number;
        let tableCtrlIdx: number;

        if (allHaveWidth) {
          const colWidthsHwp = colWidthsPx.map(px => Math.max(100, Math.round(px * PX_TO_HWP_LAYOUT)));
          const opts = JSON.stringify({
            sectionIdx: 0, paraIdx: currentPara, charOffset: 0,
            rowCount, colCount, colWidths: colWidthsHwp,
          });
          try {
            const parsed = JSON.parse(doc.createTableEx(opts)) as { paraIdx?: number; controlIdx?: number };
            tableParaIdx = parsed.paraIdx ?? currentPara;
            tableCtrlIdx = parsed.controlIdx ?? 0;
          } catch {
            // createTableEx 실패 시 균등 분할 fallback
            const parsed = JSON.parse(doc.createTable(0, currentPara, 0, rowCount, colCount)) as { paraIdx?: number; controlIdx?: number };
            tableParaIdx = parsed.paraIdx ?? currentPara;
            tableCtrlIdx = parsed.controlIdx ?? 0;
          }
        } else {
          // colwidth 미지정 시 기존 createTable (균등 분할)
          const parsed = JSON.parse(doc.createTable(0, currentPara, 0, rowCount, colCount)) as { paraIdx?: number; controlIdx?: number };
          tableParaIdx = parsed.paraIdx ?? currentPara;
          tableCtrlIdx = parsed.controlIdx ?? 0;
        }

        currentPara = tableParaIdx + 1;

        let cellIdx = 0;
        for (const row of rows) {
          for (const cell of row.content ?? []) {
            try { writeCellContent(doc, 0, tableParaIdx, tableCtrlIdx, cellIdx, cell); } catch { /* ignore */ }
            cellIdx++;
          }
        }

      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        for (const item of node.content ?? []) {
          const paraNode = (item.content ?? []).find(n => n.type === 'paragraph');
          if (paraNode) {
            try { doc.insertText(0, currentPara, 0, '• '); } catch { /* ignore */ }
            let offset = 2;
            for (const seg of extractSegments(paraNode)) {
              if (!seg.text) continue;
              try {
                doc.insertText(0, currentPara, offset, seg.text);
                const props = buildCharProps(seg.marks, doc);
                if (props) {
                  doc.applyCharFormat(0, currentPara, offset, offset + seg.text.length, JSON.stringify(props));
                }
                offset += seg.text.length;
              } catch { /* ignore */ }
            }
          }
          try {
            const len = doc.getParagraphLength(0, currentPara);
            doc.splitParagraph(0, currentPara, len);
          } catch { /* ignore */ }
          currentPara++;
        }
      }
    } catch { /* 노드 오류 무시, 다음 노드 진행 */ }
  }
}

// ── 전체 파이프라인: Tiptap JSON → HWP bytes ─────────────────────────────────

export async function convertEditorToHwp(json: JSONContent): Promise<Uint8Array> {
  ensureMeasureCallback();
  await init();
  const doc = HwpDocument.createEmpty();
  try {
    writeJsonToDoc(json, doc);
    return doc.exportHwp();
  } finally {
    doc.free();
  }
}
