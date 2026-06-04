# Phase 4 - Step 4-A-2: 인덱스 버그 수정 + 슬래시 메뉴 + 자동완성 기초

> 작성일: 2026-06-04
> 선행: Step 4-A-1 GO. Tiptap → rhwp/core → HWP → 한컴 정상 렌더링 검증됨.
> 작업 범위: 브릿지 안정화 + 추천형 에디터의 첫 두 기능
> 작업 성격: 단계별. 각 단계 독립 검증 후 다음.

## 작업 전 필독

1. PROJECT.md (Phase 4 비전 섹션)
2. mydocs/research/20260603-editor-poc.md (PoC 결과, 막힌 부분 3개)
3. 4-A-1 산출물: EditorBridgeTestPage.tsx, RhwpCoreTestPage.tsx
4. lib/hwp/ 모듈 (읽기 파서 — 셀 구조 참고용)

## 전체 목표

추천형 에디터의 기반을 다진다. 세 단계, 순서대로.

```
1. 브릿지 인덱스 버그 수정 (안정화)
2. 슬래시 메뉴 — 담당 아이 목록 삽입 (우리 DB 연결, 가장 시각적인 차별점)
3. 자동완성 기초 (과거 문장 추천)
```

각 단계마다 검증하고 넘어갈 것. 한 번에 다 하지 말 것.

---

## 1단계 — 브릿지 인덱스 추적 버그 수정

### 문제 (4-A-1에서 발견)

표를 createTable로 삽입하면 표가 문단 인덱스를 차지함. 이후 paragraph의 paraIdx를 단순 카운터로 증가시켜서 실제 문단 수와 어긋남. 결과: "문단 인덱스 N 범위 초과" 에러.

미리보기 렌더 트리에서만 났지만, 표 개수·위치가 복잡해지면 실제 export에도 영향 가능.

### 해결

표 삽입 등 문단 수를 바꾸는 작업 후, 카운터를 신뢰하지 말고 실제 문단 수를 다시 읽어 재동기화.

```typescript
// rhwp/core에 문단 수 조회 메서드가 있는지 .d.ts 확인
// getParagraphCount(sec) 또는 유사 메서드

// 변환 루프에서:
let currentPara = 0;
for (const node of doc.content) {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      hwpDoc.insertText(0, currentPara, 0, getText(node));
      hwpDoc.splitParagraph(0, currentPara, ...);
      currentPara++;
      break;
    case 'table':
      hwpDoc.createTable(0, currentPara, 0, rowCount, colCount);
      // 셀 채우기 (insertTextInCell)
      ...
      // 표 삽입 후 실제 문단 수로 재동기화
      currentPara = JSON.parse(hwpDoc.getParagraphCount(0)).count; 
      // 또는 createTable 반환값의 paraIdx + 1 사용
      break;
  }
}
```

createTable 반환값이 `{"ok":true,"paraIdx":N,"controlIdx":0}` 형태이므로, 이 paraIdx를 활용해 다음 문단 위치를 정확히 계산하는 방법도 가능. 어느 방식이 정확한지 런타임에서 확인.

### 검증

/_editor-bridge-test에서:
1. 텍스트 + 표 + 텍스트 + 표 (표 2개 이상) 입력
2. [HWP로 변환]
3. 변환 로그에 에러 0건
4. 미리보기 정상
5. 다운로드 → 한컴오피스에서 순서·내용 정확

표 2개 이상에서도 인덱스 안 어긋나면 통과.

---

## 2단계 — 슬래시 메뉴: 담당 아이 목록 삽입

### 목표

에디터에서 `/` 입력 → 메뉴 팝업 → "담당 아이 목록" 선택 → 우리 DB의 현재 반 아이들이 표로 자동 삽입.

이게 추천형 에디터의 가장 시각적인 차별점. "타이핑 대신 클릭 몇 번".

### 슬래시 메뉴 구현

Tiptap의 Suggestion 확장 활용:
```
npm install @tiptap/suggestion @tiptap/extension-mention
```
또는 커스텀 구현. `/` 입력 감지 → 위치 계산 → 팝업 렌더.

메뉴 항목 (이번엔 1개만 제대로):
```
/ 입력 시 표시:
  📋 담당 아이 목록     ← 이번 구현
  (이후: 표 만들기, 체크리스트, 이전 활동 등)
```

### 담당 아이 목록 삽입 로직

```typescript
// 1. 현재 반의 아이 목록 가져오기
//    어느 반? → 에디터가 특정 classroom 컨텍스트에서 열렸다고 가정
//    PoC 단계에서는 classroomId를 하드코딩하거나 드롭다운으로 선택
const children = await childApi.getByClassroom(classroomId); 
// 또는 enrollmentApi로 해당 반 아이들 조회

// 2. Tiptap 표 노드로 삽입
editor.chain().focus().insertTable({ 
  rows: children.length + 1, 
  cols: 2  // 이름 / 비고 (또는 이름만)
}).run();

// 3. 헤더 + 각 아이 이름 채우기
//    insertTable 후 커서가 첫 셀에 위치
//    각 셀에 텍스트 입력하며 다음 셀로 이동
```

