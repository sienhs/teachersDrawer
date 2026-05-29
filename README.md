# teachersDrawer (선생님의 서랍)

유치원 / 초중고 교사를 위한 업무 관리 웹 서비스. HWP 활동계획안 보관, 학교 정보 조회, 반·아이 관리, 관찰일지 등 흩어진 교사 업무를 한 곳에서 관리하는 것을 목표로 합니다.

> 본 프로젝트는 현재 개발 진행 중인 미공개(비공개) 프로젝트입니다. 인증·학교 정보 조회·아이/반 관리 기능이 구현되어 있으며, 핵심 기능은 계속 추가되고 있습니다. 문서에 기재된 API와 구조는 개발 진행에 따라 변경될 수 있습니다.

## 기술 스택

### Backend
- Java 21
- Spring Boot 4.0.x
- Spring Security + JWT (jjwt 0.12.6)
- Spring Data JPA
- QueryDSL 5.1.0 (jakarta)
- PostgreSQL 16
- MinIO (파일 스토리지)
- Lombok
- Gradle

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router 7
- Zustand (상태 관리)
- Axios

### Infra
- Docker / Docker Compose (PostgreSQL, MinIO)
- 외부 연동: NEIS 교육정보 API, 유치원알리미(e-childschoolinfo) API

## API 구조 흐름

전체 요청은 다음과 같은 계층을 거칩니다.

```
Client (axios)
  → SecurityFilterChain (JwtFilter)
  → Controller (요청 검증 / 응답 래핑)
  → Service (비즈니스 로직 / 트랜잭션)
  → Repository (JPA) · 외부 API Client
  → DB(PostgreSQL) · NEIS / 유치원알리미
```

모든 응답은 `ApiResponse<T>` 한 가지 포맷으로 통일되며, 구조는 `{ success, message, data }` 입니다. 예외는 `GlobalExceptionHandler`가 잡아 동일 포맷으로 변환합니다.

### 1. 인증 흐름 (Spring Security + JWT)

요청이 들어오면 `UsernamePasswordAuthenticationFilter` 앞에 등록된 `JwtFilter`가 먼저 동작합니다.

1. `JwtFilter`가 `Authorization: Bearer <token>` 헤더에서 Access Token을 추출합니다.
2. `JwtUtil.isTokenValid()`로 서명과 만료를 검증하고, 유효하면 토큰에서 이메일(subject)을 꺼냅니다.
3. 이메일로 `UserDetailsService`(=`CustomUserDetailService`)를 통해 `CustomUserDetails`를 조회하고, `UsernamePasswordAuthenticationToken`을 만들어 `SecurityContextHolder`에 저장합니다.
4. 이후 컨트롤러는 `@AuthenticationPrincipal CustomUserDetails`로 현재 사용자 정보(id 포함)에 즉시 접근합니다.

세션은 `STATELESS`로 설정되어 사용하지 않으며, CSRF / formLogin / httpBasic은 모두 비활성화되어 있습니다. `/api/auth/**`, `/api/schools/**`는 인증 없이 접근 가능하고 나머지(`/api/children/**`, `/api/classrooms/**` 등)는 모두 인증이 필요합니다.

#### CustomUserDetails

`CustomUserDetails`는 우리 `User` 엔티티를 그대로 감싸는 `UserDetails` 구현체입니다. Spring 내장 `User`는 이메일·비밀번호만 들고 있어 매 요청마다 DB 재조회가 필요했습니다. `CustomUserDetails`는 우리 `User` 엔티티 전체를 SecurityContext에 보관하여, 컨트롤러에서 `userDetails.getId()`로 현재 로그인 사용자의 id를 즉시 사용할 수 있도록 합니다.

### 2. 토큰 정책

- Access Token: 응답 바디(`ApiResponse.data.accessToken`)로 전달, 클라이언트 메모리에서 관리 (만료 15분)
- Refresh Token: `HttpOnly` 쿠키(`refresh_token`)로 전달하여 JS 접근을 차단, XSS 토큰 탈취를 방지 (만료 7일)
- Refresh Token은 DB(`RefreshToken`)에도 저장되어, 재발급 시 저장된 토큰과 대조해 탈취 여부를 검증합니다.
- 토큰 서명은 HS256(HMAC-SHA256) 방식을 사용합니다.

### 3. 인증 API (`/api/auth`)

| Method | Endpoint | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 (이메일 중복 검사, 비밀번호 BCrypt 암호화, 학교 정보 옵션) | 불필요 |
| POST | `/api/auth/login` | 로그인. Access Token은 바디, Refresh Token은 HttpOnly 쿠키로 발급 | 불필요 |
| POST | `/api/auth/reissue` | 쿠키의 Refresh Token으로 Access Token 재발급 | 불필요(쿠키) |
| POST | `/api/auth/logout` | Refresh Token 쿠키 만료 처리 | 불필요(쿠키) |

회원가입 시 비밀번호는 `@Pattern`으로 영문·숫자·특수문자 각 1개 이상, 8자 이상을 강제합니다. 학교 정보(코드/이름/유형)는 선택 입력으로, 가입 후 등록할 수 있습니다.

### 4. 학교 정보 API (`/api/schools`)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/schools/search?name=` | 초·중·고 검색 (NEIS API) |
| GET | `/api/schools/kindergartens?sidoCode=&sggCode=&name=` | 유치원 검색 (유치원알리미 API) |
| GET | `/api/schools/regions` | 시도 목록 조회 |
| GET | `/api/schools/regions/{sidoCode}` | 해당 시도의 시군구 목록 조회 (가나다순) |

