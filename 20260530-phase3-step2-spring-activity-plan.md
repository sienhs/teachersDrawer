# Phase 3 - Step 2: Spring ActivityPlan 도메인 + 업로드 API

> 작성일: 2026-05-30
> 선행: Step 1 (hwp-parser 컨테이너) 완료. `http://hwp-parser:8001/parse` 호출 가능.
> 작업 범위: PROJECT.md "Phase 3 작업 순서" 중 3~6번

## 작업 전 필독

1. 프로젝트 루트의 `PROJECT.md`를 먼저 읽고 전체 맥락 파악
2. 특히 "3. 데이터 모델 > ActivityPlan/ActivitySection/MontessoriRecord 필드" 숙지
3. 기존 도메인(Child/Classroom/Enrollment) 패턴을 그대로 따라갈 것:
   - `domain/{name}/{entity,repository,dto,service,controller}` 구조
   - `@RequiredArgsConstructor`, `@Transactional(readOnly = true)` 클래스 + 쓰기 메서드만 `@Transactional`
   - 멀티유저 격리: `findOwned{X}` 헬퍼 패턴
   - `ApiResponse<T>` 응답 래핑
   - `ErrorCode` enum으로 에러 일원화
   - `@AuthenticationPrincipal CustomUserDetails`로 현재 유저 id 사용
   - `@PathVariable`/`@RequestParam` 이름 명시 (STS `-parameters` 미지원 우회)

## 목표

선생님이 HWP/HWPX 활동계획안을 업로드하면

1. MinIO에 원본 저장 (UUID 리네이밍)
2. hwp-parser 컨테이너 호출하여 정규화 JSON 받음
3. 결과를 ActivityPlan / ActivitySection / MontessoriRecord 3개 테이블에 저장
4. 목록·상세·검색 API 제공

## 산출물

### 1. 패키지 구조

```
domain/activityPlan/
├── entity/
│   ├── ActivityPlan.java
│   ├── ActivitySection.java
│   ├── MontessoriRecord.java
│   └── SectionCategory.java        ← enum
├── repository/
│   ├── ActivityPlanRepository.java
│   ├── ActivitySectionRepository.java
│   └── MontessoriRecordRepository.java
├── dto/
│   ├── ActivityPlanResponse.java         ← 상세 (sections, records 포함)
│   ├── ActivityPlanSummaryResponse.java  ← 목록용 (메타만)
│   ├── ActivitySectionResponse.java
│   ├── MontessoriRecordResponse.java
│   └── parser/                            ← hwp-parser 응답 역직렬화용
│       ├── HwpParseResponse.java
│       ├── ParsedMetadata.java
│       ├── ParsedSection.java
│       └── ParsedMontessoriRecord.java
├── client/
│   └── HwpParserClient.java               ← RestClient 기반
├── service/
│   ├── ActivityPlanService.java
│   └── FileStorageService.java            ← MinIO 추상화 (재사용 가능)
└── controller/
    └── ActivityPlanController.java
```

### 2. 엔티티 (PROJECT.md 스펙 그대로)

```java
@Entity @Table(name = "activity_plans")
class ActivityPlan {
    Long id;
    @ManyToOne(fetch = LAZY) @JoinColumn(name = "user_id", nullable = false) User user;
    @ManyToOne(fetch = LAZY) @JoinColumn(name = "classroom_id") Classroom classroom;  // nullable

    LocalDate planDate;                 // not null
    String subject;
    String teacherName;
    String classNameRaw;
    String classTimeRaw;
    Integer classDayCount;

    String fileKey;                     // MinIO 객체 키 (UUID)
    String fileName;                    // 원본 파일명

    @Column(columnDefinition = "TEXT") String rawJson;   // 안전망

    LocalDateTime createdAt;            // @CreatedDate
    LocalDateTime updatedAt;            // @LastModifiedDate

    // 양방향 X. 조회는 Repository 쿼리로.
}

@Entity @Table(name = "activity_sections")
class ActivitySection {
    Long id;
    @ManyToOne(fetch = LAZY) @JoinColumn(name = "activity_plan_id", nullable = false) ActivityPlan activityPlan;

    Integer orderIndex;
    String label;
    @Column(columnDefinition = "TEXT") String content;

    @Enumerated(EnumType.STRING)
    SectionCategory category;           // MORNING/SAFETY/LUNCH/OUTDOOR/EVALUATION/OTHER
}

@Entity @Table(name = "montessori_records")
class MontessoriRecord {
    Long id;
    @ManyToOne(fetch = LAZY) @JoinColumn(name = "activity_plan_id", nullable = false) ActivityPlan activityPlan;

    String childNameRaw;                // HWP에서 추출한 원본 이름
    @ManyToOne(fetch = LAZY) @JoinColumn(name = "child_id") Child child;  // nullable, 자동 매칭

    String area;
    String material;
    String confirmed;
}

enum SectionCategory { MORNING, SAFETY, LUNCH, OUTDOOR, EVALUATION, OTHER }
```

