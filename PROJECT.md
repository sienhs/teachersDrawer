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

### 비전 — 추천형 에디터 (Phase 4)

단순한 HWP 뷰어가 아니라 **선생님을 위한 코딩 IDE 같은 한글 에디터**.

```
IDE 자동완성   ↔   "등원" 입력 시 과거 등원 문장 추천
IDE 스니펫     ↔   "어버이날 활동" 클릭하면 작년 어버이날 행 삽입
IDE 인텔리센스 ↔   현재 반/아이 정보로 맞춤 추천
IDE 린트       ↔   "이 아이는 이번 주 평가가 비어있어요" 알림
```

이전의 자료를 불러와서 자동완성처럼 쓰는 것. 타자치는 것보다 마우스 클릭 몇 번이 더 빠르게.
시장에 없는 영역이며, 이 서비스의 진짜 차별점.

추가 비전 디테일:
- 노션식 슬래시 메뉴: [/] 입력 → 표(담당 아이 목록, 이전 표 템플릿) / 사진 / 체크리스트
- AI 추천 ON/OFF 설정 (선생님 직장 제약 대비)
- 처음부터 HWP 입출력 (export 안 타협)

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
- 중복 업로드 경고 (같은 planDate + classroomId면 확인 모달)
- 활동계획안 편집 후 정리화면 반영 흐름 ([정리화면에 반영], 보류 중)

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

### rhwp 관련 (Phase 3에서 발견)
- rhwp 결제란 셀 병합 렌더링 버그 (upstream 모니터링)
- rhwp "일일놀이실행안" 제목 미표시 (upstream 모니터링)
- rhwp 중첩 표 내 행 추가/삭제 시 부모 표 영향
- @rhwp/core의 pathJson 형식 발견 (Phase 4 추천 에디터에서 본격 해결)
- renderPageHtml 우회 경로 검토 ([정리화면에 반영] 대안)

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
- **@rhwp/editor v0.7.13** — iframe 기반 HWP 에디터 (뷰어 + 편집 + Export)
- **@rhwp/core v0.7.13** — 저수준 WASM 파서 (HwpDocument 약 150개 메서드)
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍
- 작성 도구: Claude Code (VSCode)

### HWP 처리 (Phase 3)
- **hwp-parser 컨테이너** ✅: Python 3.12 + FastAPI + pyhwp + BeautifulSoup
  - Docker Compose 사이드카, 포트 8001
  - POST /parse 엔드포인트: HWP/HWPX → 정규화 JSON
  - 꿈열매유치원 양식 파싱 검증 완료 (CASE_5_8, CASE_5_26)
- **rhwp 통합** ✅ Step 3-E-1, ✅ Step 3-E-2 (partial):
  - 활동계획안 상세 페이지 우측 사이드 패널 (랜드마크 명세서 스타일)
  - 뷰어 모드: ✅ 동작
  - 편집 모드 + 자동 저장: ✅ 동작 (3초 polling + 1000포인트 샘플링)
  - [정리화면에 반영]: ❌ 임시 비활성화 (버튼 disabled + tooltip "준비 중인 기능입니다", pyhwp ↔ rhwp export 비호환)

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

**HWP는 처음부터 끝까지 HWP.** 우리 자체 포맷으로 변환하지 않음. 입력도 HWP, 출력도 HWP. 한컴오피스 호환성이 절대 우선.

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
  - updateContent(...) 도메인 메서드 (편집 후 메타 갱신)

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
| **3** | 2026.05.30~ | HWP 자동 분석 + 자동 등록 + rhwp 임베드 | 🔄 |
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

**Step 2 — Spring ActivityPlan 도메인 + 업로드 API ✅** (2026-05-30)
- ActivityPlan / ActivitySection / MontessoriRecord 3개 엔티티
- HwpParserClient (Spring RestClient)
- FileStorageService (MinIO Java SDK 8.5.13)
- 11단계 end-to-end 검증 통과
- 핵심 가치 검증: **김신의 5/8·5/26 몬테소리 활동 누적 추적 동작** ★