`SchoolService`가 `NeisClient` / `KinderClient`를 통해 외부 교육 API를 호출하며, 시도·시군구 코드는 `RegionData`(`region_codes.json` 기반, 17개 시도·260개 시군구)로 제공합니다.

### 5. 아이 API (`/api/children`) — 인증 필수

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/children` | 아이 등록 (name 필수, birthDate/gender/memo 옵션) |
| GET | `/api/children` | 내 아이 목록 조회 |
| GET | `/api/children/{childId}` | 아이 단건 조회 |
| PUT | `/api/children/{childId}` | 아이 정보 수정 (status 변경 포함: ENROLLED/GRADUATED/WITHDRAWN) |
| DELETE | `/api/children/{childId}` | 아이 삭제 |

`Child`는 선생님이 소유한 독립 엔티티로, 연도가 바뀌어도 같은 인물로 유지됩니다. 모든 조회·수정·삭제는 `userId` 기반으로 격리되어, 남의 아이 id를 알아도 접근할 수 없습니다(`FORBIDDEN`).

### 6. 반 API (`/api/classrooms`) — 인증 필수

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/api/classrooms` | 반 생성 (year + name) |
| GET | `/api/classrooms` | 내 반 전체 목록 (연도 내림차순) |
| GET | `/api/classrooms?status=ACTIVE` | 현재 운영 중인 반만 조회 |
| GET | `/api/classrooms?status=ARCHIVED` | 아카이브된 반만 조회 |
| GET | `/api/classrooms/{classroomId}` | 반 단건 조회 |
| PUT | `/api/classrooms/{classroomId}` | 반 이름 수정 (ARCHIVED는 차단) |
| POST | `/api/classrooms/{classroomId}/archive` | 반 아카이브 (학년 마치고 보관) |
| POST | `/api/classrooms/{classroomId}/activate` | 아카이브된 반 복구 |
| DELETE | `/api/classrooms/{classroomId}` | 반 삭제 (ARCHIVED는 차단, 복구 후 가능) |

`Classroom`은 연도(year) 단위로 구분됩니다. 같은 이름의 반이라도 연도가 다르면 별개 레코드입니다. `status` 필드로 ACTIVE(현재, 편집 가능)와 ARCHIVED(과거, 읽기 전용)를 구분합니다. ARCHIVED 상태인 반은 수정·삭제가 차단(`ARCHIVED_CLASSROOM`)되며, 복구(activate) 후에야 가능합니다.

## 데이터 모델

```
User (선생님)
  ├─ Child (아이) ───────────── 선생님이 관리하는 아이, 독립 엔티티
  ├─ Classroom (반) ─────────── 연도별 반 (ACTIVE / ARCHIVED)
  ├─ Enrollment (반배정) ────── Child ↔ Classroom (N:M) — 예정
  └─ Observation (관찰일지) ─── Child에 직접 연결 — 예정
```

**아이(Child)는 반(Classroom)에 종속되지 않습니다.** 유치원에서는 진급·순환보직으로 동일 교사가 같은 아이를 여러 해 연속 맡는 경우가 있으며, 이때 한 아이의 누적 성장 기록을 연도에 걸쳐 이어볼 수 있어야 합니다. 이를 위해 `Enrollment`(반배정) 엔티티가 "언제, 어느 아이가, 어느 반에" 속하는지를 표현하는 N:M 연결 역할을 합니다.

`Observation`(관찰일지)은 `Child`에 직접 연결되어, 반이 바뀌어도 아이 기준으로 기록이 이어집니다. `classroomId`는 참고용으로 함께 보관합니다.

자세한 설계 의도와 진행 상황은 `PROJECT.md`를 참고하세요.

## 프로젝트 구조

```
teachersDrawer
├── backend          # Spring Boot 애플리케이션
│   └── src/main/java/com/teachersdrawer/backend
│       ├── domain
│       │   ├── auth         # 인증 (회원가입/로그인/JWT/RefreshToken)
│       │   ├── school       # 학교 정보 조회 (NEIS / 유치원알리미)
│       │   ├── child        # 아이(Child) CRUD
│       │   └── classroom    # 반(Classroom) CRUD + 아카이브
│       └── global           # 공통 영역
│           ├── config        # SecurityConfig, CorsConfig, DataInitializer
│           ├── exception     # BusinessException, ErrorCode, GlobalExceptionHandler
│           ├── response      # ApiResponse<T>
│           └── security      # JwtFilter, JwtUtil, CustomUserDetails
├── frontend         # React + Vite 애플리케이션
│   └── src
│       ├── api          # axios instance, auth/school API
│       ├── components   # ProtectedRoute 등 공통 컴포넌트
│       ├── pages        # auth(login/signup), home
│       ├── store        # Zustand authStore
│       └── types        # 타입 정의
├── docker-compose.yml   # PostgreSQL, MinIO 컨테이너
├── PROJECT.md           # 기획·설계·로드맵 문서
└── README.md
```

각 도메인 패키지는 `controller/ · dto/ · entity/ · repository/ · service/`의 동일한 레이어 구조를 따릅니다.

## 시작하기

### 사전 요구사항
- JDK 21
- Node.js
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
- Backend: http://localhost:8080

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
- Frontend: http://localhost:5173

## 환경 설정 주의

`application.yml`에 DB 접속 정보, JWT secret, MinIO 인증 정보, 외부 API 키가 포함되어 있습니다. 운영 환경에서는 환경 변수 또는 별도 설정 파일로 분리하고, 현재 노출된 키와 시크릿은 반드시 재발급 후 교체해야 합니다. 또한 로그인 시 발급되는 Refresh Token 쿠키는 운영 환경에서 `Secure` 플래그를 활성화(HTTPS)해야 합니다.
