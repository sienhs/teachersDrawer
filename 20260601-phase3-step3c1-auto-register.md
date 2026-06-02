# Phase 3 - Step 3-C-1: HWP 자동 등록 (백엔드 + 업로드 팝업)

> 작성일: 2026-06-01
> 선행: Step 3-B 완료. 활동계획안 풀스택 4페이지 동작 중.
> 작업 범위: 백엔드 자동 등록 로직 + 분석/확정 API 분리 + 프론트 업로드 팝업
> 후속: Step 3-C-2 (아이 관리 페이지 + PENDING 정리 UI + 대시보드 배지)

## 작업 전 필독

1. 프로젝트 루트의 `PROJECT.md`를 먼저 읽고 전체 맥락 파악
2. 기존 `ActivityPlanService.upload()` 메서드 코드 확인 (이번에 분리될 메서드)
3. 기존 자동 매칭 로직 확인 (`childRepository.findFirstByUserIdAndName`)
4. 컨벤션 유지: 멀티유저 격리(`findOwned{X}` 헬퍼), `ApiResponse<T>` 응답, `@AuthenticationPrincipal CustomUserDetails`

## 목표

선생님이 HWP 파일을 업로드하면, 안에 있는 정보(반·담임·아이들)로 **빈 데이터를 자동으로 채워준다**. 첫 사용자가 등록 작업 없이 즉시 가치를 받도록.

핵심 흐름:
```
1. 파일 업로드 → 백엔드가 파싱 + 매칭 시도
2. "분석 결과" 반환 (실제 DB 저장 X, 미리보기만)
3. 프론트에 팝업: "@@반에 아이 N명을 추가할까요?" + 만 N세 이름 목록
4. 사용자가 [수락] → 백엔드가 실제 저장 (반, 아이, Enrollment, ActivityPlan)
5. 사용자가 [거부] → 아무것도 저장 안 됨, 업로드 화면으로 복귀
```

## 핵심 설계 결정 (요약)

| 항목 | 결정 |
|------|------|
| 업로드 흐름 | 2단계 (분석 → 팝업 → 확정 시 저장) |
| 반 자동 생성 | 있으면 사용, 없으면 새로 만듦 (status는 무조건 ACTIVE) |
| 아이 자동 생성 | PENDING 상태로 생성 |
| Enrollment 자동 배정 | 진행 (반 ↔ 아이 자동 연결) |
| 동명이인 | UI에서 후보 있을 때만 '동일인?' 선택지 |
| 옛날 반 | year < 현재 연도여도 ACTIVE로 (자동 ARCHIVE 안 함) |

## 산출물

### 1. 백엔드 - Child status에 PENDING 추가

`Child` 엔티티의 status 필드에 PENDING 추가:
```
ENROLLED   현재 재원 (기존)
PENDING    HWP에서 자동 생성, 사용자 확정 대기 (신규)
GRADUATED  졸업 (기존)
WITHDRAWN  퇴소 (기존)
```

`ChildRepository`에 추가:
```java
List<Child> findByUserIdAndStatus(Long userId, String status);
```

기존 목록 조회(`findByUserId`)는 그대로 두되, `ChildService.getMyChildren()`에서
**PENDING은 일반 목록에서 제외** (대신 별도 메서드로 노출).

```java
public List<ChildResponse> getMyChildren(Long userId) {
    return childRepository.findByUserIdAndStatus(userId, "ENROLLED")
            .stream().map(ChildResponse::from).toList();
    // PENDING은 별도 메서드로 (Step 3-C-2)
}

public List<ChildResponse> getMyPendingChildren(Long userId) {
    return childRepository.findByUserIdAndStatus(userId, "PENDING")
            .stream().map(ChildResponse::from).toList();
}
```

### 2. 백엔드 - 분석/확정 API 분리

기존 `POST /api/activity-plans` 단일 엔드포인트를 두 개로 분리.

