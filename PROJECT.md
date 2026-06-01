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
- **HWP 활동계획안 자동 데이터 추출**이 이 서비스의 결정적 차별점.

### 향후 기능 아이디어 (백로그)
- 통합 검색 (아이/일지/활동계획안 across)
- 처음 반 생성 시 데이터 일괄 불러오기
- 업로드한 파일을 분석해 과거 일자 기록을 모두 추출·저장
- 기존 반의 템플릿 불러오기 (반 복사)
- 선생님별 자주 쓰는 관찰 문구 모음
- 과거 반은 읽기 전용 아카이브
- 파일 이동 및 모아보기
- 관찰일지: 외부 전용 앱(키즈노트 등)과의 연동 (구조만 유연하게)
- 선생님 간 데이터 인계 (현직장 인증 기반)
- 에러 메시지 정보 노출 최소화 (FORBIDDEN→NOT_FOUND 통일 검토)
- 공통 OwnershipValidator 추출 (Child/Classroom/Enrollment/ActivityPlan 검증 헬퍼 중복 해소)
- Enroll 시 연도 정합성 정책
- **활동계획안 "평가"·"확인" 칸 디지털 입력**: HWP에선 비어있는 평가 섹션·몬테소리 confirmed 칸을 우리 UI에서 입력·체크하는 기능. (현장 활용 가치 큼)
- **MinIO orphan 파일 정리**: DB 직접 삭제 시 MinIO 객체가 남는 문제. 정기 cleanup job 또는 관리 스크립트.

---

## 2. 기술 스택

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
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍
- 작성 도구: Claude Code (VSCode)

### HWP 처리 (Phase 3)
- **hwp-parser 컨테이너** ✅: Python 3.12 + FastAPI + pyhwp + BeautifulSoup
  - Docker Compose 사이드카, 포트 8001 (개발 중에는 호스트 노출)
  - POST /parse 엔드포인트: HWP/HWPX → 정규화 JSON
  - 꿈열매유치원 양식 파싱 검증 완료 (CASE_5_8, CASE_5_26)
- **rhwp** ⏳ Phase 3 Step 4: 웹 임베드 HWP 에디터 (`@rhwp/editor` npm)
  - Rust + WebAssembly, MIT 라이센스
  - https://github.com/edwardkim/rhwp (v0.7.3)

### Infra
- Docker Compose: PostgreSQL + MinIO + **hwp-parser**
- 환경 분리:
  - **STS 직접 실행** (개발) → `application.yml`: `http://localhost:8001`, `http://localhost:9000`
  - **Docker 배포** → `application-docker.yml`: `http://hwp-parser:8001`, `http://minio:9000`
- 배포 목표: AWS

### 인증 설계
- Access Token: 메모리(Zustand), 15분
- Refresh Token: HttpOnly Cookie + DB, 7일
- **CustomUserDetails**: User 엔티티 래핑, 컨트롤러에서 `@AuthenticationPrincipal`로 id 즉시 접근

---

## 3. 데이터 모델

### 엔티티 관계

```
User (선생님)
  ├─ Child (아이) ─────────── 독립 엔티티
  ├─ Classroom (반) ────────── 연도별 (ACTIVE / ARCHIVED)
  ├─ Enrollment (반배정) ───── Child ↔ Classroom (N:M)
  ├─ Observation (관찰일지) ── Child 직접 연결  [Phase 2 후반 예정]
  └─ ActivityPlan (활동계획안) ─ HWP 파일 1개 = 1 ActivityPlan  ✅
        ├─ ActivitySection ── 시간대별 활동 (등원/점심/바깥놀이…)
        └─ MontessoriRecord ─ 아이별 교구 활동 기록
```

### 핵심 설계 원칙

**아이는 반에 종속되지 않고 독립 존재.** 진급·순환보직으로 같은 아이를 여러 해 맡는 경우 누적 성장 기록을 이어볼 수 있도록.

**관찰일지는 Child에 직접 연결.** 반이 바뀌어도 아이 기준으로 기록 연속. classroomId는 참고용. source/externalId 필드로 외부앱 연동 대비.

**활동계획안은 완전 정규화 + JSON 안전망.** 검색·통계가 핵심 기능이므로 정규화 필수. `rawJson` 컬럼에 파싱 원본 보존하여 알고리즘 개선 시 재파싱 없이 DB만 보고 재처리 가능.

