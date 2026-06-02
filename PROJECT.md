# 선생님의 서랍 (Teachers Drawer)

유치원·초중고 선생님을 위한 학급 관리 웹 서비스.
아이별 관찰일지, 체크리스트, **HWP 활동계획안 자동 분석**, 연도별 반 관리를 제공한다.

> **목표 (2026-05-29 확정)**
> 개인용 도구가 아닌 **배포–상용화–런칭** 전제의 멀티유저 서비스.
> 1차 타깃은 유치원 교사. 친구 한 명의 실사용을 시작점으로, 양식·노하우를 일반화해간다.

---

## 1. 제품 방향

- **1차 타깃: 유치원 교사 전용** 맞춤. 초중고는 구조만 열어두고 후순위.
- 핵심 가치: 선생님의 반복 업무(관찰 기록, 활동계획안 정리, 연도별 인수인계, **HWP 활동계획안 자동 분석**)를 덜어준다.
- **HWP 활동계획안 자동 데이터 추출 + 추천형 에디터**가 이 서비스의 결정적 차별점.

### 비전 — 추천형 에디터 (Phase 3+ ~ Phase 4)

단순한 HWP 뷰어가 아니라 **선생님을 위한 코딩 IDE 같은 한글 에디터**.

```
IDE 자동완성   ↔   "등원" 입력 시 과거 등원 문장 추천
IDE 스니펫     ↔   "어버이날 활동" 클릭하면 작년 어버이날 행 삽입
IDE 인텔리센스 ↔   현재 반/아이 정보로 맞춤 추천
IDE 린트       ↔   "이 아이는 이번 주 평가가 비어있어요" 알림
```

이전의 자료를 불러와서 자동완성처럼 쓰는 것. 타자치는 것보다 마우스 클릭 몇 번이 더 빠르게.
시장에 없는 영역이며, 이 서비스의 진짜 차별점.

---

## 2. 백로그

### 기능
- 통합 검색 (아이/일지/활동계획안 across)
- 처음 반 생성 시 데이터 일괄 불러오기
- 업로드 파일 분석해 과거 일자 기록 추출
- 기존 반의 템플릿 불러오기 (반 복사)
- 자주 쓰는 관찰 문구 모음
- 과거 반 읽기 전용 아카이브
- 파일 이동 및 모아보기
- 관찰일지 외부 앱(키즈노트 등) 연동 — source/externalId 필드 준비됨
- 선생님 간 데이터 인계 (현직장 인증 기반)
- 활동계획안 "평가"·"확인" 칸 디지털 입력 기능 (HWP에선 비어있음)
- 추천형 에디터 (코딩 IDE 자동완성처럼 과거 자료 기반 추천)

### UX
- 자동 매칭된 아이의 자동 재매칭 (아이 신규 등록 시 기존 ActivityPlan의 MontessoriRecord 다시 연결)
- 우상단 검색바 활성화 (현재 placeholder)
- 모바일 최적화

### 운영
- 에러 메시지 정보 노출 최소화 (FORBIDDEN 403 → NOT_FOUND 404 통일 검토)
- MinIO orphan 파일 정리 (DB 직접 삭제 시 객체 남음, cleanup job)
- ddl-auto: create → update 전환 (안정화 시점)
- 운영 환경: HTTPS, Refresh Token Secure 플래그, 환경변수 분리, 시크릿 재발급
- PENDING 아이 일괄 삭제 또는 일괄 확정 API
  - DELETE /api/children/pending
  - POST /api/children/pending/confirm-all

### 리팩토링
- 공통 OwnershipValidator 추출 (Child/Classroom/Enrollment/ActivityPlan 검증 헬퍼 4곳 중복)
- Enroll 시 연도 정합성 정책 (아이/반 연도 불일치 경고 여부)
- N+1 / 성능 정리 시점에 CustomUserDetails.getId() 활용해 user 재조회 제거
- 코드 스플리팅 (FullCalendar 번들 553kB)