#### 새 엔드포인트 1: 분석만 (저장 X)

```
POST /api/activity-plans/analyze
  multipart/form-data:
    file: HWP 파일
    classroomId: Long (optional)
  
  Response: ActivityPlanAnalysisResponse
```

이 엔드포인트는:
1. 파일을 MinIO에 임시 업로드 (임시 키 발급)
2. hwp-parser 호출하여 파싱
3. 매칭 시도 (classroom, child 자동 매칭)
4. **DB에 저장하지 않음**. 임시 결과를 그대로 반환.

응답 DTO:
```java
class ActivityPlanAnalysisResponse {
    String fileKey;          // MinIO 임시 객체 키 (확정 시 그대로 사용)
    String fileName;
    
    // 추출된 메타
    LocalDate planDate;
    String subject;
    String teacherName;
    String classNameRaw;
    String classTimeRaw;
    Integer classDayCount;
    
    // 반 매칭 결과
    ClassroomMatch classroom;
    
    // 아이 매칭 결과
    List<ChildMatch> children;
    
    // 시간대별 활동 (참고용)
    List<ParsedSection> sections;
    
    // 몬테소리 (참고용)
    List<ParsedMontessoriRecord> montessoriRecords;
    
    // rawJson 그대로
    String rawJson;
}

class ClassroomMatch {
    String nameFromHwp;       // "열성반"
    Integer yearFromHwp;      // 2026
    Long existingId;          // 매칭된 기존 반 id (없으면 null)
    String existingName;
    String existingStatus;
    boolean willCreate;       // 새로 만들어야 하나
}

class ChildMatch {
    String nameFromHwp;       // "김신"
    
    // 정확 매칭 (이미 ENROLLED 아이가 같은 이름)
    Long exactMatchId;
    
    // 동명이인 후보 (이름은 같지만 PENDING이거나 GRADUATED 등)
    List<DuplicateCandidate> duplicateCandidates;
    
    // 새로 만들어야 하나 (정확 매칭 없을 때 true)
    boolean willCreate;
}

class DuplicateCandidate {
    Long id;
    String name;
    String status;            // PENDING/GRADUATED/WITHDRAWN
    LocalDate birthDate;      // null 가능
    String memo;              // 식별 보조
    String lastClassroomName; // 마지막에 속했던 반 (있으면)
}
```

#### 새 엔드포인트 2: 확정 (실제 저장)

```
POST /api/activity-plans/confirm
  application/json:
    {
      "fileKey": "...",
      "fileName": "...",
      "planDate": "2026-05-08",
      ... (analyze 응답의 메타 그대로)
      
      "classroomAction": {
        "useExisting": true | false,
        "existingId": 1 | null,
        "newName": "열성반" | null,
        "newYear": 2026 | null
      },
      
      "childActions": [
        {
          "nameFromHwp": "김신",
          "action": "USE_EXISTING" | "CREATE_NEW" | "MERGE_WITH",
          "existingChildId": 1 | null,
          "mergeTargetId": 2 | null    // MERGE_WITH일 때
        },
        ...
      ]
    }
  
  Response: ActivityPlanResponse (기존과 동일)
```

이 엔드포인트는:
1. fileKey로 MinIO에서 파일 확인 (임시 → 정식 이동 OR 그냥 사용)
2. classroomAction 처리:
   - useExisting=true → 기존 Classroom 사용
   - useExisting=false → 새 Classroom 생성 (status=ACTIVE)
3. childActions 처리:
   - USE_EXISTING → 기존 Child 그대로 사용
   - CREATE_NEW → PENDING 상태로 새 Child 생성
   - MERGE_WITH → 기존 Child 사용 (병합 의미: 이 사용자가 동명이인 중 이걸 선택)
4. ActivityPlan 저장
5. ActivitySection, MontessoriRecord 저장
6. Enrollment 자동 생성: 모든 매칭된/생성된 Child를 Classroom에 연결
   (이미 있으면 스킵, 중복 방지)
