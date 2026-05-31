# 선생님의 서랍 (Teachers Drawer)

유치원·초중고 선생님을 위한 학급 관리 웹 서비스.
아이별 관찰일지, 체크리스트, 활동계획안 아카이브, 연도별 반 관리를 제공한다.

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
- 관찰일지: 외부 전용 앱(키즈노트 등)과의 연동 가능성 (구조만 유연하게)
- 선생님 간 데이터 인계 (현직장 인증 기반)
- 에러 메시지 정보 노출 최소화 (FORBIDDEN→NOT_FOUND 통일 검토)
- 공통 OwnershipValidator 추출 (Child/Classroom/Enrollment 검증 헬퍼 중복 해소)
- Enroll 시 연도 정합성 정책 (아이/반 연도 불일치 경고 여부)

---

## 2. 기술 스택

### Backend
- Java 21, Spring Boot 4.0.6, Gradle 9.4.1
- Spring Security 6 + JWT (jjwt 0.12.6)
- JPA (Hibernate) + QueryDSL 5.1.0:jakarta
- PostgreSQL 16
- MinIO (파일 스토리지)
- 외부 API: 나이스 OpenAPI, 유치원알리미 OpenAPI

### Frontend
- React + Vite + TypeScript
- Tailwind CSS v4
- Zustand, Axios, React Router DOM
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍
- 작성 도구: Claude Code (VSCode)

### HWP 처리 (Phase 3 신규)
- **hwp-parser 컨테이너**: Python 3.12 + FastAPI + pyhwp
  - Docker Compose 사이드카로 추가, 내부망 통신 (포트 8001)
  - HWP/HWPX → 구조화 JSON 변환 책임
- **rhwp**: 웹 임베드 HWP 에디터 (`@rhwp/editor` npm 패키지)
  - Rust + WebAssembly 기반, MIT 라이센스
  - 우리 프론트에 3줄로 임베드, HWP/HWPX 뷰어·편집 제공
  - 한컴 호환 hwpctl 레이어 30 Actions
  - https://github.com/edwardkim/rhwp (v0.7.3, 2026-04-19)

### Infra
- Docker Compose: PostgreSQL + MinIO + **hwp-parser**
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
  ├─ Child (아이) ───────────── 독립 엔티티
  ├─ Classroom (반) ─────────── 연도별 (ACTIVE / ARCHIVED)
  ├─ Enrollment (반배정) ────── Child ↔ Classroom (N:M)
  ├─ Observation (관찰일지) ─── Child 직접 연결  [Phase 2 후반]
  └─ ActivityPlan (활동계획안) ─ HWP 파일 1개 = 1 ActivityPlan  [Phase 3]
        ├─ ActivitySection ─── 시간대별 활동 (등원/점심/바깥놀이…)
        └─ MontessoriRecord ── 아이별 교구 활동 기록
```

### 핵심 설계 원칙

**아이는 반에 종속되지 않고 독립 존재.** 진급·순환보직으로 같은 아이를 여러 해 맡는 경우 누적 성장 기록을 이어볼 수 있도록.

**관찰일지는 Child에 직접 연결.** 반이 바뀌어도 아이 기준으로 기록 연속. classroomId는 참고용. source/externalId 필드로 외부앱 연동 대비.

**활동계획안은 완전 정규화 + JSON 안전망.** 검색·통계가 핵심 기능이 되므로 정규화 필수. 단 `rawJson` 컬럼에 파싱 원본도 함께 저장하여 알고리즘 개선 시 재파싱 없이 DB만 보고 재처리 가능.

### 엔티티 필드 (현재 구현 상태)

```
Child  ✅
  id, user(FK), name, birthDate, gender, status, memo,
  createdAt, updatedAt

Classroom  ✅
  id, user(FK), year, name, status, createdAt, updatedAt
  - archive() / activate() / isArchived() 도메인 메서드

Enrollment  ✅
  id, child(FK), classroom(FK), year(캐시), createdAt
  - 중복 배정 차단(existsByChildIdAndClassroomId)
  - 아카이브된 반 등록·해제 차단

Observation  ⏳ Phase 2 후반
  id, childId, classroomId(참고), date, content,
  source (SELF | EXTERNAL), externalId(nullable),
  createdAt, updatedAt

