# Phase 3 - Step 3-A: 프론트 레이아웃 + 캘린더 메인 대시보드

> 작성일: 2026-05-30
> 선행: Step 1 (hwp-parser), Step 2 (Spring 백엔드) 완료. 백엔드 API 모두 동작 중.
> 작업 범위: 프론트 라우팅·레이아웃·API 클라이언트 + 메인 대시보드(캘린더)
> 후속: Step 3-B (활동계획안 업로드·상세·rhwp 임베드·아이 상세)

## 작업 전 필독

1. 프로젝트 루트의 `PROJECT.md`를 먼저 읽고 전체 맥락 파악
2. 특히 "5. 현재 구현된 API 엔드포인트" 절을 잘 확인 — 이걸 호출하는 클라이언트를 만든다
3. 기존 프론트(`frontend/`)의 코드 컨벤션을 먼저 살펴보고 그 패턴을 따라갈 것
   - `frontend/src/api/instance.ts` (axios 설정·401 reissue)
   - `frontend/src/store/authStore.ts` (Zustand 패턴)
   - `frontend/src/pages/auth/` (페이지 컴포넌트 패턴)
   - 디자인 톤: 베이지(`#FFF8F0`) + 주황(`#FF9F66`) + 토스풍 슬라이드 UI

## 목표

선생님이 로그인하면 **캘린더가 메인**인 대시보드를 본다.
캘린더에 활동계획안이 점/제목으로 표시되고, 셀의 활동을 클릭하면
우측에서 슬라이드 패널이 열려 그 활동에 참여한 아이 목록을 보여준다.

이번 Step 3-A에서는 **레이아웃·라우팅·캘린더 대시보드까지만** 완성한다.
업로드·상세·rhwp 뷰어·아이 상세는 Step 3-B로 분리.

## 산출물 디렉토리 구조

```
frontend/src/
├── api/
│   ├── instance.ts            (기존 유지)
│   ├── auth.ts                (기존 유지)
│   ├── school.ts              (기존 유지)
│   ├── child.ts               신규
│   ├── classroom.ts           신규
│   ├── enrollment.ts          신규
│   └── activityPlan.ts        신규
├── components/
│   ├── ProtectedRoute.tsx     (기존 유지)
│   ├── layout/
│   │   ├── AppLayout.tsx      신규  — 전체 레이아웃 (헤더 + 사이드바 + 메인)
│   │   ├── Header.tsx         신규  — 로고·검색·사용자 메뉴
│   │   └── Sidebar.tsx        신규  — 메뉴·반 빠른 전환
│   ├── calendar/
│   │   ├── DashboardCalendar.tsx     신규  — FullCalendar 래퍼
│   │   └── ActivityDetailPanel.tsx   신규  — 우측 슬라이드 패널
│   └── ui/                                  (필요시 추가)
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Spinner.tsx
├── pages/
│   ├── auth/                  (기존 유지)
│   ├── dashboard/
│   │   └── DashboardPage.tsx  신규  — 메인 대시보드 화면
│   └── (Step 3-B에서 추가될 페이지 자리)
├── store/
│   ├── authStore.ts           (기존 유지)
│   └── ...
├── types/
│   ├── child.ts               신규
│   ├── classroom.ts           신규
│   ├── enrollment.ts          신규
│   └── activityPlan.ts        신규
└── App.tsx                    수정 (라우팅 추가)
```

## 1. 라이브러리 추가

`frontend/`에서:

```bash
npm install \
  @fullcalendar/react \
  @fullcalendar/core \
  @fullcalendar/daygrid \
  @fullcalendar/interaction \
  date-fns
```

- FullCalendar: 메인 캘린더
- date-fns: 날짜 포맷 (가벼움, 한국 로케일 지원)
- react-calendar (미니 캘린더용)는 Step 3-B로 미룸

## 2. 타입 정의 (`src/types/`)

백엔드 응답을 그대로 반영. 기존 `school.ts` 패턴 따라가기.

### `types/child.ts`
```ts
export interface Child {
  id: number;
  name: string;
  birthDate?: string | null;   // yyyy-MM-dd
  gender?: string | null;
  status: 'ENROLLED' | 'GRADUATED' | 'WITHDRAWN';
  memo?: string | null;
}

export interface ChildCreateRequest {
  name: string;
  birthDate?: string;
  gender?: string;
  memo?: string;
}

export interface ChildUpdateRequest extends ChildCreateRequest {
  status?: string;
}
```