7. ActivityPlanResponse 반환

#### 기존 `POST /api/activity-plans` 처리

호환을 위해 일단 유지하되, 내부적으로 analyze + 자동 confirm을 묶어서 처리.
즉 "수동 확정 없이 그냥 다 자동 처리" 옵션. (테스트 도구나 API 직접 호출용)
프론트는 새 엔드포인트 두 개만 사용.

### 3. 백엔드 - 자동 매칭/생성 로직 상세

#### Classroom 매칭

```java
private ClassroomMatch matchClassroom(Long userId, String nameFromHwp, LocalDate planDate) {
    Integer yearFromHwp = planDate.getYear();
    
    // 1. 같은 이름 + 같은 연도 Classroom 검색
    Optional<Classroom> exact = classroomRepository
        .findByUserIdAndYearAndName(userId, yearFromHwp, nameFromHwp);
    
    if (exact.isPresent()) {
        return ClassroomMatch.useExisting(exact.get());
    }
    
    // 2. 없으면 새로 만들어야 함 (확정 시점에)
    return ClassroomMatch.willCreate(nameFromHwp, yearFromHwp);
}
```

`ClassroomRepository`에 추가:
```java
Optional<Classroom> findByUserIdAndYearAndName(Long userId, Integer year, String name);
```

#### Child 매칭

```java
private List<ChildMatch> matchChildren(Long userId, List<String> namesFromHwp) {
    List<ChildMatch> results = new ArrayList<>();
    
    for (String name : namesFromHwp) {
        String normalized = name.trim();   // 양옆 공백 제거 중요
        
        // 1. ENROLLED 상태에서 정확 매칭
        Optional<Child> exact = childRepository
            .findFirstByUserIdAndStatusAndName(userId, "ENROLLED", normalized);
        
        if (exact.isPresent()) {
            results.add(ChildMatch.useExisting(exact.get()));
            continue;
        }
        
        // 2. 다른 상태(PENDING/GRADUATED/WITHDRAWN)에서 후보 검색
        List<Child> candidates = childRepository
            .findByUserIdAndName(userId, normalized);
        // ENROLLED 제외 (이미 위에서 처리)
        candidates.removeIf(c -> "ENROLLED".equals(c.getStatus()));
        
        if (!candidates.isEmpty()) {
            results.add(ChildMatch.withDuplicates(normalized, candidates));
        } else {
            results.add(ChildMatch.willCreate(normalized));
        }
    }
    
    return results;
}
```

`ChildRepository`에 추가:
```java
Optional<Child> findFirstByUserIdAndStatusAndName(Long userId, String status, String name);
List<Child> findByUserIdAndName(Long userId, String name);
```

### 4. 백엔드 - MinIO 임시 파일 처리

분석 단계에서는 파일을 일단 MinIO에 업로드해두지만, 확정되지 않으면 정리해야 함.

옵션:
```
A. 분석 시 prefix 'temp/' 로 업로드 → 확정 시 'activity-plans/' 로 이동(또는 그냥 메타만 옮김)
   미확정 temp는 별도 cleanup job (Phase 4+)

B. 분석 시 메모리에 byte[]만 보관, 확정 시점에 진짜 업로드
   문제: 확정 요청의 body가 너무 큼 (base64 인코딩 시 더 큼)

C. 분석 시 정식 prefix로 업로드, 거부 시 즉시 삭제
   가장 단순
```

C로 갈 것. 거부(혹은 30분간 미확정) 시 삭제. 일단 거부 시 즉시 삭제만 구현.
프론트가 사용자 거부 시 `DELETE /api/activity-plans/temp?fileKey=...` 호출.

새 엔드포인트:
```
DELETE /api/activity-plans/temp?fileKey=...
  → MinIO에서 해당 객체 삭제 (소유권 검증: 객체 키 prefix가 그 사용자 것인지)
```