PoC 단계 단순화:
- classroomId는 페이지 상단 드롭다운으로 선택 (실제 반 목록 API)
- 아이 목록은 GET /api/enrollments/classrooms/{classroomId} 또는 children API
- 표는 "이름" 1열 또는 "이름 / 영역 / 교구" 등 활동계획안 몬테소리 표와 유사하게

### 어디서 작업?

새 페이지 /_editor-slash-test 또는 기존 /_editor-bridge-test 확장.
아직 실제 서비스 페이지(활동계획안 등)에 넣지 말 것. PoC 단계.

### 검증

1. 페이지에서 반 선택
2. 에디터에 `/` 입력
3. 메뉴 팝업 표시
4. "담당 아이 목록" 클릭
5. 그 반의 아이들이 표로 삽입됨
6. [HWP로 변환] → 한컴에서 표 정상

---

## 3단계 — 자동완성 기초

### 목표

IDE 자동완성처럼, 입력 중 과거에 쓴 문장을 추천. 이번엔 **기초만**.

### 데이터 소스 (PoC 단계)

가장 간단한 소스부터: 기존 ActivityPlan의 sections.content.

```
백엔드: 사용자의 과거 활동계획안 섹션 텍스트를 검색하는 API
  GET /api/activity-plans/suggestions?q={prefix}
  → 입력 prefix로 시작하는 과거 문장들 반환 (상위 N개)
```

이번엔 LLM 없이 DB 텍스트 매칭만. AI 통합은 후속.

### 백엔드 작업

```java
// ActivityPlanController
@GetMapping("/suggestions")
public ResponseEntity<ApiResponse<List<String>>> getSuggestions(
    @AuthenticationPrincipal CustomUserDetails user,
    @RequestParam("q") String prefix
) {
    List<String> suggestions = activityPlanService.findContentSuggestions(user.getId(), prefix);
    return ResponseEntity.ok(ApiResponse.success(suggestions));
}

// ActivityPlanService
public List<String> findContentSuggestions(Long userId, String prefix) {
    if (prefix == null || prefix.trim().length() < 2) return List.of();
    // 사용자의 모든 ActivitySection.content 중 prefix 포함하는 것
    // 또는 문장 단위로 쪼개서 prefix로 시작하는 문장
    return activitySectionRepository.findContentByUserIdAndPrefix(userId, prefix.trim());
}
```

쿼리는 단순 LIKE부터:
```java
@Query("""
    select distinct s.content from ActivitySection s
    where s.activityPlan.user.id = :userId
      and s.content like concat('%', :prefix, '%')
    order by length(s.content)
""")
List<String> findContentByUserIdAndPrefix(@Param("userId") Long userId, @Param("prefix") String prefix);
```

문장 단위 분리(마침표 기준)는 후속 개선. 이번엔 content 통째 매칭으로 동작 증명.

### 프론트 작업

에디터에서 입력 중 디바운스(300ms) 후 suggestions API 호출 → 드롭다운 표시 → 선택 시 삽입 또는 Tab 수락.

PoC 단계 단순화:
- 별도 입력창 + 추천 리스트로 시작해도 OK (에디터 인라인 자동완성은 복잡)
- 또는 슬래시 메뉴처럼 트리거 (예: 특정 키)
- 핵심은 "내가 과거에 쓴 문장이 검색되어 나온다"를 증명

### 검증

1. 과거 활동계획안이 DB에 있는 상태 (CASE_5_8 업로드해둠)
2. 에디터/입력창에 "등원" 입력
3. 과거 등원 섹션 내용이 추천으로 표시
4. 선택 시 에디터에 삽입

---

## 단계별 진행 원칙

- 1단계 검증 통과 후 2단계. 2단계 통과 후 3단계.
- 각 단계가 독립적으로 동작 검증되어야 함.
- 한 단계에서 막히면 거기서 멈추고 보고. 다음 단계로 무리하게 넘어가지 말 것.
- 시간 오래 걸리는 단계(특히 슬래시 메뉴 팝업 UI)는 막히면 단순화 버전으로.

## 주의사항

- 전부 격리 PoC 페이지에서. 실제 서비스 페이지 건드리지 말 것.
- rhwp/core 메서드 이름은 .d.ts에서 직접 확인 (PoC 보고서 참고).
- WASM doc destroy 누락 주의.
- 백엔드 변경(3단계)은 ddl 영향 없음 (조회만).
- 슬래시 메뉴/자동완성 UI가 복잡하면 PoC 수준으로 단순화. 완성도보다 "동작 증명"이 목표.

## 작업 후 보고

1. 변경/추가 파일 목록
2. 빌드 통과 (프론트 + 백엔드)
3. 각 단계 검증 결과 (1, 2, 3)
4. 막힌 단계 (있다면 어디서)
5. 다음 제안

## 커밋 메시지 가이드 (단계별로 끊어서 커밋 권장)

```
1단계:
fix: 브릿지 문단 인덱스 추적 버그 (표 삽입 후 재동기화) - Phase 4 Step 4-A-2

2단계:
feat: 슬래시 메뉴 - 담당 아이 목록 삽입 PoC - Phase 4 Step 4-A-2

3단계:
feat: 자동완성 기초 - 과거 활동계획안 문장 추천 - Phase 4 Step 4-A-2
```

---

작업 시작 전 의문점 있으면 먼저 질문해줘. 특히 2단계의 "에디터가 어느 반 컨텍스트인지" 결정이 모호하면 물어봐.