### `types/classroom.ts`
```ts
export type ClassroomStatus = 'ACTIVE' | 'ARCHIVED';

export interface Classroom {
  id: number;
  year: number;
  name: string;
  status: ClassroomStatus;
}

export interface ClassroomCreateRequest {
  year: number;
  name: string;
}

export interface ClassroomUpdateRequest {
  name: string;
}
```

### `types/enrollment.ts`
```ts
export interface Enrollment {
  id: number;
  childId: number;
  childName: string;
  classroomId: number;
  classroomName: string;
  year: number;
}

export interface EnrollmentCreateRequest {
  childId: number;
  classroomId: number;
}
```

### `types/activityPlan.ts`
```ts
export type SectionCategory = 
  'MORNING' | 'SAFETY' | 'LUNCH' | 'OUTDOOR' | 'EVALUATION' | 'OTHER';

export interface ActivitySection {
  id: number;
  orderIndex: number;
  label: string;
  content: string;
  category: SectionCategory;
}

export interface MontessoriRecord {
  id: number;
  childNameRaw: string;
  childId?: number | null;
  area?: string;
  material?: string;
  confirmed?: string;
}

export interface ActivityPlanSummary {
  id: number;
  planDate: string;          // yyyy-MM-dd
  subject?: string;
  classroomId?: number | null;
  classroomName?: string | null;
  classNameRaw?: string;
  fileName: string;
  createdAt: string;
}

export interface ActivityPlanDetail extends ActivityPlanSummary {
  teacherName?: string;
  classTimeRaw?: string;
  classDayCount?: number;
  sections: ActivitySection[];
  montessoriRecords: MontessoriRecord[];
}

export interface MontessoriHistoryItem extends MontessoriRecord {
  planDate: string;
}
```

> 필드 정확한 이름은 백엔드 응답 보고 맞출 것. 위는 가이드.

## 3. API 클라이언트 (`src/api/`)

기존 `auth.ts`, `school.ts` 패턴 따라가기. `ApiResponse<T>` 언랩핑 등.

### `api/child.ts`
```ts
import api from './instance';
import type { Child, ChildCreateRequest, ChildUpdateRequest } from '../types/child';
import type { ApiResponse } from '../types/api';   // 기존 정의 활용

export const childApi = {
  create: (data: ChildCreateRequest) =>
    api.post<ApiResponse<Child>>('/api/children', data).then(r => r.data.data),
  
  list: () =>
    api.get<ApiResponse<Child[]>>('/api/children').then(r => r.data.data),
  
  get: (id: number) =>
    api.get<ApiResponse<Child>>(`/api/children/${id}`).then(r => r.data.data),
  
  update: (id: number, data: ChildUpdateRequest) =>
    api.put<ApiResponse<Child>>(`/api/children/${id}`, data).then(r => r.data.data),
  
  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/children/${id}`).then(r => r.data.data),
};
```

### `api/classroom.ts` (동일 패턴)
```
- create(data)
- list(status?: ClassroomStatus)         // 쿼리스트링 처리
- get(id)
- update(id, data)
- delete(id)
- archive(id)        // POST /{id}/archive
- activate(id)       // POST /{id}/activate
```

### `api/enrollment.ts`
```
- enroll(data: { childId, classroomId })
- listByChild(childId)
- listByClassroom(classroomId)
- unenroll(enrollmentId)
```

### `api/activityPlan.ts`
```
- list(params?: { classroomId?, from?, to? })
- get(id)
- upload(file: File, classroomId?: number)   // multipart/form-data
- delete(id)
- downloadUrl(id)                            // 단순 URL 반환 (다운로드 트리거용)
- listChildMontessori(childId)               // 아이별 몬테소리 누적
```

업로드는 multipart라서 `FormData` 직접 사용. axios `headers: { 'Content-Type': 'multipart/form-data' }` 명시.

## 4. 라우팅 (`App.tsx`)

기존 라우팅 구조 유지하고 새 경로 추가. ProtectedRoute로 감싸기.

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* 3-B에서 추가될 경로들 */}
    </Route>
  </Route>
</Routes>
```

## 5. AppLayout

전체 화면 레이아웃. 헤더(상단 고정) + 사이드바(좌측) + 메인(우측). React Router의 `<Outlet />`으로 자식 라우트 렌더.

```
┌─────────────────────────────────────────────┐
│  Header (로고, 검색, 사용자메뉴)              │
├──────┬──────────────────────────────────────┤
│      │                                       │
│ Side │  Main (Outlet)                        │
│ bar  │                                       │
│      │                                       │
│      │                                       │
└──────┴──────────────────────────────────────┘
```