---

## 3. 기술 스택

### Backend
- Java 21, Spring Boot 4.0.6, Gradle 9.4.1
- Spring Security 6 + JWT (jjwt 0.12.6)
- JPA (Hibernate) + QueryDSL 5.1.0:jakarta
- PostgreSQL 16
- MinIO (파일 스토리지) + MinIO Java SDK 8.5.13
- Spring RestClient (외부 서비스 호출)
- 외부 API: 나이스 OpenAPI, 유치원알리미 OpenAPI

### Frontend
- React + Vite + TypeScript
- Tailwind CSS v4
- Zustand, Axios, React Router DOM
- FullCalendar (월 뷰), react-calendar (미니 캘린더)
- react-dropzone (파일 업로드)
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍
- 작성 도구: Claude Code (VSCode)

### HWP 처리 (Phase 3)
- **hwp-parser 컨테이너** ✅: Python 3.12 + FastAPI + pyhwp + BeautifulSoup
  - Docker Compose 사이드카, 포트 8001
  - POST /parse 엔드포인트: HWP/HWPX → 정규화 JSON
  - 꿈열매유치원 양식 파싱 검증 완료 (CASE_5_8, CASE_5_26)
- **rhwp** ⏳ Phase 3 Step 3-D: 웹 임베드 HWP 에디터 (`@rhwp/editor` npm)
  - Rust + WebAssembly, MIT 라이센스
  - https://github.com/edwardkim/rhwp (v0.7.3)
  - Step 3-D 진입 전에 안정성 검증 스파이크 필요

### Infra
- Docker Compose: PostgreSQL + MinIO + hwp-parser
- 환경 분리:
  - **STS 직접 실행** (개발) → `application.yml`: `http://localhost:8001`, `http://localhost:9000`
  - **Docker 배포** → `application-docker.yml`: `http://hwp-parser:8001`, `http://minio:9000`
- 배포 목표: AWS

### 인증 설계
- Access Token: 메모리(Zustand), 15분
- Refresh Token: HttpOnly Cookie + DB, 7일
- **CustomUserDetails**: User 엔티티 래핑, 컨트롤러에서 `@AuthenticationPrincipal`로 id 즉시 접근

---

## 4. 데이터 모델

### 엔티티 관계

```
User (선생님)
  ├─ Child (아이) ─────────── 독립 엔티티
  │      status: ENROLLED | PENDING | GRADUATED | WITHDRAWN
  ├─ Classroom (반) ────────── 연도별 (ACTIVE / ARCHIVED)
  ├─ Enrollment (반배정) ───── Child ↔ Classroom (N:M)
  ├─ Observation (관찰일지) ── Child 직접 연결  [후순위]
  └─ ActivityPlan (활동계획안) ─ HWP 파일 1개 = 1 ActivityPlan  ✅
        ├─ ActivitySection ── 시간대별 활동 (등원/점심/바깥놀이…)
        └─ MontessoriRecord ─ 아이별 교구 활동 기록
```

### 핵심 설계 원칙

**아이는 반에 종속되지 않고 독립 존재.** 진급·순환보직으로 같은 아이를 여러 해 맡는 경우 누적 성장 기록을 이어볼 수 있도록.

**관찰일지는 Child에 직접 연결.** 반이 바뀌어도 아이 기준으로 기록 연속. classroomId는 참고용. source/externalId 필드로 외부앱 연동 대비.

**활동계획안은 완전 정규화 + JSON 안전망.** 검색·통계가 핵심 기능이므로 정규화 필수. `rawJson` 컬럼에 파싱 원본 보존하여 알고리즘 개선 시 재파싱 없이 DB만 보고 재처리 가능.

**자동 등록 + PENDING 상태.** HWP 업로드 시 안에 있는 아이를 자동으로 PENDING으로 등록, 사용자가 나중에 확정/병합/삭제. 반/Enrollment도 자동 생성.

