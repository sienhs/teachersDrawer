# 선생님의 서랍 (Teachers Drawer)

유치원·초중고 선생님을 위한 학급 관리 웹 서비스.
아이별 관찰일지, 체크리스트, 활동계획안 아카이브, 연도별 반 관리를 제공한다.

> **목표 전환 (2026-05-29)**
> 당초 개인용 도구로 시작했으나, **배포–상용화–런칭**을 전제로 한 서비스로 목표를 확장.
> 모든 설계는 "혼자 쓰는 도구"가 아니라 "여러 선생님이 가입해 쓰는 멀티유저 서비스" 기준으로 잡는다.
> 단, 과도한 선반영은 지양하고 "나중에 유연하게 확장 가능한 구조"를 우선한다.

---

## 1. 제품 방향

- **1차 타깃: 유치원 교사 전용**으로 맞춤 제작. 초중고는 구조만 열어두고 후순위.
- 유치원 전용 기능 / 초중고 전용 기능을 구분해 파악 (추후 분기).
- 핵심 가치: 선생님의 반복 업무(관찰 기록, 활동계획안 정리, 연도별 인수인계)를 덜어준다.
- 개인화 톤(꿈열매유치원 등)은 브랜딩 옵션으로 남기되, 기본은 범용 서비스.

### 향후 기능 아이디어 (백로그)
- 통합 검색 기능 (아이/일지/활동계획안 across)
- 처음 반 생성 시 데이터 일괄 불러오기
- 업로드한 파일을 분석해 과거 일자 기록을 모두 추출·저장
- 기존 반의 템플릿 불러오기 (반 복사)
- 선생님별 자주 쓰는 관찰 문구 모음 (직접 추가 가능)
- 과거 반은 읽기 전용으로 아카이브화
- 파일 이동 및 모아보기
- **관찰일지: 외부 전용 앱(키즈노트 등)과의 연동 가능성 고려** (필수 아님, 구조만 유연하게)
- **선생님 간 데이터 인계** (현직장 인증 기반): 진급·이직 시 아이 기록을 다음 담임에게 양도/공유. 무거운 "원(Kindergarten) 소유" 모델 없이도 개인 도구끼리 데이터를 주고받는 가벼운 방식.
- **에러 메시지 정보 노출 최소화**: 운영 단계에서는 FORBIDDEN(403) 대신 NOT_FOUND(404)로 통일해 id 존재 여부조차 숨기는 방안 검토.

---

## 2. 기술 스택

### Backend
- Java 21 (Temurin), Spring Boot 4.0.6, Gradle 9.4.1
- Spring Security 6 + JWT (jjwt 0.12.6)
- JPA (Hibernate) + QueryDSL 5.1.0:jakarta
- PostgreSQL 16
- MinIO (파일 스토리지, Phase 3)
- 외부 API: 나이스 OpenAPI(초중고), 유치원알리미 OpenAPI(유치원)

### Frontend
- React + Vite + TypeScript
- Tailwind CSS v4
- Zustand (인증 상태), Axios, React Router DOM
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍 부드러운 UI
- 작성 도구: Claude Code (VSCode)

### Infra
- Docker Compose (PostgreSQL + MinIO)
- 배포 목표: AWS (Phase 5)

### 인증 설계
- Access Token: 메모리(Zustand)에만 보관, 새로고침 시 소멸
- Refresh Token: HttpOnly Cookie (7일) + DB(refresh_token) 저장
- 앱 마운트 시 reissue로 자동 복구
- **CustomUserDetails**: 우리 User 엔티티를 래핑한 UserDetails 구현체. `SecurityContext`에 User 정보(id 포함)가 담겨, 컨트롤러에서 `@AuthenticationPrincipal CustomUserDetails`로 DB 재조회 없이 현재 유저 id 사용.
- CORS 화이트리스트, HTTPS(운영), 파일 UUID 리네이밍

---

## 3. 데이터 모델 (핵심 설계)

### 엔티티 관계

```
User (선생님)
  ├─ Child (아이) ───────────── 선생님이 관리하는 아이, 독립 엔티티
  ├─ Classroom (반) ─────────── 연도별 반
  ├─ Enrollment (반배정) ────── Child ↔ Classroom (N:M 연결)
  └─ Observation (관찰일지) ─── Child에 직접 연결
```

### 설계 의도

**아이는 반에 종속되지 않고 독립적으로 존재한다.**
이유: 유치원은 매년 원아가 바뀌지만, 동일 교사가 진급(순환보직)으로 같은 아이를 여러 해 연속 맡는 경우가 있다. 이때 한 아이의 누적 성장 기록을 연도에 걸쳐 이어볼 수 있어야 한다.