ActivityPlan  ⏳ Phase 3
  id, user(FK), classroom(FK,nullable),
  planDate, subject, teacherName,
  classNameRaw, classTimeRaw, classDayCount,
  fileKey(MinIO), fileName,
  rawJson(파싱 원본, 디버깅·재처리 안전망),
  createdAt, updatedAt

ActivitySection  ⏳ Phase 3
  id, activityPlan(FK), orderIndex,
  label, content,
  category(enum: MORNING/SAFETY/LUNCH/OUTDOOR/EVALUATION/OTHER)

MontessoriRecord  ⏳ Phase 3
  id, activityPlan(FK),
  childNameRaw, child(FK,nullable),
  area, material, confirmed
```

### 멀티유저 격리 패턴

```java
// 소유권 검증 (모든 도메인 Service 공통)
private Child findOwnedChild(Long userId, Long childId) {
    Child child = repo.findById(childId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
    if (!child.getUser().getId().equals(userId))
        throw new BusinessException(FORBIDDEN);
    return child;
}

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
| **2** | 2026.05.29~ | Child·Classroom·Enrollment CRUD ✅ / 관찰일지 ⏳ / 캘린더·타임라인 ⏳ | 🔄 |
| **3** | — | **HWP 활동계획안 자동 추출** + rhwp 에디터 임베드 + 체크리스트 | ⏳ 진입 직전 |
| **4** | — | 반 복사·템플릿 / 자주 쓰는 관찰 문구 / 통합 검색 / 모바일 | ⏳ |
| **5** | — | AWS 배포 / 운영(HTTPS·CI) / 선생님 간 인계 | ⏳ |

### Phase 2 진행 상황 (2026.05.29~)
- ✅ CustomUserDetails 도입
- ✅ Child CRUD (status 포함, 멀티유저 격리)
- ✅ Classroom CRUD (아카이브/복구 액션 엔드포인트, ARCHIVED 보호)
- ✅ Enrollment CRUD (중복·아카이브 검증)
- ⏳ Observation 작성·조회
- ⏳ 아이별 타임라인 + 표 정리보기
- ⏳ 메인 페이지 캘린더

### Phase 3 설계 결정 (2026-05-30 합의)

> **목표**: HWP/HWPX 활동계획안에서 자동으로 데이터를 추출해 검색·통계·아이별 활동 추적이 가능하게 한다. 동시에 rhwp 에디터로 HWP 원본을 우리 서비스 안에서 직접 편집할 수 있게 한다.

#### 결정 1 — 포맷: .hwp + .hwpx 둘 다 지원

샘플 분석 결과 유치원 활동계획안은 주로 .hwp 5.0 (OLE Compound Document). pyhwp/rhwp 모두 두 포맷 다룰 수 있음.

#### 결정 2 — 추출 유연성: 양식 차이에 자동 대응

파일마다 양식이 조금씩 달라도 자동으로 잘 찾아야 함. 두 단계 전략:

```
Phase 3-A (먼저)  한 양식만 잘 파싱 (희성 친구 유치원 양식)
                  → 진짜 유저 1명 확보 → 인사이트 수집
Phase 3-B (다음)  LLM 하이브리드 (새 양식 발견 시 LLM으로 학습 → 규칙 DB 저장 → 같은 양식은 캐시된 규칙으로 빠르게)
```

#### 결정 3 — 아키텍처: 사이드카 Python 컨테이너 (B)

```
docker-compose.yml
├─ postgres        (기존)
├─ minio           (기존)
└─ hwp-parser      (신규) Python 3.12 + FastAPI + pyhwp, 포트 8001 내부망

Spring Boot ──HTTP POST──> hwp-parser /parse ──> JSON 응답
```

별도 외부 호스팅(A)보다 내부망 사이드카가 부하·운영·보안 모두 우수. POST /parse 엔드포인트 하나만 노출.

#### 결정 4 — DB 저장: 완전 정규화 + JSON 안전망 (B)

ActivityPlan / ActivitySection / MontessoriRecord 세 테이블로 정규화. 동시에 `ActivityPlan.rawJson`에 파싱 원본 보관.

#### 결정 5 — rhwp 임베드까지 도전 (A)

원래 "HWP 편집은 큰 벽"이었으나 rhwp(`@rhwp/editor`) 등장으로 가능해짐. React에 3줄로 임베드 가능, MIT 라이센스.

```
업로드 HWP
   ├─ MinIO 원본 저장
   ├─ hwp-parser로 정규화 데이터 추출 → DB 저장 (검색·통계용)
   └─ rhwp 에디터로 웹에서 직접 편집·저장 (UX 차별화)
```

**리스크**: rhwp는 아직 v0.7.3 (v1.0 미달, 조판 엔진 진행 중). 일부 복잡한 HWP는 렌더링 깨질 수 있음. 우리 양식이 잘 동작하는지 직접 테스트가 첫 단계.

#### 샘플 파일 분석 결과

희성 친구 유치원(꿈열매유치원 추정) 일일놀이실행안 양식:

```
파일 구조: HWP 5.0 OLE Compound Document
pyhwp로 XHTML 변환 → BeautifulSoup 파싱 가능

테이블 #1: 결제란 (원장/담당)
테이블 #2: 본문 14행 ★ 핵심
  - 행 0: 일시 | 학급명 | 수업시간 | 수업일수 (메타정보)
  - 행 1: 주제
  - 행 2: 헤더 (활동계획 | 활동내용)
  - 행 3~13: 시간대별 활동 (등원/나침반 안전교육/이야기 나누기/
            몬테소리 자유놀이/교실운영/점심/바깥놀이/귀가/이론/오감사/평가)
테이블 #3: 방과후 (특성화/간식/자유놀이)

특이점: "몬테소리 자유놀이" 셀 내부에 [이름/영역/교구명/확인] 중첩 표
       → 아이별 교구 활동 기록의 진짜 가치
```

추출 가능 데이터:
- 메타: 날짜, 학급명, 담임, 수업시간, 수업일수, 주제
- 활동: 등원, 점심, 바깥놀이 등 라벨별 내용 (시간대별)
- 몬테소리: 아이별 교구 활동 (이름/영역/교구명/확인)

### Phase 3 작업 순서 (예정)

```
1. docker-compose.yml에 hwp-parser 서비스 추가
2. hwp-parser/ 구성
   ├─ Dockerfile (python:3.12-slim + pyhwp + FastAPI)
   ├─ requirements.txt
   ├─ main.py (POST /parse)
   └─ parser/activity_plan.py (꿈열매유치원 양식 파싱)
3. Spring 측: HwpParserClient (RestClient)
4. ActivityPlan / ActivitySection / MontessoriRecord 엔티티·Repository·Service
5. 업로드 API: MinIO 저장 + hwp-parser 호출 + DB 정규화 저장
6. 조회 API (목록, 상세, 검색)
7. 프론트: 업로드 UI + 표 정리보기
8. rhwp 에디터 임베드 (`@rhwp/editor`) — 원본 HWP를 웹에서 편집
9. (Phase 3-B) LLM 기반 양식 자동 학습 — 다른 유치원 대응
```

---

## 5. 현재 구현된 API 엔드포인트

### 인증 (`/api/auth/**`) — 공개
- POST `/signup`, POST `/login`, POST `/reissue`, POST `/logout`

### 학교 (`/api/schools/**`) — 공개
- GET `/regions`, GET `/regions/{sidoCode}`
- GET `/search?name=` (초중고, 나이스)
- GET `/kindergartens?sidoCode=&sggCode=&name=` (유치원알리미)

### 아이 (`/api/children/**`) — 인증 필수
- POST `/`, GET `/`, GET `/{childId}`, PUT `/{childId}`, DELETE `/{childId}`

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/` (enroll), DELETE `/{id}` (unenroll)
- GET `/children/{childId}` (아이별 이력)
- GET `/classrooms/{classroomId}` (반 명단)

---

## 6. 환경 & 운영

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `hwp-parser/`(예정), `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs`, `main`
- IDE: STS(백) + VSCode·Claude Code(프론트) + Thunder Client

### 알려진 환경 이슈 / 교훈
- STS 자체 컴파일러가 `-parameters` 무시 → `@RequestParam`/`@PathVariable`/`@Qualifier` 이름 명시 필수
- `ddl-auto: create`는 재시작마다 테이블 초기화. 안정화 후 `update`로 전환
- 유치원알리미 API: 이름 검색 불가, `sidoCode`+`sggCode`+`currentPage=1` 필수, 백엔드에서 이름 필터링
- `@RequiredArgsConstructor`에서 `final` 누락 시 NPE
- `@Builder` 기본값엔 `@Builder.Default` 필수
- 작업 단위마다 Git 커밋 (파일 유실 경험)