모든 엔티티에 `@Getter @NoArgsConstructor(PROTECTED) @AllArgsConstructor(PRIVATE) @Builder @EntityListeners(AuditingEntityListener.class)`.

### 3. Repository

```java
interface ActivityPlanRepository extends JpaRepository<ActivityPlan, Long> {
    List<ActivityPlan> findByUserIdOrderByPlanDateDesc(Long userId);
    List<ActivityPlan> findByUserIdAndClassroomIdOrderByPlanDateDesc(Long userId, Long classroomId);
    List<ActivityPlan> findByUserIdAndPlanDateBetweenOrderByPlanDateDesc(Long userId, LocalDate from, LocalDate to);
}

interface ActivitySectionRepository extends JpaRepository<ActivitySection, Long> {
    List<ActivitySection> findByActivityPlanIdOrderByOrderIndexAsc(Long planId);
}

interface MontessoriRecordRepository extends JpaRepository<MontessoriRecord, Long> {
    List<MontessoriRecord> findByActivityPlanId(Long planId);
    List<MontessoriRecord> findByChildIdOrderByActivityPlan_PlanDateDesc(Long childId);  // 아이별 교구 이력
}
```

### 4. HwpParserClient (Spring RestClient 사용)

```
- Base URL: http://hwp-parser:8001  (application.yml에 외부화)
- POST /parse (multipart/form-data, field name = "file")
- 응답: HwpParseResponse (metadata / sections / montessoriRecords / rawJson)
- 타임아웃: 60초 (큰 파일도 처리할 수 있게)
- 예외: 502 등 5xx면 BusinessException(HWP_PARSE_FAILED)
- 4xx면 BusinessException(INVALID_FILE_TYPE)
```

설정값 위치 (`application.yml`):
```yaml
hwp:
  parser:
    base-url: http://hwp-parser:8001
    timeout-seconds: 60
```

### 5. FileStorageService (MinIO 추상화)

이미 있는지 모르겠음. 없으면 신규 작성. 있으면 재사용.

```java
interface FileStorageService {
    /** 업로드. 객체 키 반환 */
    String upload(MultipartFile file, String prefix);  // prefix 예: "activity-plans/"
    
    /** 다운로드. byte[] 반환 (또는 InputStream) */
    byte[] download(String fileKey);
    
    /** 삭제 */
    void delete(String fileKey);
}
```

구현체는 MinIO Java SDK 사용. 객체 키는 `{prefix}{UUID}-{원본파일명}` 패턴.
버킷은 application.yml에서 외부화. 없으면 시작 시 자동 생성.

### 6. ActivityPlanService

핵심 메서드: `upload(Long userId, MultipartFile file, Long classroomId)`

```
1. 파일 확장자 검증 (.hwp / .hwpx 만 허용)
2. classroomId 받으면 findOwnedClassroom 으로 검증 (아카이브된 반은 차단)
3. file을 MinIO에 업로드 → fileKey 획득
4. HwpParserClient.parse(file) 호출 → HwpParseResponse 획득
   ※ 파싱 호출은 file 객체를 재사용하거나, MinIO에서 다시 다운로드해 보내야 함
     (MultipartFile.getInputStream() 한 번 읽으면 끝나므로 주의)
5. ActivityPlan 엔티티 생성 + 저장
   - metadata 매핑
   - fileKey, fileName 저장
   - rawJson 저장 (response.rawJson 그대로)
   - classroom 자동 매칭 시도: classNameRaw로 현재 ACTIVE Classroom 찾아보고 있으면 연결
6. ActivitySection 일괄 저장 (saveAll)
7. MontessoriRecord 일괄 저장
   - childNameRaw로 같은 user의 Child 자동 매칭 시도 (이름 정확 일치)
   - 매칭되면 child 연결, 안 되면 null
8. ActivityPlanResponse 반환
```

다른 메서드:
```
getMyPlans(userId, classroomId?, from?, to?) → List<ActivityPlanSummaryResponse>
getPlan(userId, planId) → ActivityPlanResponse (sections, records 포함)
delete(userId, planId) → MinIO 파일도 함께 삭제
```

모든 메서드에서 `findOwnedPlan(userId, planId)` 헬퍼로 소유권 검증.

### 7. Controller

```
POST   /api/activity-plans                            업로드 (multipart)
  - form-data: file (HWP 파일), classroomId (Long, optional)
  - 응답: ActivityPlanResponse (상세)

GET    /api/activity-plans                            내 활동계획안 목록
  - query: classroomId, from (yyyy-MM-dd), to (yyyy-MM-dd) ─ 모두 optional
  - 응답: List<ActivityPlanSummaryResponse>

GET    /api/activity-plans/{planId}                   상세 (sections, records 포함)
DELETE /api/activity-plans/{planId}                   삭제 (MinIO 파일 함께)

GET    /api/activity-plans/{planId}/file              원본 HWP 다운로드
  - 응답: application/octet-stream
  - Content-Disposition: attachment; filename="..."

GET    /api/activity-plans/children/{childId}/montessori
  - 아이의 몬테소리 활동 이력 (날짜 내림차순)
  - 응답: List<MontessoriRecordResponse> (planDate 포함)
```

