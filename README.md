# teachersDrawer (선생님의 서랍)

유치원·초중고 교사를 위한 업무 관리 웹 서비스. **HWP 활동계획안을 자동으로 분석·구조화**하고, 반·아이·반배정·아이별 활동 누적 기록을 한 곳에서 관리한다.

> 본 프로젝트는 현재 개발 진행 중인 미공개 프로젝트입니다. 인증·학교 검색·아이/반/반배정 관리·HWP 자동 분석·rhwp 임베드 뷰어·편집·정리화면 반영까지 구현되어 있으며, 핵심 기능은 계속 추가되고 있습니다. 문서에 기재된 API와 구조는 진행에 따라 변경될 수 있습니다.

## 핵심 가치

- **HWP 활동계획안 자동 분석**: 한컴오피스 파일을 업로드하면 시간대별 활동·아이별 몬테소리 활동을 자동 추출해 DB에 정규화 저장
- **아이 자동 등록**: HWP 안의 아이 이름·반·담임을 인식해 PENDING으로 자동 등록, 사용자가 확인만 하면 끝
- **아이별 누적 추적**: 한 아이가 여러 활동계획안에 등장하면 캘린더에 자동 누적 표시
- **HWP 원본 보존 + 웹 편집**: 페이지 안에 한컴오피스 같은 편집기 임베드 (rhwp). 편집 후 export 시 한컴오피스 호환. 편집 내용을 정리화면(DB)에 반영 가능

## 기술 스택

### Backend
- Java 21, Spring Boot 4.0
- Spring Security 6 + JWT (Access in-memory / Refresh HttpOnly Cookie)
- JPA (Hibernate) + QueryDSL
- PostgreSQL 16
- MinIO (HWP 파일 스토리지)
- Spring RestClient (외부 서비스 호출)

### Frontend
- React 19 + Vite + TypeScript
- Tailwind CSS 4 (베이지 + 주황 토스풍)
- Zustand, Axios, React Router 7
- FullCalendar (월 뷰, lazy load), react-calendar (미니), react-dropzone
- `@rhwp/editor` (iframe 기반 HWP 에디터 — 뷰어 + 편집 + Export)
- `@rhwp/core` (WASM HWP 파서 — 브라우저에서 직접 파싱, 75ms)

### HWP 처리
- **@rhwp/core**: Rust + WebAssembly 기반. 브라우저에서 직접 HWP 파싱 (init 34ms + load 40ms)
- 업로드 시 프론트엔드에서 먼저 파싱 → 백엔드에 파싱 결과 전달 (Python 의존성 없음)
- 꿈열매유치원 양식 검증 완료. 일관성 검증: hwp-parser 대비 의미 데이터 완전 동일

### Infra
- Docker Compose: PostgreSQL, MinIO
- 외부 연동: NEIS 교육정보 API, 유치원알리미(e-childschoolinfo) API
- 배포 목표: AWS

## 시스템 흐름

전체 요청 흐름:

```
Client (axios)
  → SecurityFilterChain (JwtFilter)
  → Controller (요청 검증 / 응답 래핑)
  → Service (비즈니스 로직 / 트랜잭션)
  → Repository (JPA) · 외부 API Client
  → DB(PostgreSQL) · NEIS / 유치원알리미 · MinIO
```

모든 응답은 `ApiResponse<T>` 한 가지 포맷으로 통일되며, 구조는 `{ success, message, data }` 입니다. 예외는 `GlobalExceptionHandler`가 잡아 동일 포맷으로 변환합니다.

### HWP 업로드 흐름 (2단계)

```
1. 파일 선택 → 프론트엔드에서 @rhwp/core로 파싱 (75ms)
   → ParsedActivityPlan (메타 6개 + sections 11개 + 몬테소리 기록)

2. POST /api/activity-plans/analyze (multipart: file + parsed JSON)
   → MinIO 임시 저장 + 자동 매칭 (반/아이) + 중복 감지
   → 분석 결과 응답: 반/아이/활동 미리보기

3. 사용자가 모달에서 확인 (자동 매칭 결과 검토, 동명이인 처리)

4. POST /api/activity-plans/confirm (분석 결과 + 사용자 결정)
   → 반/아이(PENDING)/Enrollment 자동 생성 + ActivityPlan 저장
   → DB 갱신 모드(existingPlanId)도 지원
```

분석에서 매칭 못 한 아이는 **PENDING 상태**로 자동 등록되어 사용자가 아이 관리 페이지에서 일괄 확정/삭제할 수 있습니다.

### [정리화면에 반영] 흐름

```
상세 페이지 → 편집 모드 ON → 텍스트 편집 → 3초 자동 저장 (MinIO 파일만 갱신)
→ [정리화면에 반영] 클릭
→ 프론트에서 @rhwp/core로 현재 파일 재파싱
→ POST /analyze → 모달 → [수락하고 저장] → DB 갱신
```

### 인증 흐름 (Spring Security + JWT)

1. `JwtFilter`가 `Authorization: Bearer <token>` 헤더에서 Access Token을 추출
2. `JwtUtil.isTokenValid()`로 서명·만료 검증
3. 이메일로 `CustomUserDetailService`를 통해 `CustomUserDetails`를 조회, `UsernamePasswordAuthenticationToken`을 만들어 `SecurityContextHolder`에 저장
4. 컨트롤러는 `@AuthenticationPrincipal CustomUserDetails`로 현재 사용자에 즉시 접근

세션은 STATELESS, CSRF / formLogin / httpBasic 모두 비활성화. `/api/auth/**`, `/api/schools/**`는 공개, 나머지는 인증 필요.

### 토큰 정책