객체 키 규칙: `activity-plans/{userId}/{UUID}-{originalName}` 으로 변경 (사용자 격리).
기존 키와의 호환을 위해 마이그레이션은 안 함 (개발 중이라 데이터 없을 가능성).

### 5. 백엔드 - ErrorCode 추가

```java
PENDING_FILE_NOT_FOUND(NOT_FOUND, "임시 파일을 찾을 수 없습니다. 다시 업로드해 주세요."),
INVALID_CONFIRM_ACTION(BAD_REQUEST, "확정 요청의 액션 정보가 올바르지 않습니다."),
```

## 6. 프론트엔드 - 업로드 페이지 흐름 변경

### 기존 흐름
```
파일 선택 + 반 선택 → [업로드하기] → 분석 진행 오버레이 → 상세 페이지 이동
```

### 새 흐름
```
파일 선택 + 반 선택 → [업로드하기] 
  → 오버레이 (HWP 분석 중...)
  → 분석 완료 시 확인 팝업 (Modal)
  → 사용자가 [수락] 누르면
    → 확정 API 호출
    → 상세 페이지 이동
  → 사용자가 [거부] 누르면
    → 임시 파일 삭제 API 호출
    → 업로드 페이지로 복귀
```

### 확인 모달 디자인

```
┌───────────────────────────────────────────────────────┐
│ 활동계획안 분석 결과                              [X]  │
├───────────────────────────────────────────────────────┤
│ 2026년 5월 8일 (금) · 경청                            │
│ 열성반 (2026) · 이혜지                                │
├───────────────────────────────────────────────────────┤
│                                                       │
│ ▷ 반                                                  │
│   "열성반 (2026)" 새로 생성됩니다                     │
│                                                       │
│ ▷ 아이 (17명)                                         │
│   ✓ 김신       (기존 등록)                            │
│   ✓ 김예서     (기존 등록)                            │
│   ✓ 김희준     (기존 등록)                            │
│   + 강건후     (새로 추가)                            │
│   + 김리원     (새로 추가)                            │
│   + 김반우     (새로 추가)                            │
│   + ...                                               │
│                                                       │
│   ⚠ 김신 (이름 중복):                                │
│     ◯ 기존 PENDING 김신 (등록 2026-05-08)            │
│     ◯ GRADUATED 김신 (만 7세, 햇님반 2025)           │
│     ◯ 새로운 아이로 등록                              │
│                                                       │
│ ▷ 활동                                                │
│   시간대별 11개, 몬테소리 17명 추출                   │
│                                                       │
├───────────────────────────────────────────────────────┤
│              [거부]              [수락하고 저장]      │
└───────────────────────────────────────────────────────┘
```

핵심 UI 요소:
- ✓ 기존 매칭 (회색 또는 옅은 색): 그대로 사용
- `+` 새로 추가 (주황): PENDING으로 생성됨을 표시
- ⚠ 중복 후보 (노란/주황 배경 강조): 라디오 버튼으로 선택

### 7. 프론트엔드 - API 클라이언트 수정

`api/activityPlan.ts`:
```ts
export const activityPlanApi = {
  // ... 기존 메서드들

  analyze: (file: File, classroomId?: number) => {
    const form = new FormData();
    form.append('file', file);
    if (classroomId) form.append('classroomId', String(classroomId));
    return api.post<ApiResponse<ActivityPlanAnalysis>>(
      '/api/activity-plans/analyze',
      form
    ).then(r => r.data.data);
  },

  confirm: (request: ActivityPlanConfirmRequest) =>
    api.post<ApiResponse<ActivityPlanDetail>>(
      '/api/activity-plans/confirm',
      request
    ).then(r => r.data.data),

  cancelTemp: (fileKey: string) =>
    api.delete<ApiResponse<void>>(
      `/api/activity-plans/temp?fileKey=${encodeURIComponent(fileKey)}`
    ).then(r => r.data.data),
};
```

