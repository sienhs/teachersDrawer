# teachersDrawer (선생님의 서랍)

유치원 / 초중고 교사를 위한 업무 관리 웹 서비스. HWP 활동계획안 보관, 학교 정보 조회 등 흩어진 교사 업무를 한 곳에서 관리하는 것을 목표로 합니다.

> 본 프로젝트는 현재 개발 진행 중인 미공개(비공개) 프로젝트입니다. 인증과 학교 정보 조회 기능이 구현되어 있으며, 핵심 기능은 계속 추가되고 있습니다. 문서에 기재된 API와 구조는 개발 진행에 따라 변경될 수 있습니다.

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
3. 이메일로 `UserDetailsService`(=`CustomUserDetailService`)를 통해 사용자를 조회하고, `UsernamePasswordAuthenticationToken`을 만들어 `SecurityContextHolder`에 저장합니다.
4. 이후 컨트롤러는 인증된 사용자 기준으로 동작합니다.

세션은 `STATELESS`로 설정되어 사용하지 않으며, CSRF / formLogin / httpBasic은 모두 비활성화되어 있습니다. `/api/auth/**`, `/api/schools/**`는 인증 없이 접근 가능하고 나머지는 모두 인증이 필요합니다.

### 2. 토큰 정책

- Access Token: 응답 바디(`ApiResponse.data.accessToken`)로 전달, 클라이언트 메모리에서 관리 (만료 15분)
- Refresh Token: `HttpOnly` 쿠키(`refresh_token`)로 전달하여 JS 접근을 차단, XSS 토큰 탈취를 방지 (만료 7일)
- Refresh Token은 DB(`RefreshToken`)에도 저장되어, 재발급 시 저장된 토큰과 대조해 탈취 여부를 검증합니다.
- 토큰 서명은 HS256(HMAC-SHA256) 방식을 사용합니다.

### 3. 인증 API (`/api/auth`)

| Method | Endpoint | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 (이메일 중복 검사, 비밀번호 BCrypt 암호화) | 불필요 |
| POST | `/api/auth/login` | 로그인. Access Token은 바디, Refresh Token은 HttpOnly 쿠키로 발급 | 불필요 |
| POST | `/api/auth/reissue` | 쿠키의 Refresh Token으로 Access Token 재발급 | 불필요(쿠키) |
| POST | `/api/auth/logout` | Refresh Token 쿠키 만료 처리 | 불필요(쿠키) |

회원가입 시 비밀번호는 `@Pattern`으로 영문·숫자·특수문자 각 1개 이상, 8자 이상을 강제합니다. 학교 정보(코드/이름/유형)는 선택 입력으로, 가입 후 등록할 수 있습니다.

로그인 흐름:
1. `AuthController.login()`이 `@Valid LoginRequest`로 이메일·비밀번호 형식을 검증합니다.
2. `AuthService.login()`이 이메일로 사용자를 조회하고 `passwordEncoder.matches()`로 BCrypt 해시를 검증합니다.
3. Access / Refresh Token을 생성하고, Refresh Token은 DB에 저장(있으면 갱신, 없으면 생성)합니다.
4. 컨트롤러가 Refresh Token을 HttpOnly 쿠키에 담고, Access Token만 바디에 담아 반환합니다.

### 4. 학교 정보 API (`/api/schools`)

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/schools/search?name=` | 초·중·고 검색 (NEIS API) |
| GET | `/api/schools/kindergartens?sidoCode=&sggCode=&name=` | 유치원 검색 (유치원알리미 API) |
| GET | `/api/schools/regions` | 시도 목록 조회 |
| GET | `/api/schools/regions/{sidoCode}` | 해당 시도의 시군구 목록 조회 |

`SchoolService`가 `NeisClient` / `KinderClient`를 통해 외부 교육 API를 호출하며, 시도·시군구 코드는 `RegionData`(`region_codes.json` 기반)로 제공합니다.

## 프로젝트 구조

```
teachersDrawer
├── backend          # Spring Boot 애플리케이션
│   └── src/main/java/com/teachersdrawer/backend
│       ├── domain
│       │   ├── auth      # 인증 (회원가입/로그인/JWT/RefreshToken)
│       │   │   ├── controller
│       │   │   ├── dto
│       │   │   ├── entity
│       │   │   ├── repository
│       │   │   └── service
│       │   └── school    # 학교 정보 조회 (NEIS / 유치원알리미)
│       │       ├── controller
│       │       ├── dto
│       │       └── service
│       └── global        # 공통 영역
│           ├── config        # SecurityConfig, CorsConfig, DataInitializer
│           ├── exception     # BusinessException, ErrorCode, GlobalExceptionHandler
│           ├── response      # ApiResponse<T>
│           └── security      # JwtFilter, JwtUtil
├── frontend         # React + Vite 애플리케이션
│   └── src
│       ├── api          # axios instance, auth/school API
│       ├── components   # ProtectedRoute 등 공통 컴포넌트
│       ├── pages        # auth(login/signup), home
│       ├── store        # Zustand authStore
│       └── types        # 타입 정의
└── docker-compose.yml   # PostgreSQL, MinIO 컨테이너
```

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