- Access Token: 응답 바디로 전달, 클라이언트 메모리(Zustand)에서 관리, 만료 15분
- Refresh Token: HttpOnly 쿠키(`refresh_token`)로 전달하여 JS 접근 차단, 만료 7일
- Refresh Token은 DB(`RefreshToken`)에도 저장되어 재발급 시 대조 검증
- 서명: HS256 (HMAC-SHA256)

### 멀티유저 격리

모든 도메인 Repository에 `findByIdAndUserId(id, userId)` 패턴을 두어 조회·소유권을 한 쿼리로 처리합니다. 소유자가 다른 경우 FORBIDDEN이 아닌 NOT_FOUND를 반환하여 리소스 존재 여부조차 노출하지 않습니다.

## API 요약

### 인증 (`/api/auth/**`) — 공개
- POST `/signup`, POST `/login`, POST `/reissue`, POST `/logout`

### 학교 (`/api/schools/**`) — 공개
- GET `/regions`, GET `/regions/{sidoCode}` — 시도·시군구 코드
- GET `/search?name=` — 초중고 (NEIS)
- GET `/kindergartens?sidoCode=&sggCode=&name=` — 유치원 (유치원알리미)

### 아이 (`/api/children/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/pending/confirm-all`, DELETE `/pending` — PENDING 일괄 처리

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/`, DELETE `/{id}`, GET `/children/{childId}`, GET `/classrooms/{classroomId}`

### 활동계획안 (`/api/activity-plans/**`) — 인증 필수
- POST `/analyze` (multipart: file + parsed JSON) — 분석만 (DB 저장 X, 중복 감지 포함)
- POST `/confirm` — 사용자 확정 후 저장 (신규/업데이트 모드)
- DELETE `/temp?fileKey=` — 거부 시 정리
- GET `/`, GET `/{id}`, DELETE `/{id}`
- GET `/{id}/file` — HWP 다운로드
- PUT `/{id}/file` — 편집 후 파일 교체
- GET `/children/{childId}/montessori` — 아이별 몬테소리 누적 이력

## 데이터 모델

```
User (선생님)
  ├─ Child (아이)
  │     status: ENROLLED | PENDING | GRADUATED | WITHDRAWN
  ├─ Classroom (반)
  │     연도별, ACTIVE / ARCHIVED
  ├─ Enrollment (반배정) — Child ↔ Classroom (N:M)
  ├─ Observation (관찰일지) — Child 직접 연결 (예정)
  └─ ActivityPlan (활동계획안) — HWP 1개 = 1 ActivityPlan
        ├─ ActivitySection — 시간대별 활동 (등원/점심/바깥놀이…)
        └─ MontessoriRecord — 아이별 교구 활동
```

**아이(Child)는 반(Classroom)에 종속되지 않습니다.** 진급·순환보직으로 같은 아이를 여러 해 맡는 경우 누적 성장 기록을 이어볼 수 있도록, `Enrollment`(반배정)가 "언제, 어느 아이가, 어느 반에" 속하는지를 표현하는 N:M 연결 역할을 합니다.

**관찰일지(Observation)**도 `Child`에 직접 연결되어, 반이 바뀌어도 아이 기준으로 기록이 이어집니다.

**활동계획안(ActivityPlan)**은 완전 정규화 + `rawJson` 안전망. 검색·통계가 핵심이라 정규화가 필수이고, 파싱 원본을 보존해 알고리즘 개선 시 재파싱 없이 재처리 가능합니다.

자세한 설계 의도와 진행 상황은 `PROJECT.md`를 참고하세요.

## 프로젝트 구조

```
teachersDrawer
├── backend                  # Spring Boot 애플리케이션
│   └── src/main/java/com/teachersdrawer/backend
│       ├── domain
│       │   ├── auth           # 인증 (회원가입/로그인/JWT/RefreshToken)
│       │   ├── school         # 학교 정보 조회 (NEIS / 유치원알리미)
│       │   ├── child          # 아이 CRUD
│       │   ├── classroom      # 반 CRUD + 아카이브
│       │   ├── enrollment     # 반배정 CRUD
│       │   └── activityPlan   # 활동계획안 자동 분석·저장
│       └── global
│           ├── config         # SecurityConfig, CorsConfig
│           ├── exception      # BusinessException, ErrorCode, GlobalExceptionHandler
│           ├── response       # ApiResponse<T>
│           └── security       # JwtFilter, JwtUtil, CustomUserDetails
├── frontend                 # React + Vite 애플리케이션
│   └── src
│       ├── api                # axios instance, API clients
│       ├── components         # 공통 컴포넌트 (Layout, activityPlan 등)
│       ├── lib/hwp            # @rhwp/core 기반 HWP 파싱 모듈
│       ├── pages              # dashboard, activityPlan, children, auth
│       ├── store              # Zustand authStore
│       └── types
├── samples/hwp              # 검증용 HWP 샘플
├── mydocs                   # 기획·작업 지시서·연구 보고서
├── docker-compose.yml
├── PROJECT.md
└── README.md
```

## 시작하기

### 사전 요구사항
- JDK 21
- Node.js 20+
- Docker / Docker Compose

### 인프라 실행
```bash
docker-compose up -d
```
- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`, Console: `localhost:9001`

### 백엔드 실행
```bash
cd backend
./gradlew bootRun
```
Backend: http://localhost:8080

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## 환경 설정 주의

`application.yml`에 DB 접속 정보, JWT secret, MinIO 인증 정보, 외부 API 키가 포함되어 있습니다. 운영 환경에서는 환경 변수 또는 별도 설정 파일로 분리하고, 현재 노출된 키와 시크릿은 반드시 재발급 후 교체해야 합니다. Refresh Token 쿠키는 운영 환경에서 `Secure` 플래그를 활성화(HTTPS)해야 합니다.