`types/activityPlan.ts`에 새 타입 추가:
```ts
export interface ActivityPlanAnalysis {
  fileKey: string;
  fileName: string;
  planDate: string;
  subject?: string;
  teacherName?: string;
  classNameRaw?: string;
  classTimeRaw?: string;
  classDayCount?: number;
  classroom: ClassroomMatch;
  children: ChildMatch[];
  sections: ParsedSection[];
  montessoriRecords: ParsedMontessoriRecord[];
  rawJson: string;
}

export interface ClassroomMatch {
  nameFromHwp: string;
  yearFromHwp: number;
  existingId?: number | null;
  existingName?: string | null;
  existingStatus?: string | null;
  willCreate: boolean;
}

export interface ChildMatch {
  nameFromHwp: string;
  exactMatchId?: number | null;
  duplicateCandidates: DuplicateCandidate[];
  willCreate: boolean;
}

export interface DuplicateCandidate {
  id: number;
  name: string;
  status: string;
  birthDate?: string | null;
  memo?: string | null;
  lastClassroomName?: string | null;
}

// 확정 요청용
export interface ActivityPlanConfirmRequest {
  fileKey: string;
  fileName: string;
  planDate: string;
  subject?: string;
  teacherName?: string;
  classNameRaw?: string;
  classTimeRaw?: string;
  classDayCount?: number;
  rawJson: string;
  
  classroomAction: {
    useExisting: boolean;
    existingId?: number | null;
    newName?: string | null;
    newYear?: number | null;
  };
  
  childActions: Array<{
    nameFromHwp: string;
    action: 'USE_EXISTING' | 'CREATE_NEW' | 'MERGE_WITH';
    existingChildId?: number | null;
    mergeTargetId?: number | null;
  }>;
}
```

### 8. 프론트엔드 - 확인 모달 컴포넌트

`components/activityPlan/AnalysisConfirmModal.tsx` 신규.

```tsx
interface Props {
  analysis: ActivityPlanAnalysis;
  onConfirm: (request: ActivityPlanConfirmRequest) => Promise<void>;
  onCancel: () => void;
}
```

내부 상태:
- 각 ChildMatch의 사용자 선택 (action, existingChildId, mergeTargetId)
- 동명이인 후보가 있는 경우 라디오 그룹

확정 버튼 클릭 시 사용자 선택을 합쳐서 `ActivityPlanConfirmRequest` 생성 후 `onConfirm` 호출.

거부 버튼 클릭 시 `onCancel` 호출. 부모에서 `cancelTemp(fileKey)` 호출.

### 9. 프론트엔드 - 업로드 페이지 (`ActivityPlanUploadPage.tsx`) 수정

기존 흐름의 [업로드하기] 핸들러를:
```
1. setLoading(true)
2. const analysis = await activityPlanApi.analyze(file, classroomId)
3. setLoading(false)
4. setAnalysisResult(analysis)  // 모달 열림
```

모달의 onConfirm 핸들러:
```
1. setSubmitting(true)
2. const detail = await activityPlanApi.confirm(buildRequest(analysis, userChoices))
3. setSubmitting(false)
4. navigate(`/activity-plans/${detail.id}`)
```

모달의 onCancel 핸들러:
```
1. await activityPlanApi.cancelTemp(analysis.fileKey)
2. setAnalysisResult(null)
```

## 10. 검증 시나리오