**자동 매칭은 정확 매칭 우선.** ENROLLED/PENDING 정확 매칭이면 자동 사용, GRADUATED/WITHDRAWN은 동명이인 후보로 사용자에게 묻기.

### 엔티티 필드 (현재 구현 상태)

```
Child  ✅
  id, user(FK), name, birthDate, gender, status, memo,
  createdAt, updatedAt
  status: ENROLLED | PENDING | GRADUATED | WITHDRAWN

Classroom  ✅
  id, user(FK), year, name, status, createdAt, updatedAt
  - archive() / activate() / isArchived()

Enrollment  ✅
  id, child(FK), classroom(FK), year(캐시), createdAt

ActivityPlan  ✅
  id, user(FK), classroom(FK, nullable),
  planDate, subject, teacherName,
  classNameRaw, classTimeRaw, classDayCount,
  fileKey(MinIO 객체 키, activity-plans/{userId}/{UUID}-{name}), fileName,
  rawJson(TEXT, 파싱 원본),
  createdAt, updatedAt

ActivitySection  ✅
  id, activityPlan(FK), orderIndex,
  label, content(TEXT),
  category(enum: MORNING/SAFETY/LUNCH/OUTDOOR/EVALUATION/OTHER)

MontessoriRecord  ✅
  id, activityPlan(FK),
  childNameRaw, child(FK, nullable, 자동 매칭),
  area, material, confirmed

Observation  ⏳ 후순위
  id, childId, classroomId(참고), date, content,
  source (SELF | EXTERNAL), externalId(nullable),
  createdAt, updatedAt
```

### 멀티유저 격리 패턴

```java
// 소유권 검증 (모든 도메인 Service 공통)
private Child findOwnedChild(Long userId, Long childId) { ... }
private Classroom findOwnedClassroom(Long userId, Long classroomId) { ... }
private ActivityPlan findOwnedPlan(Long userId, Long planId) { ... }

// 아카이브 상태 검증 (Classroom 전용)
private void validateNotArchived(Classroom c) {
    if (c.isArchived()) throw new BusinessException(ARCHIVED_CLASSROOM);
}
```

---

## 5. 개발 Phase 로드맵

| Phase | 기간 | 내용 | 상태 |
|-------|------|------|------|
| **1** | 2026.05.26~05.28 | Docker / 인증 / 학교 검색 / React 인증 흐름 | ✅ |
| **2** | 2026.05.29~ | Child·Classroom·Enrollment ✅ / 관찰일지(후순위) ⏳ | ✅ |
| **3** | 2026.05.30~ | HWP 자동 분석 풀스택 + 자동 등록 + rhwp 임베드 | 🔄 |
| **4** | — | 추천형 에디터 / 반 복사·템플릿 / 통합 검색 / 모바일 | ⏳ |
| **5** | — | AWS 배포 / 운영(HTTPS·CI) / 선생님 간 인계 | ⏳ |

### Phase 2 진행
- ✅ CustomUserDetails 도입
- ✅ Child CRUD (멀티유저 격리, PENDING 상태 추가됨)
- ✅ Classroom CRUD (아카이브/복구, ARCHIVED 보호)
- ✅ Enrollment CRUD (중복·아카이브 검증)
- ⏳ Observation 작성·조회 (후순위로 미룸)

### Phase 3 진행

**Step 1 — hwp-parser 컨테이너 ✅** (2026-05-30)
- Python 3.12 + FastAPI + pyhwp + BeautifulSoup
- 꿈열매유치원 양식 파싱 알고리즘
- pytest 9/9 통과 + Docker 컨테이너 end-to-end 검증
- 두 샘플 모두 HTTP 200, 정확한 추출

**Step 2 — Spring ActivityPlan 도메인 + 업로드 API ✅** (2026-05-30)
- ActivityPlan / ActivitySection / MontessoriRecord 3개 엔티티
- HwpParserClient (Spring RestClient)
- FileStorageService (MinIO Java SDK 8.5.13)
- 업로드 API: MinIO 저장 + hwp-parser 호출 + DB 정규화 저장
- 11단계 end-to-end 검증 통과
- 핵심 가치 검증: **김신의 5/8·5/26 몬테소리 활동 누적 추적 동작** ★