### Header
- 좌측: 로고 (텍스트로 "선생님의 서랍")
- 중앙: 검색바 (이번 단계엔 UI만, 동작 없음 — 백로그)
- 우측: 사용자 이름 + 로그아웃 버튼

### Sidebar
- 메뉴 항목:
  - 대시보드 (캘린더)
  - 활동계획안 *(3-B에서 연결)*
  - 아이 관리 *(3-B 이후)*
  - 반 관리 *(3-B 이후)*
- 하단: 현재 활성 반 표시 (선택된 반 컨텍스트, 다음 단계에서 활용)

지금은 라우팅 자리만 만들고 페이지는 placeholder("준비 중입니다") OK. 대시보드만 진짜 동작.

### 디자인 톤
- 배경: `#FFF8F0` (베이지)
- 강조 색: `#FF9F66` (주황)
- 사이드바: 흰 배경 + 약한 그림자
- 폰트: 기존과 동일 (Pretendard 추정, 확인하고 맞출 것)
- 토스풍: 둥근 모서리(rounded-2xl), 부드러운 그림자, 호버 시 살짝 떠오름

## 6. DashboardPage (메인 대시보드) ★ 이 Step의 본체

### 구성
```
┌────────────────────────────────────────────────────┐
│  메인 영역                                          │
│  ┌─────────────────────────────┬────────────────┐│
│  │                              │                ││
│  │   FullCalendar (월 뷰)        │  사이드 패널    ││
│  │                              │  (셀 클릭 시   ││
│  │   - 셀에 활동 1~2개 표시      │   슬라이드 IN) ││
│  │   - 색상은 카테고리별 살짝     │                ││
│  │                              │                ││
│  └─────────────────────────────┴────────────────┘│
│  ┌────────────────────────────────────────────┐  │
│  │  필터 바                                    │  │
│  │  [전체 반 ▾] [전체 아이 ▾] [2026년 5월 ▾]    │  │
│  └────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 데이터 흐름
1. 마운트 시: `activityPlanApi.list({ from, to })` 호출하여 이번 달 활동 가져오기
   - from: 이번 달 1일, to: 이번 달 말일 (date-fns로 계산)
2. 동시에 classroom 목록·child 목록도 받아 필터에 사용
3. FullCalendar의 events에 활동계획안을 매핑
   - `title`: subject (없으면 fileName 첫 부분)
   - `date`: planDate
   - `extendedProps`: id, classroomName, etc.
4. 셀의 이벤트(활동) 클릭:
   - `eventClick` 핸들러로 그 활동의 id 캐치
   - `activityPlanApi.get(id)` 호출하여 상세 (sections + records) 가져옴
   - 우측 사이드 패널 열기

### FullCalendar 설정
```tsx
<FullCalendar
  plugins={[dayGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  locale="ko"
  height="auto"
  events={events}
  eventClick={handleEventClick}
  datesSet={handleDatesSet}      // 월 이동 시 다시 fetch
  eventColor="#FF9F66"
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: ''                    // 뷰 전환 버튼 숨김 (월뷰 고정)
  }}
  buttonText={{ today: '오늘' }}
/>
```

### 필터
- 반 드롭다운: 선택 시 events를 그 반의 활동만으로 필터링 (클라이언트 측 filter 또는 API 재호출)
- 아이 드롭다운: 선택 시 그 아이의 몬테소리 활동만 강조 표시 또는 그 아이가 포함된 활동만 표시
- 둘 다 "전체"가 기본값

### ActivityDetailPanel (우측 슬라이드 패널)
- 닫혀있을 땐 폭 0
- 활동 클릭 시 오른쪽에서 슬라이드로 등장 (폭 ~400px)
- 표시 내용:
  - 상단: 날짜, 주제, 반, 닫기 버튼
  - 시간대별 활동 목록 (label만, 펼치면 content)
  - 몬테소리 활동 목록 (아이 이름·교구)
  - "상세 보기" 버튼 → `/activity-plans/:id`로 이동 (이 페이지는 3-B에서)
- 트랜지션: Tailwind `transition-transform duration-300`

```
패널 구조 (간단):
┌──────────────────────┐
│ 2026년 5월 8일      X │
│ 경청 · 열성반         │
├──────────────────────┤
│ ▾ 시간대별 활동       │
│   • 등원              │
│   • 나침반 안전교육   │
│   • 점심              │
│   ...                 │
├──────────────────────┤
│ ▾ 몬테소리 (17명)     │
│   김신 — 은행놀이...  │
│   김예서 — 뱀놀이...  │
│   ...                 │
├──────────────────────┤
│  [상세 보기]          │
└──────────────────────┘
```

> Step 3-B의 상세 페이지가 아직 없으므로 "상세 보기" 버튼은 클릭 시 alert("Step 3-B에서 구현 예정") 또는 disabled로 둬도 OK.

### 빈 상태
- 활동계획안이 하나도 없으면 캘린더는 그대로 표시되고, 메인 영역 상단에 "아직 업로드된 활동계획안이 없습니다. [업로드하기]" 안내. 업로드 버튼은 3-B의 경로로 연결.

### 로딩·에러
- 데이터 로딩 중: 캘린더 영역에 스피너 또는 skeleton
- 에러: 토스트 또는 인라인 메시지 ("불러오기에 실패했습니다. 새로고침해 주세요.")

## 7. 코드 컨벤션

- 컴포넌트: 함수형 + TypeScript
- 상태: 페이지 단위는 `useState` + `useEffect`, 전역 상태가 필요하면 Zustand
- 스타일: Tailwind 우선, 복잡한 건 inline style
- 한국어 주석 OK, 코드는 영문
- 파일명: PascalCase 컴포넌트, camelCase 유틸

## 8. 검증 시나리오

```
1. backend 실행 + hwp-parser 실행 + 더미 데이터 준비
   - 반 2개: 2026 열성반, 2025 햇님반
   - 아이 3명: 김신, 김예서, 김희준
   - 활동계획안 2개 업로드 (CASE_5_8, CASE_5_26)

