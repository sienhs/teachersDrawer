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
- `Classroom`은 연도(year) 단위로 구분. 같은 이름이라도 연도가 다르면 별개 레코드.
- `Enrollment`가 "언제, 어느 아이가, 어느 반에" 속하는지를 표현 (N:M 해소).
- `Observation`은 **Child에 직접** 연결 → 반이 바뀌어도 아이 기준으로 기록이 연속됨. `classroomId`는 참고용으로 함께 보관.

### 엔티티 필드 (초안)

```
Child
  id, userId(소유 교사), name, birthDate, gender, memo,
  createdAt, updatedAt

Classroom
  id, userId, year, name,
  status (ACTIVE | ARCHIVED),   # 현재반 / 과거반(읽기전용)
  createdAt, updatedAt

Enrollment
  id, childId, classroomId, year,
  createdAt

Observation
  id, childId, classroomId(참고용), date, content,
  source (SELF | EXTERNAL),     # 자체작성 / 외부앱 연동
  externalId (nullable),        # 외부 앱 기록 매핑용
  createdAt, updatedAt
```

> **외부 연동 대비**: `Observation.source` / `externalId` 두 칸을 미리 비워둔다.
> 지금은 전부 `SELF`로만 사용. 추후 외부 앱 연동 시 스키마 변경 없이 매핑 가능.

> **아카이브**: `Classroom.status = ARCHIVED`면 해당 반과 그 일지는 읽기 전용.
> **반 복사/템플릿**(Phase 4): 기존 반의 Enrollment(아이 명단)·설정을 새 연도 Classroom으로 복제.

---

## 4. 개발 Phase 로드맵

| Phase | 시작 | 종료 | 작업 내용 | 상태 |
|-------|------|------|-----------|------|
| **1** | 2026.05.26 | 2026.05.28 | Docker 환경 / Spring Security+JWT 인증 / 학교·유치원 검색 API(나이스+유치원알리미) / 회원가입 학교 연동 / React 인증 흐름 | ✅ 완료 |
| **2** | 2026.05.29 | — | 반(Classroom)·아이(Child)·반배정(Enrollment) CRUD / 관찰일지 작성·조회 및 표 정리보기 / 아이별 타임라인 / 메인 캘린더 / 아카이브 기능 | 🔄 진행중 |
| **3** | — | — | 파일 업로드 API(MinIO) / rhwp 뷰어 임베드 / 체크리스트 / 업로드 파일 분석해 과거 일자 추출·저장 | ⏳ 대기 |
| **4** | — | — | 반 복사·템플릿 기능 / 자주 쓰는 관찰 문구 모음 / 통합 검색 / 파일 이동·모아보기 / 모바일 최적화 | ⏳ 대기 |
| **5** | — | — | AWS 배포 / 운영 환경 구성(HTTPS, 도메인, CI) | ⏳ 대기 |

### Phase 1 실제 완료 내역
- Docker Compose (PostgreSQL 16 + MinIO)
- Spring Boot 4.0.6 프로젝트 셋업 (-parameters, QueryDSL 경로 등)
- User / RefreshToken 엔티티, 회원가입·로그인·재발급·로그아웃
- Spring Security 6 + JWT 필터, CORS, BCrypt
- 학교 검색 API: 나이스(초중고) + 유치원알리미(유치원, 시도/시군구 코드 기반 + 이름 필터)
- 지역 코드 조회 API (시도/시군구, region_codes.json 260개 시군구)
- 회원가입 시 학교 정보(schoolCode/Name/Type) 저장
- React: axios 인스턴스(JWT 자동첨부, 401 reissue 1회), Zustand, 라우팅, ProtectedRoute
- 로그인/회원가입 페이지 (토스풍 학교선택 슬라이드 UI, 인증 가드)

### Phase 2 진행 순서 (예정)
1. **Child / Classroom / Enrollment 엔티티 + CRUD** ← 현재 지점
2. 관찰일지(Observation) 작성·조회
3. 아이별 타임라인 + 표 정리보기
4. 메인 페이지 캘린더
5. 아카이브(과거 반 읽기전용)

---

## 5. 환경 & 운영 메모

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `docker-compose.yml`
- GitHub: `sienhs` 계정, `main` 브랜치
- IDE: 백엔드 STS, 프론트 VSCode + Claude Code, API 테스트 Thunder Client

### 알려진 환경 이슈 / 교훈
- **STS 자체 컴파일러가 `-parameters` 무시** → `@RequestParam`/`@PathVariable`/`@Qualifier`에 이름 명시 필수.
- **`ddl-auto: create`는 재시작마다 테이블 초기화** → 개발 중 Refresh Token 등 데이터 소실. 안정화 후 `update`로 전환 검토.
- **유치원알리미 API**: 이름 검색 불가. `sidoCode`+`sggCode`+`currentPage=1` 필수(없으면 빈 결과). 백엔드에서 이름 필터링.
- 작업 단위마다 **Git 커밋 습관화** (파일 유실 경험 있음).
