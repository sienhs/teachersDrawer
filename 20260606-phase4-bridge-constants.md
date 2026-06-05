# Phase 4 — bridge.ts 검증 결과 반영
> 작성일: 2026-06-06
> 대상: `frontend/src/lib/hwp/bridge.ts`

작업 시작 전 의문점 있으면 먼저 질문해줘.

---

## 검증 결과 요약

| 항목 | 기존 값 | 실측 결과 | 조치 |
|------|---------|-----------|------|
| `PX_TO_HWP_LAYOUT` | 75 | 과도 (1.24배) → 보정값 **60** | 수정 |
| `PT_TO_HWP_LAYOUT` | 100 | 동일 비율 보정 → **80** | 수정 |
| `verticalAlign` | 숫자/문자열 시도 | 둘 다 미적용 확인 | 코드 제거 |
| 셀 다중 문단 | 미지원 | 정상 작동 확인 | 유지 |

---

## 작업 1 — 상수 수정

`bridge.ts` 상단 상수 2개 수정:

```ts
// 변경 전
const PX_TO_HWP_LAYOUT = 75;
const PT_TO_HWP_LAYOUT = 100;

// 변경 후
const PX_TO_HWP_LAYOUT = 60;   // 한컴 실측 보정 (2026-06-06)
const PT_TO_HWP_LAYOUT = 80;   // 한컴 실측 보정 (2026-06-06)
```

---

## 작업 2 — verticalAlign 제거

`VA_MAP` 상수와 `applyCellProps` 내 verticalAlign 관련 코드 제거.

```ts
// 제거: 파일 상단
const VA_MAP: Record<string, number> = { top: 0, center: 1, bottom: 2 };

// 제거: applyCellProps 내
const va = attrs.cellVerticalAlign;
if (typeof va === 'string' && va in VA_MAP) {
  props.verticalAlign = VA_MAP[va];
}
```

`applyCellProps` 함수 시그니처와 나머지 로직은 그대로 유지.

---

## 작업 3 — 파일 상단 주석 갱신

```ts
// 변경 전
// 표 레이아웃 단위 (rhwp/core layout HWPUNIT = 1/7200 inch):
//   1pt = 100 layout-HWPUNIT, 1px(96DPI) = 75 layout-HWPUNIT
//   ※ 한컴 검증 후 비율 맞지 않으면 아래 두 상수 조정
//   verticalAlign: 0=위, 1=가운데, 2=아래 (숫자 형식 시도)

// 변경 후
// 표 레이아웃 단위 (rhwp/core layout HWPUNIT):
//   PX_TO_HWP_LAYOUT=60: 1px → 60 HWPUNIT (한컴 실측 보정, 2026-06-06)
//   PT_TO_HWP_LAYOUT=80: 1pt → 80 HWPUNIT (한컴 실측 보정, 2026-06-06)
//   verticalAlign: setCellProperties 미지원 확정 → 제거됨
```

---

## 확인

수정 후 에디터에서 표 만들어 HWP 저장 → 한컴에서 열어 열 너비가 이전보다 좁아졌는지(보정 적용 확인) 육안 확인.

---

## 커밋 메시지 (희성이 직접)

```
fix(bridge): adjust layout unit constants and remove unsupported verticalAlign
```