- `Child`는 선생님 소유의 독립 레코드.
- `Classroom`은 연도(year) 단위로 구분. 같은 이름이라도 연도가 다르면 별개 레코드. `status`로 ACTIVE(편집 가능) / ARCHIVED(읽기 전용) 구분.
- `Enrollment`가 "언제, 어느 아이가, 어느 반에" 속하는지를 표현 (N:M 해소).
- `Observation`은 **Child에 직접** 연결 → 반이 바뀌어도 아이 기준으로 기록이 연속됨. `classroomId`는 참고용으로 함께 보관.

### 엔티티 필드 (현재 구현 상태)

```
Child  ✅ 구현
  id, user(FK), name, birthDate, gender,
  status (ENROLLED | GRADUATED | WITHDRAWN),
  memo, createdAt, updatedAt

Classroom  ✅ 구현
  id, user(FK), year, name,
  status (ACTIVE | ARCHIVED),
  createdAt, updatedAt
  - archive() / activate() / isArchived() 도메인 메서드

Enrollment  ⏳ 예정
  id, childId, classroomId, year, createdAt

Observation  ⏳ 예정
  id, childId, classroomId(참고용), date, content,
  source (SELF | EXTERNAL),
  externalId (nullable),
  createdAt, updatedAt
```

> **외부 연동 대비**: `Observation.source` / `externalId` 두 칸을 미리 비워둔다.
> 지금은 전부 `SELF`로만 사용. 추후 외부 앱 연동 시 스키마 변경 없이 매핑 가능.

> **아카이브**: `Classroom.status = ARCHIVED`면 수정·삭제 차단(`ARCHIVED_CLASSROOM` 에러). 복구(activate) 후에야 가능.
> **반 복사/템플릿**(Phase 4): 기존 반의 Enrollment(아이 명단)·설정을 새 연도 Classroom으로 복제.

### 멀티유저 격리 패턴

모든 도메인 Service는 다음 패턴으로 통일:

```java
// 1) 소유권 검증 헬퍼
private Child findOwnedChild(Long userId, Long childId) {
    Child child = repo.findById(childId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
    if (!child.getUser().getId().equals(userId))
        throw new BusinessException(FORBIDDEN);
    return child;
}

// 2) 상태 검증 헬퍼 (Classroom만 해당)
private void validateNotArchived(Classroom c) {
    if (c.isArchived()) throw new BusinessException(ARCHIVED_CLASSROOM);
}
```

---

## 4. 개발 Phase 로드맵

| Phase | 시작 | 종료 | 작업 내용 | 상태 |
|-------|------|------|-----------|------|
| **1** | 2026.05.26 | 2026.05.28 | Docker 환경 / Spring Security+JWT 인증 / 학교·유치원 검색 API(나이스+유치원알리미) / 회원가입 학교 연동 / React 인증 흐름 | ✅ 완료 |
| **2** | 2026.05.29 | — | 반·아이·반배정 CRUD / 관찰일지 작성·조회 및 표 정리보기 / 아이별 타임라인 / 메인 캘린더 / 아카이브 기능 | 🔄 진행중 |
| **3** | — | — | 파일 업로드 API(MinIO) / rhwp 뷰어 임베드 / 체크리스트 / 업로드 파일 분석해 과거 일자 추출·저장 | ⏳ 대기 |
| **4** | — | — | 반 복사·템플릿 기능 / 자주 쓰는 관찰 문구 모음 / 통합 검색 / 파일 이동·모아보기 / 모바일 최적화 | ⏳ 대기 |
| **5** | — | — | AWS 배포 / 운영 환경 구성(HTTPS, 도메인, CI) / 선생님 간 인계 기능 | ⏳ 대기 |

### Phase 1 완료 내역 (2026.05.26 ~ 05.28)
- Docker Compose (PostgreSQL 16 + MinIO)
- Spring Boot 4.0.6 셋업 (-parameters, QueryDSL 경로, Lombok)
- User / RefreshToken 엔티티, 회원가입·로그인·재발급·로그아웃
- Spring Security 6 + JwtFilter + CORS + BCrypt
- 학교 검색 API: 나이스(초중고) + 유치원알리미(유치원, 시도/시군구 코드 + 이름 필터)
- 지역 코드 조회 API (시도/시군구, 17개 시도·260개 시군구)
- 회원가입 시 학교 정보(schoolCode/Name/Type) 저장
- React: axios 인스턴스(JWT 자동첨부, 401 reissue 1회·무한반복 방지), Zustand, 라우팅, ProtectedRoute
- 로그인/회원가입 페이지 (토스풍 학교선택 슬라이드 UI, 인증 가드)