**Step 3-A — 메인 대시보드 캘린더 ✅** (2026-05-31~06-01)
- AppLayout (헤더 + 사이드바 + 메인) + 라우팅
- API 클라이언트 4종 (child, classroom, enrollment, activityPlan)
- DashboardCalendar (FullCalendar 월 뷰)
- ActivityDetailPanel (우측 슬라이드 패널 — sections + 몬테소리)
- 반·아이 필터 (아이 선택 시 몬테소리 있는 날만 표시)
- 시연 가능한 첫 화면 확보

**Step 3-B — 활동계획안 풀스택 4페이지 ✅** (2026-06-01)
- 업로드 페이지: react-dropzone, 반 선택, 진행 오버레이
- 목록 페이지: 카드형 그리드, 반·기간 필터
- 상세 페이지: 시간대별 활동(카테고리 색·펼침) + 몬테소리 표
- 아이 상세 페이지: 미니 캘린더 + 영역별 교구 활동
- 사이드바 메뉴 연결, 대시보드 [상세 보기] 버튼 활성화
- 시각 검증 완료: **김신 미니 캘린더에 5/8 + 5/26 두 점 누적 표시** ★

**Step 3-C-1 — HWP 자동 등록 + 업로드 팝업 🔄** (2026-06-01)
- Child.status에 PENDING 추가
- POST /api/activity-plans/analyze (분석만, DB 저장 X)
- POST /api/activity-plans/confirm (사용자 확정 후 저장)
- DELETE /api/activity-plans/temp (거부 시 정리)
- 자동 등록: 반(없으면 생성), 아이(PENDING), Enrollment(연결)
- 동명이인 감지: 후보 있을 때 라디오 선택
- 프론트 AnalysisConfirmModal: 분석 → 모달 → 확정/거부
- MinIO 객체 키 사용자별 격리: `activity-plans/{userId}/...`
- 첫 검증 후 발견된 이슈:
  - PENDING 정확 매칭이 동명이인 후보로 잡힘 → ENROLLED + PENDING 둘 다 USE_EXISTING 처리로 수정 필요
  - 모달 정보 밀도 조정 필요 (자동 매칭은 요약, 결정 필요한 것만 카드)

**Step 3-C-2 — 아이 관리 페이지 + PENDING 정리 UI ⏳ 다음**
- 사이드바 "아이 관리" 활성화
- 전체 / PENDING 탭
- 확정 / 병합 / 삭제 UI
- 대시보드 상단 "확인 필요한 아이 N명" 배지

**Step 3-D — rhwp 안정성 검증 스파이크 ⏳**
- 격리된 테스트 페이지에서 우리 양식 렌더링 검증
- 편집 후 export 동일성 검증
- 결과 따라 통합/부분/fork·개조 결정

**Step 3-E — rhwp 통합 (검증 결과 따라) ⏳**

### Phase 3 설계 결정 (요약)
1. 포맷: .hwp + .hwpx 둘 다 지원 (현재 .hwp만 구현, .hwpx는 TODO)
2. 추출 유연성: Phase 3-A 한 양식 → Phase 3+ LLM 하이브리드
3. 아키텍처: Docker Compose 사이드카 (내부망 통신)
4. DB: 완전 정규화 + rawJson 안전망
5. 편집: rhwp 임베드까지 도전 (Step 3-D 검증 후 결정)
6. 업로드 흐름: 2단계 (분석 → 팝업 → 확정 시 저장)
7. 자동 등록: 반·아이·Enrollment 모두 자동, 아이는 PENDING으로
8. rhwp 안정성: 원본 보존 + 편집 export 동일성 둘 다 필수, 어려우면 fork·개조