**자동 매칭은 시도하되 실패 시 null.** ActivityPlan→Classroom(classNameRaw로), MontessoriRecord→Child(childNameRaw로) 자동 연결 시도. 실패해도 오류 없이 null 저장 후 사용자가 수동 연결.

### 엔티티 필드 (현재 구현 상태)

```
Child  ✅
  id, user(FK), name, birthDate, gender, status, memo,
  createdAt, updatedAt

Classroom  ✅
  id, user(FK), year, name, status, createdAt, updatedAt
  - archive() / activate() / isArchived()

Enrollment  ✅
  id, child(FK), classroom(FK), year(캐시), createdAt

ActivityPlan  ✅
  id, user(FK), classroom(FK, nullable),
  planDate, subject, teacherName,
  classNameRaw, classTimeRaw, classDayCount,
  fileKey(MinIO 객체 키), fileName,
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

Observation  ⏳ Phase 2 후반
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

## 4. 개발 Phase 로드맵

| Phase | 기간 | 내용 | 상태 |
|-------|------|------|------|
| **1** | 2026.05.26~05.28 | Docker / 인증 / 학교 검색 / React 인증 흐름 | ✅ |
| **2** | 2026.05.29~ | Child·Classroom·Enrollment ✅ / 관찰일지 ⏳ / 캘린더·타임라인 ⏳ | 🔄 |
| **3** | 2026.05.30~ | HWP 자동 추출 백엔드 ✅ / 프론트 UI ⏳ / rhwp 임베드 ⏳ | 🔄 |
| **4** | — | 반 복사·템플릿 / 자주 쓰는 관찰 문구 / 통합 검색 / 모바일 | ⏳ |
| **5** | — | AWS 배포 / 운영(HTTPS·CI) / 선생님 간 인계 | ⏳ |

### Phase 2 진행 상황
- ✅ CustomUserDetails 도입
- ✅ Child CRUD (멀티유저 격리)
- ✅ Classroom CRUD (아카이브/복구, ARCHIVED 보호)
- ✅ Enrollment CRUD (중복·아카이브 검증)
- ⏳ Observation 작성·조회 (Phase 3 다음에)
- ⏳ 아이별 타임라인, 메인 캘린더

### Phase 3 진행 상황

**Step 1 — hwp-parser 컨테이너 ✅** (2026-05-30)
- Python 3.12 + FastAPI + pyhwp + BeautifulSoup
- 꿈열매유치원 양식 파싱 알고리즘
  - 메타정보 (일시/학급명/수업시간/수업일수/주제/담임)
  - 시간대별 활동 11개 (등원~평가) + category 매핑
  - 몬테소리 중첩 표 → 아이별 교구 기록
- pytest 9/9 통과 + Docker 컨테이너 end-to-end 검증
- 두 샘플 모두 HTTP 200, 정확한 추출
- rawJson 안전망 3,400~3,900자

**Step 2 — Spring ActivityPlan 도메인 + 업로드 API ✅** (2026-05-30)
- ActivityPlan / ActivitySection / MontessoriRecord 3개 엔티티
- HwpParserClient (Spring RestClient)
- FileStorageService (MinIO Java SDK 8.5.13, 자동 버킷 생성)
- 업로드 API: MinIO 저장 + hwp-parser 호출 + DB 정규화 저장
- Classroom 자동 매칭 (classNameRaw → ACTIVE Classroom 검색)
- Child 자동 매칭 (childNameRaw → 같은 user의 Child)
- 11단계 end-to-end 검증 통과 (업로드~다운로드 MD5 일치~삭제)
- 핵심 가치 검증: **김신의 5/8·5/26 몬테소리 활동 누적 추적 동작** ★

**Step 3 — 프론트 업로드 UI + 표 정리보기 ⏳ 다음 차례**

**Step 4 — rhwp 에디터 임베드 ⏳**
- `@rhwp/editor` npm 패키지로 원본 HWP 웹 편집
- 리스크: rhwp v0.7.3 (v1.0 미달), 우리 양식 호환성 직접 검증 필요

**Step 5 (Phase 3-B) — LLM 기반 양식 자동 학습 ⏳**
- 새 유치원 양식 발견 시 LLM으로 학습 → 추출 규칙 DB 저장
- 같은 양식은 캐시된 규칙으로 빠르게 파싱

### Phase 3 설계 결정 (요약)
1. 포맷: .hwp + .hwpx 둘 다 지원 (현재 .hwp만 구현, .hwpx는 TODO)
2. 추출: Phase 3-A 한 양식 → Phase 3-B LLM 하이브리드
3. 아키텍처: Docker Compose 사이드카 (내부망 통신)
4. DB: 완전 정규화 + rawJson 안전망
5. 편집: rhwp 임베드까지 도전 (Step 4)

### Phase 3에서 알게 된 것
- HWP 양식은 글자 사이 공백이 흔함 ("일  시", "학 급 명") → 정규화 후 매칭 필수
- pyhwp의 `_rows()`는 중첩 테이블 행까지 포함 → 직접 자식만 순회 필요
- HWP 결제란 rowspan 병합 셀로 인한 인덱스 오프셋 보정
- 한글 날짜 형식: "2026년 5월 8일 월요일" 정규식 매칭
- **Spring Boot 4.0에서 ClientHttpRequestFactories 제거됨** → SimpleClientHttpRequestFactory 직접 사용
- **MultipartFile은 한 번만 읽힘** → byte[]로 미리 보관해 MinIO·hwp-parser에 재사용
- 활동계획안의 "평가" 칸·몬테소리 "확인" 칸은 보통 비어있음 → 현장에서 디지털 입력 기능 가치 큼

---

## 5. 현재 구현된 API 엔드포인트

### 인증 (`/api/auth/**`) — 공개
- POST `/signup`, POST `/login`, POST `/reissue`, POST `/logout`

### 학교 (`/api/schools/**`) — 공개
- GET `/regions`, GET `/regions/{sidoCode}`
- GET `/search?name=` (초중고)
- GET `/kindergartens?sidoCode=&sggCode=&name=` (유치원)

### 아이 (`/api/children/**`) — 인증 필수
- POST `/`, GET `/`, GET `/{childId}`, PUT `/{childId}`, DELETE `/{childId}`

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/`, DELETE `/{id}`
- GET `/children/{childId}`, GET `/classrooms/{classroomId}`

### 활동계획안 (`/api/activity-plans/**`) — 인증 필수 ✨ NEW
- POST `/` (multipart: file, classroomId?) — HWP 업로드
- GET `/` (?classroomId=, from=, to=) — 목록
- GET `/{planId}` — 상세 (sections, records 포함)
- DELETE `/{planId}` — 삭제 (MinIO 파일 동기 삭제)
- GET `/{planId}/file` — 원본 HWP 다운로드
- GET `/children/{childId}/montessori` — 아이별 몬테소리 누적 이력

---

## 6. 환경 & 운영

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `hwp-parser/`, `samples/hwp/`, `mydocs/orders/`, `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs`, `main`
- IDE: STS(백) + VSCode·Claude Code(프론트·파서·복잡 작업) + Thunder Client

### Docker 서비스
- `postgres` (PostgreSQL 16) — 5432
- `minio` (스토리지) — 9000(API), 9001(Console)
- `hwp-parser` (Python FastAPI) — 8001
- 모두 `drawer-network`에 묶여있음. backend 추가 시 같은 네트워크에 + `docker` 프로파일 활성화.

### 알려진 환경 이슈 / 교훈
- STS 자체 컴파일러가 `-parameters` 무시 → `@RequestParam`/`@PathVariable`/`@Qualifier` 이름 명시 필수
- `ddl-auto: create`는 재시작마다 테이블 초기화. 안정화 후 `update`로 전환
- 유치원알리미 API: 이름 검색 불가, `sidoCode`+`sggCode`+`currentPage=1` 필수
- `@RequiredArgsConstructor`에서 `final` 누락 시 NPE
- `@Builder` 기본값엔 `@Builder.Default` 필수
- **Spring Boot 4.0 호환성**: `ClientHttpRequestFactories` 등 일부 API 제거됨. 마이그레이션 시점 잘 잡을 것.
- **MinIO 직접 DB 삭제 주의**: `DELETE FROM` 직접 실행 시 객체 orphan. 반드시 API 경로 사용 또는 cleanup 스크립트.
- 작업 단위마다 Git 커밋 (파일 유실 경험)