```
0. 사전: backend + hwp-parser + minio + postgres 실행
   DB 초기 상태 (또는 ddl-auto: create 후): 비어있음

1. 로그인
2. 사이드바 "활동계획안" → 빈 목록
3. [업로드하기] → /activity-plans/new
4. CASE_5_8.hwp 선택, 반 선택 안 함
5. [업로드하기] 클릭 → 오버레이 → 모달 열림

[모달 검증]
6. 메타 확인: 2026-05-08, 경청, 열성반, 이혜지
7. "반 - 열성반 (2026) 새로 생성됩니다" 표시
8. "아이 17명, 모두 새로 추가" 표시 (아직 등록된 아이 없으니까)
9. 중복 후보 없음

10. [수락하고 저장] → 상세 페이지 이동
11. 상세 페이지에서 모든 17명이 PENDING이지만 정상 표시
    (PENDING도 화면엔 보임. 일반 목록에서만 제외)

12. DB 확인:
    - children 테이블: 17개 PENDING
    - classrooms 테이블: 1개 (열성반, 2026, ACTIVE)
    - enrollments 테이블: 17개
    - activity_plans 테이블: 1개

13. CASE_5_26.hwp 업로드 → 모달:
14. 17명 모두 "기존 등록" (✓ 매칭) - 단 김신·김예서·김희준은 이전 Step 3-B 검증으로 ENROLLED일 수 있음
    19명 - 17명 = 2명이 새로 추가
15. [수락하고 저장] → 상세 페이지
16. DB에서 children 19개 (PENDING + ENROLLED 혼재)

[동명이인 시나리오 - 별도]
17. Thunder Client로 김신을 GRADUATED로 변경
    PUT /api/children/{김신id} { "status": "GRADUATED", ... }
18. 다시 CASE_5_8.hwp 업로드
19. 모달의 김신 부분: 중복 후보 표시 ("GRADUATED 김신")
    라디오 버튼: ◯ 기존 GRADUATED 사용  ◯ 새 아이로 등록
20. 선택 후 [수락하고 저장] → 정상 동작

[거부 시나리오]
21. CASE_5_8.hwp 다시 업로드 → 모달 → [거부]
22. MinIO Console에서 그 파일이 사라졌는지 확인
23. 업로드 페이지로 복귀
```

## 11. 작업 후 보고

1. 변경/추가된 파일 목록
2. 위 검증 시나리오의 결과 (각 단계 응답·스크린샷)
3. `npm run build` 통과 여부
4. Spring 빌드 + 재시작 후 정상 동작 여부
5. 막힌 부분 / 결정 보류

## 12. 주의사항

- `Child.status`에 PENDING 추가 시, 기존 `findByUserId` 조회 결과가 영향받지 않게 별도 메서드 사용
- 분석 단계에서 MinIO에 임시 파일 업로드하므로, 거부 시 cleanup 필수
- 객체 키에 사용자 id 포함: 보안 강화
- 확정 API의 childActions 배열은 분석 응답의 children 순서와 일치해야 함 (또는 nameFromHwp로 매칭)
- 동명이인 후보 표시 시 정렬: 가장 가능성 높은 후보 먼저 (예: lastClassroomName이 분석 결과의 classNameRaw와 일치하면 우선)
- 모든 새 엔드포인트는 인증 필수 (기본 SecurityConfig 따라)
- 모달의 라디오 선택 변경 시 즉시 상태 업데이트, [수락] 활성화 조건은 모든 ChildMatch에 선택이 있을 때 (또는 기본값 자동 적용)

## 13. 작업 후 커밋 메시지 가이드

```
feat: HWP 자동 등록 + 업로드 확인 팝업 (Phase 3 Step 3-C-1)

- Child.status에 PENDING 추가 (자동 생성 아이 표시)
- POST /api/activity-plans/analyze (분석 전용, DB 저장 X)
- POST /api/activity-plans/confirm (사용자 확정 후 저장)
- DELETE /api/activity-plans/temp (거부 시 정리)
- 자동 등록: 반(없으면 생성), 아이(PENDING), Enrollment(연결)
- 동명이인 감지: 후보 있을 때 라디오 선택 제공
- 프론트 업로드 페이지: 분석 → 모달 → 확정/거부 2단계

다음: 아이 관리 페이지 + PENDING 정리 UI + 대시보드 배지 (Step 3-C-2)
```

작업 시작 전 의문점이 있으면 먼저 질문해줘.
