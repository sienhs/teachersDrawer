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
- 통합 검색 (아이/일지/활동계획안 across) — 검색바 placeholder 자리 마련됨
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
- 반 관리 페이지 (현재 사이드바 "준비 중")

### UX
- 자동 매칭된 아이의 자동 재매칭 (아이 신규 등록 시 기존 ActivityPlan의 MontessoriRecord 다시 연결)
- 모바일 최적화

### 운영
- MinIO orphan 파일 정리 (DB 직접 삭제 시 객체 남음, cleanup job)
- ddl-auto: create → update 전환 (안정화 시점)
- 운영 환경: HTTPS, Refresh Token Secure 플래그, 환경변수 분리, 시크릿 재발급

### 리팩토링
- Enroll 시 연도 정합성 정책 (아이/반 연도 불일치 경고 여부)

### rhwp 관련 (Phase 3에서 발견)
- rhwp 결제란 셀 병합 렌더링 버그 (upstream 모니터링)
- rhwp "일일놀이실행안" 제목 미표시 (upstream 모니터링)
- rhwp 중첩 표 내 행 추가/삭제 시 부모 표 영향

### 완료된 백로그 (참고)
- ✅ FORBIDDEN→NOT_FOUND 통일 (묶음 2-K 작업으로 자연 해결)
- ✅ 공통 OwnershipValidator (Repository findByIdAndUserId 방식으로 더 단순화)
- ✅ user 재조회 제거 (getReferenceById 적용)
- ✅ 코드 스플리팅 (FullCalendar 분리, 메인 번들 787kB→560kB)
- ✅ PENDING 일괄 처리 API
- ✅ 중복 업로드 경고
- ✅ 활동계획안 편집 후 [정리화면에 반영] (Step 3-E-2-b-4, rhwp/core 완전 통합)
- ✅ @rhwp/core pathJson 형식 발견·구현 (중첩 표 파싱, Step 3-E-2-b-1~b-2)
- ✅ hwp-parser 폐기 + rhwp/core로 분석 통합 (성능 9.5배, Step 3-E-2-b-4)

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
- FullCalendar (월 뷰, lazy load), react-calendar (미니 캘린더)
- react-dropzone (파일 업로드)
- **@rhwp/editor v0.7.13** — iframe 기반 HWP 에디터 (뷰어 + 편집 + Export)
- **@rhwp/core v0.7.13** — 저수준 WASM 파서 (HwpDocument 약 150개 메서드)
- 디자인 톤: 베이지(#FFF8F0) + 주황(#FF9F66), 토스풍
- 작성 도구: Claude Code (VSCode)

### HWP 처리 (Phase 3)
- **(폐기) hwp-parser 컨테이너**: Python 3.12 + FastAPI + pyhwp. Step 3-E-2-b-4에서 rhwp/core로 대체·삭제됨.
- **@rhwp/core** ✅ HWP 분석 주체 (Step 3-E-2-b-4 통합):
  - WASM 기반, 브라우저에서 직접 실행 (init 34ms + load 40ms = 74ms)
  - `extractActivityPlan()`: 꿈열매유치원 양식 → ParsedActivityPlan
  - 일관성 검증 통과: CASE_5_8 92항목 완전 일치 75% / 정규화 일치 21% / 불일치 4% (줄바꿈·null 패턴만)
  - 성능: hwp-parser 712ms → rhwp/core 75ms (9.5배 향상)
  - 보고서: mydocs/research/20260603-rhwp-core-consistency.md
- **rhwp 통합** ✅ Step 3-E-1, ✅ Step 3-E-2:
  - 활동계획안 상세 페이지 우측 사이드 패널 (랜드마크 명세서 스타일)
  - 뷰어 모드: 동작
  - 편집 모드 + 자동 저장: 동작 (3초 polling + 1000포인트 샘플링)
  - [정리화면에 반영]: ✅ 활성화 (rhwp/core로 재파싱 후 analyze API 호출)

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
  - changeStatus(String) 도메인 메서드

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
  area, material, confirmed (@PrePersist로 null→"" 정규화)

Observation  ⏳ 후순위
  id, childId, classroomId(참고), date, content,
  source (SELF | EXTERNAL), externalId(nullable),
  createdAt, updatedAt
```

### 멀티유저 격리 패턴

Repository 레벨에서 처음부터 격리. `findByIdAndUserId` 패턴으로 조회·소유권 검증을 한 쿼리로 처리.

```java
// Repository
Optional<Child> findByIdAndUserId(Long id, Long userId);

// Service
private Child findOwnedChild(Long userId, Long childId) {
    return childRepository.findByIdAndUserId(childId, userId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
}
```

**보안 정책**: 소유자가 다른 경우 FORBIDDEN이 아닌 NOT_FOUND를 던짐. 다른 사용자의 리소스 존재 여부조차 노출하지 않기 위함.

**user 재조회 회피**: FK 저장 전용이라면 `userRepository.getReferenceById(userId)`로 프록시만 사용. 실제 DB 조회 안 함.

```java
public ChildResponse createChild(Long userId, ChildCreateRequest req) {
    User userRef = userRepository.getReferenceById(userId);  // 프록시
    Child child = Child.builder().user(userRef).name(req.getName()).build();
    return ChildResponse.from(childRepository.save(child));
}
```

### 아카이브 상태 검증 (Classroom 전용)

```java
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
| **3** | 2026.05.30~06.03 | HWP 자동 분석 + 자동 등록 + rhwp 임베드 + rhwp/core 통합 | ✅ |
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
- DashboardCalendar (FullCalendar 월 뷰, lazy load)
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

**Step 3-E-2 — rhwp 편집 모드 + 자동 저장 + [정리화면에 반영] ✅** (2026-06-02~06-03)
- 백엔드:
  - PUT /api/activity-plans/{id}/file (MinIO 파일 교체)
  - confirm API에 existingPlanId 지원 (기존 plan 업데이트 모드)
  - sections/montessori deleteBy 메서드 추가
- 프론트:
  - RhwpEmbed에 editable + onChange (polling 방식)
  - RhwpViewerPanel: [편집모드] 토글, 자동 저장
  - AnalysisConfirmModal에 existingPlanId prop
- rhwp onChange 이벤트 없음 → 3초 setInterval + exportHwp 바이트 비교 (1000포인트 샘플링)
- **[정리화면에 반영]**: ✅ Step 3-E-2-b-4에서 활성화 (rhwp/core로 재파싱 → analyze API 호출)

**Step 3-E-2-a — @rhwp/core 탐색 ✅** (2026-06-02)
- @rhwp/core v0.7.13 설치 (HwpDocument 약 150개 메서드)
- /_rhwp-core-test 격리 페이지
- 결과 보고서: mydocs/research/20260602-rhwp-core-exploration.md
- 발견:
  - 초기화 WASM 34ms + HwpDocument 40ms = 74ms
  - 표 구조가 pyhwp와 다름: rhwp/core는 결제란+본문이 통합된 Table 0 (14×9, 35셀), Table 1 (3×2 방과후)
  - 셀 텍스트 추출 완벽: pyhwp와 일치
  - HTML 렌더링: renderPageHtml(0) 107,594자, (1) 43,034자
- → 중첩 표 pathJson 형식 미확인 → Step 3-E-2-b-1에서 해결

**Step 3-E-2-b-1 — pathJson 형식 발견 ✅** (2026-06-03)
- cellIdx=20 (row=6, col=4) 안에 중첩 표 18×4 존재
- 2-레벨 pathJson 형식 확인: `[{controlIndex, cellIndex, cellParaIndex}, {controlIndex, cellIndex, cellParaIndex}]`
- getTableDimensionsByPath / getCellParagraphCountByPath / getTextInCellByPath 동작 검증

**Step 3-E-2-b-2 — rhwp/core 기반 파싱 모듈 ✅** (2026-06-03)
- `frontend/src/lib/hwp/` 디렉토리 신규
  - `extractor.ts`: HwpDocument → ParsedActivityPlan (+ `parseHwpFile()` 헬퍼)
  - `parsers/metaParser.ts`, `sectionsParser.ts`, `montessoriParser.ts`
  - `tableFinder.ts`, `categoryMapper.ts`, `types.ts`
- 꿈열매유치원 양식 전용 (일반화는 Phase 4)
- /_rhwp-core-test 페이지에 "양식 파싱 결과" 섹션 추가

**Step 3-E-2-b-3 — 일관성 검증 ✅** (2026-06-03)
- 검증 UI: `/_rhwp-consistency-test` 신규 페이지 (hwp-parser vs rhwp/core 나란히 비교)
- CASE_5_8.hwp: 92항목 — 완전 일치 69 / 정규화 일치 19 / 불일치 4
  - 불일치 4건: 모두 sections content의 줄바꿈 처리 차이 (내용 동일, 패턴 차이)
  - 정규화 일치 19건: 모두 montessori confirmed의 null vs "" 차이
  - 의미 있는 데이터 불일치 0건
- 보고서: mydocs/research/20260603-rhwp-core-consistency.md
- 판정: rhwp/core 결과 채택, 통합 진행

**Step 3-E-2-b-4 — rhwp/core 완전 통합 + hwp-parser 폐기 ✅** (2026-06-03)
- 삭제: hwp-parser/ 디렉토리, HwpParserClient.java, HwpParseResponse.java, docker-compose hwp-parser 서비스
- 신규: `dto/analyze/FrontendParsedPlan.java` (프론트 파싱 결과 수신 DTO)
- analyze API 변경: multipart에 `file` + `parsed`(JSON Blob) 함께 수신, 백엔드는 자동 매칭·중복 감지만
- MontessoriRecord @PrePersist: confirmed null → "" 정규화
- [정리화면에 반영] 버튼 활성화 (RhwpViewerPanel)

**Step 3 마무리 묶음 1 — 깔끔한 마무리 ✅** (2026-06-03)
- 검색바 disabled 처리 (향후 통합 검색 활성화 대비)
- 사이드바 "반 관리" 준비 중 비활성화 (클릭 자체 불가)
- 중복 업로드 경고 (analyze 응답에 duplicateOfId, 모달 상단 노란 경고박스)
- PENDING 일괄 처리 API (POST /pending/confirm-all, DELETE /pending)

**Step 3 마무리 묶음 2 — 코드 품질 리팩토링 ✅** (2026-06-03)
- Repository findByIdAndUserId 패턴 도입 (OwnershipValidator 대신)
  - DB 쿼리 1번으로 조회 + 소유권 동시 처리
  - 보안상 NOT_FOUND 통일 자동 달성
- getReferenceById로 user 재조회 제거 (FK 전용 시)
- FullCalendar lazy load
  - 메인 번들: 787kB → 560kB (-29%)
  - DashboardCalendar-*.js 227kB 별도 청크 분리

### Phase 3 설계 결정 (요약)
1. 포맷: .hwp + .hwpx 둘 다 지원 (현재 .hwp만 구현, .hwpx는 TODO)
2. 추출 유연성: Phase 3-A 한 양식 → Phase 3+ LLM 하이브리드
3. 아키텍처: Docker Compose 사이드카 (내부망 통신)
4. DB: 완전 정규화 + rawJson 안전망
5. 업로드 흐름: 2단계 (분석 → 팝업 → 확정 시 저장)
6. 자동 등록: 반·아이·Enrollment 모두 자동, 아이는 PENDING으로
7. rhwp 통합: 뷰어 임베드 ✅, 편집 + 자동 저장 ✅, 정리화면 반영 ✅
8. 편집 후 DB 처리: 사용자 명시적 트리거 ([정리화면에 반영]), 자동 저장은 파일만
9. rhwp/core 도입: 완전 통합 완료 (hwp-parser 폐기). Phase 4 추천 에디터에서 본격 확장 예정
10. 멀티유저 격리: Repository findByIdAndUserId 패턴, FORBIDDEN→NOT_FOUND 통일

### Phase 3에서 알게 된 것
- HWP 양식은 글자 사이 공백이 흔함 ("일  시", "학 급 명") → 정규화 후 매칭 필수
- pyhwp의 `_rows()`는 중첩 테이블 행까지 포함 → 직접 자식만 순회 필요
- HWP 결제란 rowspan 병합 셀로 인한 인덱스 오프셋 보정
- 한글 날짜 형식: "2026년 5월 8일 월요일" 정규식 매칭
- **Spring Boot 4.0에서 ClientHttpRequestFactories 제거됨** → SimpleClientHttpRequestFactory 직접 사용
- **MultipartFile은 한 번만 읽힘** → byte[]로 미리 보관해 MinIO·hwp-parser에 재사용
- 활동계획안의 "평가" 칸·몬테소리 "확인" 칸은 보통 비어있음 → 현장에서 디지털 입력 기능 가치 큼
- confirm 단계에서 재파싱 안 함 → sections/montessori를 프론트에서 그대로 전달해 hwp-parser 2중 호출 방지
- **rhwp는 한컴 호환 OK, pyhwp 사양은 통과 못 함** → 편집 후 재분석은 rhwp/core로 해결 (Step 3-E-2-b-4)
- **rhwp onChange 이벤트 없음** → polling 3초 + 1000포인트 샘플링이 debounce 역할 겸함
- **@rhwp/core의 표 구조는 pyhwp와 다름** (결제란이 본문에 통합) → 우리만의 셀 매핑 전략으로 해결
- **JPA getReferenceById**: FK 전용 시 user 재조회 회피 가능 (실제 필드 접근 시 LazyInitializationException 주의)
- **React.lazy + Suspense**: 사용 페이지 한정 라이브러리는 lazy load로 메인 번들 다이어트
- **pathJson은 2-레벨 배열**: `[{controlIndex, cellIndex, cellParaIndex}, {controlIndex, cellIndex, cellParaIndex}]` — 외부 표 진입 후 중첩 표 진입하는 2단계 경로
- **rhwp/core vs pyhwp 일관성**: 줄바꿈 방식·null 처리만 다르고 의미 데이터는 완전 동일 (92항목 검증)
- **analyze API에서 파싱 분리**: 백엔드는 매칭·중복 감지만, 파싱 주체를 프론트로 이동 시 712ms → 75ms
- **@RequestPart + JSON Blob**: `formData.append('parsed', new Blob([JSON.stringify(obj)], {type:'application/json'}))` → Spring `@RequestPart(name="parsed") MyDto` 로 역직렬화

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
- **POST `/pending/confirm-all`** — PENDING 일괄 확정 ✨
- **DELETE `/pending`** — PENDING 일괄 삭제 ✨

### 반 (`/api/classrooms/**`) — 인증 필수
- POST `/`, GET `/?status=`, GET `/{id}`, PUT `/{id}`, DELETE `/{id}`
- POST `/{id}/archive`, POST `/{id}/activate`

### 반배정 (`/api/enrollments/**`) — 인증 필수
- POST `/`, DELETE `/{id}`
- GET `/children/{childId}`, GET `/classrooms/{classroomId}`

### 활동계획안 (`/api/activity-plans/**`) — 인증 필수
- POST `/analyze` (multipart: file + parsed JSON) — 분석만 (DB 저장 X, 중복 감지 시 duplicateOfId/duplicateFileName 포함)
  - `parsed`: 프론트 extractActivityPlan() 결과, Content-Type: application/json
- POST `/confirm` — 사용자 확정 후 저장 (existingPlanId 지원)
- DELETE `/temp?fileKey=` — 거부 시 임시 파일 정리
- GET `/` (?classroomId=, from=, to=) — 목록
- GET `/{planId}` — 상세
- DELETE `/{planId}` — 삭제 (MinIO 파일 동기 삭제)
- GET `/{planId}/file` — 원본 HWP 다운로드
- PUT `/{planId}/file` — 편집 후 파일 교체 (MinIO 덮어쓰기)
- GET `/children/{childId}/montessori` — 아이별 몬테소리 누적 이력

---

## 7. 환경 & 운영

- 루트: `C:\Users\SSAFY\git\teachersDrawer` (집: `C:\Users\jhsun\teachersDrawer`)
- 구조: `backend/`, `frontend/`, `samples/hwp/`, `mydocs/orders/`, `mydocs/history/`, `mydocs/research/`, `docker-compose.yml`, `PROJECT.md`, `README.md`
- GitHub: `sienhs`, `main`
- IDE: STS(백) + VSCode·Claude Code(프론트·파서·복잡 작업) + Thunder Client

### Docker 서비스
- `postgres` (PostgreSQL 16) — 5432
- `minio` (스토리지) — 9000(API), 9001(Console)
- 모두 `drawer-network`. backend 추가 시 `docker` 프로파일 활성화.
- ~~`hwp-parser`~~ Step 3-E-2-b-4에서 제거됨 (rhwp/core로 대체)

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