**Step 3-A — 메인 대시보드 캘린더 ✅** (2026-05-31~06-01)
- AppLayout (헤더 + 사이드바 + 메인) + 라우팅
- API 클라이언트 4종 (child, classroom, enrollment, activityPlan)
- DashboardCalendar (FullCalendar 월 뷰)
- ActivityDetailPanel (우측 슬라이드 패널)
- 반·아이 필터

**Step 3-B — 활동계획안 풀스택 4페이지 ✅** (2026-06-01)
- 업로드 / 목록 / 상세 / 아이 상세
- 시각 검증 완료: **김신 미니 캘린더에 5/8 + 5/26 두 점 누적 표시** ★

**Step 3-C-1 — HWP 자동 등록 + 업로드 팝업 ✅** (2026-06-01)
- Child.status에 PENDING 추가
- POST /api/activity-plans/analyze (분석만, DB 저장 X)
- POST /api/activity-plans/confirm (사용자 확정 후 저장)
- DELETE /api/activity-plans/temp (거부 시 정리)
- 자동 등록: 반(없으면 생성), 아이(PENDING), Enrollment(연결)
- 동명이인 감지: 후보 있을 때 라디오 선택
- MinIO 객체 키 사용자별 격리: `activity-plans/{userId}/...`
- ENROLLED + PENDING 둘 다 USE_EXISTING 처리 (재업로드 시 자동 매칭)
- 모달 정보 밀도 조정 (자동 매칭은 요약, 결정 필요한 것만 카드)

**Step 3-C-2 — 아이 관리 페이지 + PENDING 정리 UI ✅** (2026-06-02)
- 사이드바 "아이 관리" 활성화
- 전체 / PENDING 탭 (GET /api/children?status= 파라미터 추가)
- 확정(PUT status→ENROLLED) / 삭제 / 일괄처리 UI
- 대시보드 상단 "확인 필요한 아이 N명" 배지 → /children?tab=pending

**Step 3-D — rhwp 안정성 검증 스파이크 ✅** (2026-06-02)
- @rhwp/editor v0.7.13 설치 (peer dep 충돌 없음)
- /_rhwp-test 격리 페이지
- CASE_5_8.hwp, CASE_5_26.hwp 렌더링·편집·Export 전항목 검증
- 보고서: mydocs/research/20260601-rhwp-evaluation.md
- 결과: ⚠️ 부분 통과 → Step 3-E 통합 진행 결정
  - 렌더링: 결제란·제목 깨짐 (export 후 한컴에서는 정상)
  - 편집: 텍스트 OK, 중첩 표 행 추가/삭제만 부모 표 영향
  - Export: ✅ 한컴오피스 완전 호환

**Step 3-E-1 — rhwp 뷰어 사이드 패널 ✅** (2026-06-02)
- 활동계획안 상세 페이지 좌우 분할
- RhwpEmbed (Step 3-D 코드 추출), RhwpViewerPanel (접/펼침 토글)
- 접힘 48px 세로 바, 펼침 w-2/5
- localStorage로 사용자 선호 기억
- HWP 바이트 lazy load (첫 펼침 시점)

**Step 3-E-2 — rhwp 편집 모드 + 자동 저장 ✅ (partial)** (2026-06-02)
- 백엔드:
  - PUT /api/activity-plans/{id}/file (MinIO 파일 교체)
  - confirm API에 existingPlanId 지원 (기존 plan 업데이트 모드)
  - sections/montessori deleteBy 메서드 추가
- 프론트:
  - RhwpEmbed에 editable + onChange (polling 방식)
  - RhwpViewerPanel: [편집모드] 토글, 자동 저장, [정리화면에 반영] 버튼
  - AnalysisConfirmModal에 existingPlanId prop
