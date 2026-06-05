# Phase 4 — bridge.ts colwidth 0 열 보정
> 작성일: 2026-06-06
> 대상: `frontend/src/lib/hwp/bridge.ts`

작업 시작 전 의문점 있으면 먼저 질문해줘.

---

## 원인

```
colWidthsPx: (3) [118, 149, 0] allHaveWidth: false
```

Tiptap이 마지막 열에 colwidth를 안 붙이는 경우가 있음.
현재 코드는 `allHaveWidth`가 false면 무조건 균등 분할 fallback → 열 너비 전혀 반영 안 됨.

---

## 수정

`bridge.ts` 표 생성 부분에서 `allHaveWidth` 로직을 아래로 교체.

```ts
// 변경 전
const allHaveWidth = colWidthsPx.every(w => w > 0);

let tableParaIdx: number;
let tableCtrlIdx: number;

if (allHaveWidth) {
  const colWidthsHwp = colWidthsPx.map(px => Math.max(100, Math.round(px * PX_TO_HWP_LAYOUT)));
  const opts = JSON.stringify({ ... colWidths: colWidthsHwp });
  try {
    ...createTableEx...
  } catch {
    ...createTable fallback...
  }
} else {
  ...createTable (균등)...
}

// 변경 후
const hasAnyWidth = colWidthsPx.some(w => w > 0);

let tableParaIdx: number;
let tableCtrlIdx: number;

if (hasAnyWidth) {
  // 0인 열은 지정된 너비들의 평균으로 보정
  const specifiedWidths = colWidthsPx.filter(w => w > 0);
  const avgPx = Math.round(specifiedWidths.reduce((a, b) => a + b, 0) / specifiedWidths.length);
  const filledWidths = colWidthsPx.map(w => w > 0 ? w : avgPx);
  const colWidthsHwp = filledWidths.map(px => Math.max(100, Math.round(px * PX_TO_HWP_LAYOUT)));
  const opts = JSON.stringify({
    sectionIdx: 0, paraIdx: currentPara, charOffset: 0,
    rowCount, colCount, colWidths: colWidthsHwp,
  });
  try {
    const parsed = JSON.parse(doc.createTableEx(opts)) as { paraIdx?: number; controlIdx?: number };
    tableParaIdx = parsed.paraIdx ?? currentPara;
    tableCtrlIdx = parsed.controlIdx ?? 0;
  } catch {
    const parsed = JSON.parse(doc.createTable(0, currentPara, 0, rowCount, colCount)) as { paraIdx?: number; controlIdx?: number };
    tableParaIdx = parsed.paraIdx ?? currentPara;
    tableCtrlIdx = parsed.controlIdx ?? 0;
  }
} else {
  // colwidth 정보 전혀 없으면 균등 분할
  const parsed = JSON.parse(doc.createTable(0, currentPara, 0, rowCount, colCount)) as { paraIdx?: number; controlIdx?: number };
  tableParaIdx = parsed.paraIdx ?? currentPara;
  tableCtrlIdx = parsed.controlIdx ?? 0;
}
```

콘솔 로그(`console.log('[bridge] colWidthsPx:...')`)는 작업 후 제거.

---

## 확인

에디터에서 3열 표 만들고 HWP 저장 → 한컴에서 열어 열 너비 비율이 에디터와 비슷한지 육안 확인.

---

## 커밋 메시지 (희성이 직접)

```
fix(bridge): handle zero colwidth columns in table export
```