2. 프론트 실행 → 로그인

3. 자동으로 /dashboard 이동, 캘린더에 5월 8일·26일 표시 확인

4. 5월 8일 셀의 "경청" 클릭 → 우측 패널 슬라이드 IN
   패널에 sections 11개·montessori 17명 보이는지

5. 패널 닫기(X) → 슬라이드 OUT

6. 5월 26일 클릭 → 또 다른 데이터 표시

7. 필터 "열성반" 선택 → 두 활동 모두 유지 (열성반이니까)

8. 월 이동 (이전/다음) → 다른 달엔 활동 없음 확인

9. 브라우저 새로고침 → 로그인 유지되고 대시보드 그대로 (axios reissue 동작)
```

## 9. 작업 후 보고

1. 추가/변경된 파일 목록
2. `npm run dev`로 띄운 후 위 검증 시나리오의 스크린샷 또는 결과
3. FullCalendar 한국어 표시 (월요일·화요일 등) 확인
4. 우측 패널 슬라이드 동작 GIF 또는 설명
5. 막힌 부분 / 결정 보류 항목

## 10. 주의사항

- `frontend/src/api/instance.ts`의 axios 설정 그대로 활용 (JWT 자동 첨부, 401 reissue 등 검증된 흐름)
- App.tsx의 마운트 시 reissue 로직(`hasRestored` ref) 깨지지 않게 조심
- StrictMode 이중 실행에 따른 더블 fetch는 기존 패턴(가드) 따라가기
- FullCalendar는 `height="auto"`로 두면 컨테이너에 맞춰짐. 너무 작으면 `min-height` 지정
- 사이드 패널 슬라이드는 절대 위치(absolute)로 메인 영역 위에 떠도 되고, 그리드로 폭 조절해도 됨. 모바일은 이번 단계에서 신경 안 써도 OK (Phase 4에서 모바일 대응)
- 캘린더 셀에 활동 너무 많으면 (예: 같은 날 3개 이상) FullCalendar의 `dayMaxEvents` 옵션으로 "+더 보기" 처리
- 한글 폰트가 안 나오면 `index.css`에서 `font-family: 'Pretendard', system-ui` 확인
- 모든 API 호출은 try/catch로 감싸고 사용자에게 에러 표시
- 빈 상태/로딩/에러 세 가지를 항상 구분해서 처리

## 11. 작업 후 커밋 메시지 가이드

```
feat: 메인 대시보드 캘린더 + 레이아웃 구축 (Phase 3 Step 3-A)

- AppLayout (헤더 + 사이드바 + 메인)
- API 클라이언트 신설: child, classroom, enrollment, activityPlan
- 타입 정의: Child/Classroom/Enrollment/ActivityPlan 등
- 라우팅 추가: /dashboard 진입점 설정
- DashboardCalendar: FullCalendar 기반 월 뷰
  - 활동계획안을 날짜별로 표시
  - 셀의 활동 클릭 → 우측 슬라이드 패널 (sections, 몬테소리 명단)
- 반·아이 필터 UI
- 빈 상태/로딩/에러 처리

다음: 활동계획안 업로드·상세·rhwp 임베드·아이 상세 (Step 3-B)
```

작업 시작 전 의문점이 있으면 먼저 질문해줘.