- rhwp onChange 이벤트 없음 → 3초 setInterval + exportHwp 바이트 비교 (1000포인트 샘플링)
- **막힘: [정리화면에 반영] 시 hwp-parser가 rhwp export 결과 못 읽음**
  - 에러: 422 "변환 결과 HTML 파일 없음. 생성된 파일 목록: []"
  - 원인: rhwp가 만든 HWP는 한컴 호환은 OK지만 pyhwp 사양은 통과 못 함
  - rhwp 자체 export: HWP / HWPX / SVG만 (HTML/text/JSON 없음)

**Step 3-E-2-a — @rhwp/core 탐색 ✅** (2026-06-02)
- @rhwp/core v0.7.13 설치 (HwpDocument 약 150개 메서드)
- /_rhwp-core-test 격리 페이지
- 결과 보고서: mydocs/research/20260602-rhwp-core-exploration.md
- 발견:
  - 초기화 WASM 34ms + HwpDocument 40ms = 74ms
  - 표 구조가 pyhwp와 다름: rhwp/core는 결제란+본문이 통합된 Table 0 (14×9, 35셀), Table 1 (3×2 방과후)
  - 셀 텍스트 추출 완벽: pyhwp와 일치
  - HTML 렌더링: renderPageHtml(0) 107,594자, (1) 43,034자
- 막힘: **중첩 표(몬테소리) — getTableDimensionsByPath의 pathJson 형식 미확인, 부모 표 반복 반환**

**Step 3-E-2-b 이후 — 보류** (2026-06-02)
- 결정: 길 C (지금 멈춤, Phase 3 일단 마무리, Phase 4 추천 에디터 작업 시 본격 해결)
- 임시 처리: [정리화면에 반영] 버튼 비활성화 + 사용자 안내
- 진짜 비전을 위한 정공법(@rhwp/core 활용)은 유지하되 시간 두고

### Phase 3 설계 결정 (요약)
1. 포맷: .hwp + .hwpx 둘 다 지원 (현재 .hwp만 구현, .hwpx는 TODO)
2. 추출 유연성: Phase 3-A 한 양식 → Phase 3+ LLM 하이브리드
3. 아키텍처: Docker Compose 사이드카 (내부망 통신)
4. DB: 완전 정규화 + rawJson 안전망
5. 업로드 흐름: 2단계 (분석 → 팝업 → 확정 시 저장)
6. 자동 등록: 반·아이·Enrollment 모두 자동, 아이는 PENDING으로
7. rhwp 통합: 뷰어 임베드 ✅, 편집 + 자동 저장 ✅, 정리화면 반영 ❌ 임시 비활성화 (Phase 4에서 @rhwp/core 활용해 해결)
8. 편집 후 DB 처리: 사용자 명시적 트리거 ([정리화면에 반영]), 자동 저장은 파일만
9. rhwp/core 도입: Phase 4 추천 에디터 비전과 일치, 단계적 활용

### Phase 3에서 알게 된 것
- HWP 양식은 글자 사이 공백이 흔함 ("일  시", "학 급 명") → 정규화 후 매칭 필수
- pyhwp의 `_rows()`는 중첩 테이블 행까지 포함 → 직접 자식만 순회 필요
- HWP 결제란 rowspan 병합 셀로 인한 인덱스 오프셋 보정
- 한글 날짜 형식: "2026년 5월 8일 월요일" 정규식 매칭
- **Spring Boot 4.0에서 ClientHttpRequestFactories 제거됨** → SimpleClientHttpRequestFactory 직접 사용
- **MultipartFile은 한 번만 읽힘** → byte[]로 미리 보관해 MinIO·hwp-parser에 재사용
- 활동계획안의 "평가" 칸·몬테소리 "확인" 칸은 보통 비어있음 → 현장에서 디지털 입력 기능 가치 큼
- confirm 단계에서 재파싱 안 함 → sections/montessori를 프론트에서 그대로 전달해 hwp-parser 2중 호출 방지
- **rhwp는 한컴 호환 OK, pyhwp 사양은 통과 못 함** → 편집 후 재분석은 hwp-parser 우회 필요
- **rhwp onChange 이벤트 없음** → polling 3초 + 1000포인트 샘플링이 debounce 역할 겸함
- **@rhwp/core의 표 구조는 pyhwp와 다름** (결제란이 본문에 통합) → 우리만의 매핑 전략 필요