### Phase 3에서 알게 된 것
- HWP 양식은 글자 사이 공백이 흔함 ("일  시", "학 급 명") → 정규화 후 매칭 필수
- pyhwp의 `_rows()`는 중첩 테이블 행까지 포함 → 직접 자식만 순회 필요
- HWP 결제란 rowspan 병합 셀로 인한 인덱스 오프셋 보정
- 한글 날짜 형식: "2026년 5월 8일 월요일" 정규식 매칭
- **Spring Boot 4.0에서 ClientHttpRequestFactories 제거됨** → SimpleClientHttpRequestFactory 직접 사용
- **MultipartFile은 한 번만 읽힘** → byte[]로 미리 보관해 MinIO·hwp-parser에 재사용
- 활동계획안의 "평가" 칸·몬테소리 "확인" 칸은 보통 비어있음 → 현장에서 디지털 입력 기능 가치 큼
- confirm 단계에서 재파싱 안 함 → sections/montessori를 프론트에서 그대로 전달해 hwp-parser 2중 호출 방지

---

## 6. 현재 구현된 API 엔드포인트

### 인증 (`/api/auth/**`) — 공개
- POST `/signup`, POST `/login`, POST `/reissue`, POST `/logout`

### 학교 (`/api/schools/**`) — 공개
- GET `/regions`, GET `/regions/{sidoCode}`
- GET `/search?name=` (초중고)
- GET `/kindergartens?sidoCode=&sggCode=&name=` (유치원)

### 아이 (`/api/children/**`) — 인증 필수
- POST `/`, GET `/`, GET `/{childId}`, PUT `/{childId}`, DELETE `/{childId}`
- GET `/`는 ENROLLED만 반환. PENDING은 별도 메서드.

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/`, DELETE `/{id}`
- GET `/children/{childId}`, GET `/classrooms/{classroomId}`

### 활동계획안 (`/api/activity-plans/**`) — 인증 필수
- POST `/` (multipart) — HWP 업로드 (레거시, 자동 처리)
- **POST `/analyze`** — 분석만 (DB 저장 X) ✨
- **POST `/confirm`** — 사용자 확정 후 저장 ✨
- **DELETE `/temp?fileKey=`** — 거부 시 임시 파일 정리 ✨
- GET `/` (?classroomId=, from=, to=) — 목록
- GET `/{planId}` — 상세
- DELETE `/{planId}` — 삭제 (MinIO 파일 동기 삭제)
- GET `/{planId}/file` — 원본 HWP 다운로드
- GET `/children/{childId}/montessori` — 아이별 몬테소리 누적 이력

---

## 7. 환경 & 운영

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `hwp-parser/`, `samples/hwp/`, `mydocs/orders/`, `mydocs/history/`, `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs`, `main`
- IDE: STS(백) + VSCode·Claude Code(프론트·파서·복잡 작업) + Thunder Client

### Docker 서비스
- `postgres` (PostgreSQL 16) — 5432
- `minio` (스토리지) — 9000(API), 9001(Console)
- `hwp-parser` (Python FastAPI) — 8001
- 모두 `drawer-network`. backend 추가 시 `docker` 프로파일 활성화.

### 알려진 환경 이슈 / 교훈
- STS 자체 컴파일러가 `-parameters` 무시 → `@RequestParam`/`@PathVariable`/`@Qualifier` 이름 명시 필수
- `ddl-auto: create`는 재시작마다 테이블 초기화. 안정화 후 `update`로 전환
- 유치원알리미 API: 이름 검색 불가, `sidoCode`+`sggCode`+`currentPage=1` 필수
- `@RequiredArgsConstructor`에서 `final` 누락 시 NPE
- `@Builder` 기본값엔 `@Builder.Default` 필수
- **Spring Boot 4.0**: `ClientHttpRequestFactories` 등 일부 API 제거됨
- **MinIO 직접 DB 삭제 주의**: orphan 파일 발생. API 경로 사용 권장
- 커밋은 사용자가 직접할 수 있도록 기능단위로 끊어서 고지