### 8. ErrorCode 추가

```java
// ActivityPlan
ACTIVITY_PLAN_NOT_FOUND(NOT_FOUND, "활동계획안을 찾을 수 없습니다."),
HWP_PARSE_FAILED(INTERNAL_SERVER_ERROR, "HWP 파일 분석에 실패했습니다."),
INVALID_FILE_FORMAT(BAD_REQUEST, "HWP 또는 HWPX 파일만 업로드 가능합니다."),
FILE_STORAGE_ERROR(INTERNAL_SERVER_ERROR, "파일 저장 중 오류가 발생했습니다."),
```

기존 INVALID_FILE_TYPE 활용 가능하면 그것도 OK.

### 9. application.yml 추가

```yaml
hwp:
  parser:
    base-url: http://hwp-parser:8001
    timeout-seconds: 60

minio:
  endpoint: http://minio:9000
  access-key: ${MINIO_ROOT_USER:minioadmin}
  secret-key: ${MINIO_ROOT_PASSWORD:minioadmin}
  bucket: teachers-drawer
```

이미 있으면 통합. MinIO Java SDK는 `io.minio:minio:8.5.x` 정도면 됨.

build.gradle 의존성에 추가:
```
implementation 'io.minio:minio:8.5.13'
```

## 검증 시나리오

```bash
# 0. 로그인하여 accessToken 확보 (기존 흐름)

# 1. 반 하나 만들기
curl -X POST .../api/classrooms -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"name":"열성반"}'
# → classroomId 확보

# 2. 아이 등록 (몬테소리 자동 매칭 테스트용)
curl -X POST .../api/children -H "Authorization: Bearer $T" \
  -H "Content-Type: application/json" \
  -d '{"name":"김신"}'
# 김예서, 김희준도 같이 등록

# 3. HWP 업로드
curl -X POST .../api/activity-plans \
  -H "Authorization: Bearer $T" \
  -F "file=@samples/hwp/CASE_5_8.hwp" \
  -F "classroomId=1"
# → ActivityPlanResponse 응답, sections 11개·records 17개 포함

# 4. 목록 조회
curl .../api/activity-plans -H "Authorization: Bearer $T"

# 5. 김신의 몬테소리 이력
curl .../api/activity-plans/children/1/montessori -H "Authorization: Bearer $T"

# 6. 같은 식으로 CASE_5_26.hwp 업로드 → 김신 이력에 2개 쌓이는지

# 7. 원본 다운로드
curl .../api/activity-plans/1/file -H "Authorization: Bearer $T" -o downloaded.hwp
# 원본과 같은지 비교

# 8. 삭제
curl -X DELETE .../api/activity-plans/1 -H "Authorization: Bearer $T"
# MinIO에서도 파일이 지워졌는지 확인
```

## 작업 후 보고

1. 추가/변경된 파일 목록
2. 위 검증 시나리오의 응답 (특히 3번 업로드, 5번 아이별 몬테소리 이력)
3. MinIO Console (`http://localhost:9001`)에서 파일이 실제로 저장되었는지 스크린샷 또는 텍스트 확인
4. application.yml의 추가된 설정값 위치
5. 막힌 부분 또는 보류 결정

## 주의사항

- **MultipartFile은 한 번 읽으면 끝**. MinIO 업로드 후 hwp-parser에 또 보내려면 byte[]로 미리 읽어두거나 MinIO에서 다시 다운로드해서 보내야 함. 권장: 메모리에 byte[]로 보관 (보통 < 1MB).
- ActivityPlan 저장 시 `cascade` 안 씀. Section/Record는 직접 saveAll.
- `rawJson`은 columnDefinition = "TEXT" 명시 (varchar 255 넘으니까)
- 자동 매칭(classroom, child)은 **실패해도 에러 던지지 말고 null로 두고 진행**. 사용자가 나중에 수동 연결할 수 있어야 함.
- 한국어 파일명 처리: Content-Disposition 헤더에 인코딩 주의 (`filename*=UTF-8''{encoded}`)
- `findOwnedPlan` 헬퍼는 Child/Classroom의 패턴 그대로
- MinIO 버킷은 시작 시 없으면 자동 생성 (DataInitializer 등에)

## 다음 단계 예고

Step 3: 프론트 측 업로드 UI + 표 정리보기 + rhwp 에디터 임베드.
이번 작업에서는 백엔드만 완성.

작업 시작 전 의문점이 있으면 먼저 질문해줘.