---

## 6. 현재 구현된 API 엔드포인트

### 인증 (`/api/auth/**`) — 공개
- POST `/signup`, POST `/login`, POST `/reissue`, POST `/logout`

### 학교 (`/api/schools/**`) — 공개
- GET `/regions`, GET `/regions/{sidoCode}`
- GET `/search?name=` (초중고)
- GET `/kindergartens?sidoCode=&sggCode=&name=` (유치원)

### 아이 (`/api/children/**`) — 인증 필수
- POST `/`, GET `/` (?status=ENROLLED|PENDING|ALL), GET `/{childId}`, PUT `/{childId}`, DELETE `/{childId}`

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/`, DELETE `/{id}`
- GET `/children/{childId}`, GET `/classrooms/{classroomId}`

### 활동계획안 (`/api/activity-plans/**`) — 인증 필수
- POST `/` (multipart) — HWP 업로드 (레거시, 자동 처리)
- POST `/analyze` — 분석만 (DB 저장 X)
- POST `/confirm` — 사용자 확정 후 저장 (existingPlanId 지원)
- DELETE `/temp?fileKey=` — 거부 시 임시 파일 정리
- GET `/` (?classroomId=, from=, to=) — 목록
- GET `/{planId}` — 상세
- DELETE `/{planId}` — 삭제 (MinIO 파일 동기 삭제)
- GET `/{planId}/file` — 원본 HWP 다운로드
- **PUT `/{planId}/file`** — 편집 후 파일 교체 (MinIO 덮어쓰기) ✨
- GET `/children/{childId}/montessori` — 아이별 몬테소리 누적 이력

---

## 7. 환경 & 운영

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `hwp-parser/`, `samples/hwp/`, `mydocs/orders/`, `mydocs/history/`, `mydocs/research/`, `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs`, `main`
- IDE: STS(백) + VSCode·Claude Code(프론트·파서·복잡 작업) + Thunder Client

### Docker 서비스
- `postgres` (PostgreSQL 16) — 5432
- `minio` (스토리지) — 9000(API), 9001(Console)
- `hwp-parser` (Python FastAPI) — 8001
- 모두 `drawer-network`. backend 추가 시 `docker` 프로파일 활성화.

### 알려진 환경 이슈 / 교훈
- STS 자체 컴파일러가 `-parameters` 무시 → `@RequestParam`/`@PathVariable`/`@Qualifier` 이름 명시 필수
- **STS 변경 소스 컴파일 캐시 문제** → Project > Clean 필요 (소스 수정 후 메서드 인식 안 됨 시)
- `ddl-auto: create`는 재시작마다 테이블 초기화. 안정화 후 `update`로 전환
- 유치원알리미 API: 이름 검색 불가, `sidoCode`+`sggCode`+`currentPage=1` 필수
- `@RequiredArgsConstructor`에서 `final` 누락 시 NPE
- `@Builder` 기본값엔 `@Builder.Default` 필수
- **Spring Boot 4.0**: `ClientHttpRequestFactories` 등 일부 API 제거됨
- **MinIO 직접 DB 삭제 주의**: orphan 파일 발생. API 경로 사용 권장
- 커밋은 사용자가 직접 (작업 단위로 끊어서 안내)
- **Thunder Client multipart 가끔 동작 안 함** → curl.exe 사용
- **rhwp는 한컴 호환 OK, pyhwp 사양은 통과 못 함**
- **rhwp onChange 이벤트 없음** → polling 3초 + 샘플링 비교