### Phase 2 진행 상황 (2026.05.29 ~)
- ✅ **CustomUserDetails 도입**: 인증된 User 엔티티를 SecurityContext에 보관. 컨트롤러에서 `@AuthenticationPrincipal`로 현재 유저 id 즉시 접근 (DB 재조회 없음).
- ✅ **Child CRUD**: 등록·조회·수정·삭제. status(ENROLLED/GRADUATED/WITHDRAWN) 포함. 멀티유저 격리 적용.
- ✅ **Classroom CRUD**: 등록·조회·수정·삭제. 아카이브/복구 액션 엔드포인트 (`POST /{id}/archive`, `/{id}/activate`). ARCHIVED 반은 수정·삭제 차단.
- ⏳ **Enrollment 구현** ← 다음 차례 (Child ↔ Classroom 연결)
- ⏳ Observation(관찰일지) 작성·조회
- ⏳ 아이별 타임라인 + 표 정리보기
- ⏳ 메인 페이지 캘린더

### Phase 2에서 알게 된 설계 메모
- `CustomUserDetails.getId()`로 현재 유저를 가져오면 Service에서 또 `userRepository.findById()`를 호출할 필요가 없다. 현재는 명확성을 위해 재조회하고 있으나, N+1/성능 정리 시점에 캐싱·프록시 참조로 최적화 예정.
- 액션성 엔드포인트(`/archive`, `/activate`)는 `PATCH` 단일 엔드포인트보다 명확함. 의도가 코드에 드러나는 게 유지보수에 유리.
- ErrorCode는 도메인별로 분리하기 시작(`CHILD_NOT_FOUND`, `CLASSROOM_NOT_FOUND`, `ARCHIVED_CLASSROOM`). 사용자에게 보이는 메시지의 친절도가 올라감.

---

## 5. 현재 구현된 API 엔드포인트

### 인증 (`/api/auth/**`) — 공개
- `POST /api/auth/signup` — 회원가입 (학교 정보 옵션)
- `POST /api/auth/login` — 로그인 (Access 본문, Refresh Cookie)
- `POST /api/auth/reissue` — Access Token 재발급 (Refresh Cookie 필요)
- `POST /api/auth/logout` — 로그아웃 (Cookie 만료)

### 학교/유치원 (`/api/schools/**`) — 공개 (회원가입 전 호출용)
- `GET /api/schools/regions` — 시도 목록
- `GET /api/schools/regions/{sidoCode}` — 시군구 목록 (가나다순)
- `GET /api/schools/search?name=` — 초중고 검색 (나이스)
- `GET /api/schools/kindergartens?sidoCode=&sggCode=&name=` — 유치원 검색 (유치원알리미)

### 아이 (`/api/children/**`) — 인증 필수
- `POST /api/children` — 아이 등록
- `GET /api/children` — 내 아이 목록
- `GET /api/children/{childId}` — 아이 단건 조회
- `PUT /api/children/{childId}` — 아이 정보 수정 (status 포함)
- `DELETE /api/children/{childId}` — 아이 삭제

### 반 (`/api/classrooms/**`) — 인증 필수
- `POST /api/classrooms` — 반 생성 (year + name)
- `GET /api/classrooms` — 내 반 목록 (연도 내림차순)
- `GET /api/classrooms?status=ACTIVE|ARCHIVED` — 상태별 조회
- `GET /api/classrooms/{classroomId}` — 반 단건 조회
- `PUT /api/classrooms/{classroomId}` — 반 이름 수정 (ARCHIVED는 차단)
- `POST /api/classrooms/{classroomId}/archive` — 반 아카이브
- `POST /api/classrooms/{classroomId}/activate` — 반 복구
- `DELETE /api/classrooms/{classroomId}` — 반 삭제 (ARCHIVED는 차단)

---

## 6. 환경 & 운영 메모

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs` 계정, `main` 브랜치
- IDE: 백엔드 STS, 프론트 VSCode + Claude Code, API 테스트 Thunder Client

### 알려진 환경 이슈 / 교훈
- **STS 자체 컴파일러가 `-parameters` 무시** → `@RequestParam`/`@PathVariable`/`@Qualifier`에 이름 명시 필수.
- **`ddl-auto: create`는 재시작마다 테이블 초기화** → 개발 중 Refresh Token 등 데이터 소실. 안정화 후 `update`로 전환 검토.
- **유치원알리미 API**: 이름 검색 불가. `sidoCode`+`sggCode`+`currentPage=1` 필수(없으면 빈 결과). 백엔드에서 이름 필터링.
- **`@RequiredArgsConstructor`에서 `final` 누락 시 NPE** → 의존성 주입 필드는 반드시 `final`.
- **`@Builder` 사용 시 기본값** → 필드에 `= "기본값"` 만으론 빌더에서 무시됨. `@Builder.Default` 필수.
- 작업 단위마다 **Git 커밋 습관화** (파일 유실 경험 있음).
