# Phase 3 마무리 작업 묶음 2: 코드 품질 리팩토링

> 작성일: 2026-06-02
> 선행: 묶음 1 (깔끔한 마무리) 완료
> 작업 성격: 사용자에게 보이지 않는 변화. 코드 품질·성능·유지보수성 개선.
> 다음: Phase 4 (추천형 에디터 본격 시작) 또는 휴식

## 작업 전 필독

1. `PROJECT.md` 읽기 (특히 멀티유저 격리 패턴, CustomUserDetails 부분)
2. 묶음 1 결과 코드 확인
3. **중요**: 이 작업은 동작 변경 없이 코드만 개선. 검증 시나리오에서 기존 모든 동작이 유지되어야 함.

## 목표

코드 품질 3가지를 개선한다:

```
K. OwnershipValidator 추출 (소유권 검증 헬퍼 4곳 중복 해소)
L. CustomUserDetails 활용해 user 재조회 제거 (N+1 일부 해소)
M. FullCalendar 코드 스플리팅 (번들 553kB → 분할 로드)
```

각 작업이 독립적. 순서대로 진행. 한 작업 끝낼 때마다 빌드 + 동작 확인.

---

## K. OwnershipValidator 추출

### 현재 상태

각 Service 파일에 거의 동일한 `findOwned{X}` 헬퍼 메서드가 4번 중복 존재:

```
ChildService: findOwnedChild(userId, childId)
ClassroomService: findOwnedClassroom(userId, classroomId)
EnrollmentService: findOwnedEnrollment(userId, enrollmentId)
ActivityPlanService: findOwnedPlan(userId, planId)
```

각 메서드의 패턴이 동일:
1. Repository에서 ID로 조회
2. null이면 NOT_FOUND 에러
3. user.id가 다르면 FORBIDDEN (현재 코드 확인 필요. 보안상 NOT_FOUND로 통일 검토할 수 있음)
4. 정상이면 반환

### 작업

공통 검증 로직을 별도 컴포넌트로 추출.

`backend/src/main/java/.../global/util/OwnershipValidator.java` 신규:

```java
@Component
@RequiredArgsConstructor
public class OwnershipValidator {
    /**
     * 엔티티가 해당 userId의 소유인지 검증.
     * 
     * @param entity null이면 NOT_FOUND 예외
     * @param ownerId 엔티티의 소유자 user id
     * @param userId 현재 요청한 user id
     * @param notFoundErrorCode 검증 실패 시 던질 에러 (보통 *_NOT_FOUND)
     * @throws BusinessException 소유자 불일치 시 (보안상 NOT_FOUND 통일)
     */
    public <T> T validate(
        T entity, 
        Long ownerId, 
        Long userId, 
        ErrorCode notFoundErrorCode
    ) {
        if (entity == null || !ownerId.equals(userId)) {
            throw new BusinessException(notFoundErrorCode);
        }
        return entity;
    }
}
```

각 Service에서 사용:

```java
// Before (ChildService)
private Child findOwnedChild(Long userId, Long childId) {
    Child child = childRepository.findById(childId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
    if (!child.getUser().getId().equals(userId)) {
        throw new BusinessException(CHILD_NOT_FOUND);  // 또는 FORBIDDEN
    }
    return child;
}

// After
private final OwnershipValidator ownershipValidator;

private Child findOwnedChild(Long userId, Long childId) {
    Child child = childRepository.findById(childId).orElse(null);
    return ownershipValidator.validate(
        child, 
        child != null ? child.getUser().getId() : null,
        userId, 
        CHILD_NOT_FOUND
    );
}
```

또는 더 단순한 형태:

```java
private Child findOwnedChild(Long userId, Long childId) {
    return childRepository.findByIdAndUserId(childId, userId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
}
```

Repository에 `findByIdAndUserId` 같은 메서드 추가해서 처음부터 격리하는 방식도 가능. 어느 방식이 더 깔끔한지 판단해서 선택.

### 권장

저는 두 번째 방식 (Repository에서 처음부터 격리)이 더 깔끔하다고 봄.

```java
// ChildRepository
Optional<Child> findByIdAndUserId(Long id, Long userId);

// ChildService
private Child findOwnedChild(Long userId, Long childId) {
    return childRepository.findByIdAndUserId(childId, userId)
        .orElseThrow(() -> new BusinessException(CHILD_NOT_FOUND));
}
```

이러면 OwnershipValidator 자체가 필요 없어짐. 각 Repository에 `findByIdAndUserId` 추가. 코드 라인 줄고 명확함.

**둘 중 어느 게 더 좋은지 판단해서 클로드 코드가 선택**. 만약 헷갈리면 두 번째 (Repository 격리) 방식으로 가는 게 안전.

### 대상 파일

- ChildService, ChildRepository
- ClassroomService, ClassroomRepository
- EnrollmentService, EnrollmentRepository
- ActivityPlanService, ActivityPlanRepository

각 Service의 `findOwned*` 메서드를 Repository의 `findByIdAndUserId`로 단순화. 또는 OwnershipValidator로 통합.

---

## L. CustomUserDetails 활용해 user 재조회 제거

### 현재 상태

일부 Service 메서드에서 userId를 받은 후 다시 User 엔티티를 조회하는 경우가 있을 수 있음. 예:

```java
public ChildResponse createChild(Long userId, ChildCreateRequest req) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(USER_NOT_FOUND));
    Child child = Child.builder()
        .user(user)
        .name(req.getName())
        ...
        .build();
    childRepository.save(child);
    return ChildResponse.from(child);
}
```

여기서 `userRepository.findById` 호출이 매번 일어남. JWT로 이미 인증된 사용자이므로 DB 재조회 불필요.

### 작업

JPA `getReferenceById`를 사용해 user 엔티티 참조만 생성 (실제 DB 조회 X):

```java
public ChildResponse createChild(Long userId, ChildCreateRequest req) {
    User userRef = userRepository.getReferenceById(userId);  // 프록시, DB 조회 안 함
    Child child = Child.builder()
        .user(userRef)
        .name(req.getName())
        ...
        .build();
    childRepository.save(child);
    return ChildResponse.from(child);
}
```

`getReferenceById`는 프록시를 반환. FK로만 사용하는 경우(이 케이스처럼) 실제 데이터 접근 안 하면 쿼리 안 나감.

### 주의사항

- 프록시 엔티티의 필드(name, email 등)에 접근하면 LazyInitializationException 또는 추가 쿼리 발생
- 단순히 FK 저장용일 때만 사용
- 응답 DTO에 user 정보가 필요하면 그땐 실제 조회 필요

### 대상

각 Service에서 `userRepository.findById(userId)` 호출하는 곳 찾기:

- ChildService.createChild
- ClassroomService.createClassroom
- EnrollmentService.createEnrollment
- ActivityPlanService 관련 메서드들

FK로만 사용되는 경우 `getReferenceById`로 변경.

만약 한 메서드 안에서 user의 필드를 실제로 사용한다면(예: response에 포함), 그땐 그대로 두기.

---

## M. FullCalendar 코드 스플리팅

### 현재 상태

FullCalendar 번들이 553kB로 큼. 메인 페이지 로드 시 함께 로드되어 초기 진입 느림.

### 작업

대시보드 페이지에서만 FullCalendar가 사용되므로 React.lazy로 코드 분할:

```tsx
// DashboardCalendar.tsx (현재)
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// 그대로 두고

// DashboardPage.tsx (변경)
import { lazy, Suspense } from 'react';
const DashboardCalendar = lazy(() => import('@/components/dashboard/DashboardCalendar'));

function DashboardPage() {
  return (
    <Suspense fallback={<CalendarLoadingSkeleton />}>
      <DashboardCalendar ... />
    </Suspense>
  );
}
```

`CalendarLoadingSkeleton`은 간단한 회색 박스 또는 spinner:

```tsx
function CalendarLoadingSkeleton() {
  return (
    <div className="h-[600px] rounded-lg bg-gray-100 animate-pulse" />
  );
}
```

### 추가 분할

`ActivityPlanChildDetailPage`의 react-calendar(미니 캘린더)도 같은 식으로 분리 가능. 단 react-calendar는 훨씬 작아서(50kB 정도) 효과 작음. 우선순위 낮음.

### 검증

`npm run build` 결과 보기. dist/assets/ 폴더의 청크들이 분할되어야 함. 메인 청크가 작아지고 FullCalendar 청크가 별도 파일로.

---

## 검증 시나리오

각 작업 후 다음 동작이 유지되는지 확인:

```
K (OwnershipValidator):
1. 로그인 후 아이/반/반배정/활동계획안 CRUD 모두 동작
2. 다른 사용자의 데이터 접근 시도 → NOT_FOUND
3. 자기 데이터 조회/수정/삭제 → 정상

L (user 재조회 제거):
1. 아이/반/반배정 생성 동작 정상
2. 응답 데이터에 user 정보가 필요한 경우 정상 표시
3. 새 데이터 생성 시 SQL 로그에 user SELECT가 줄어듦 (옵션)

M (코드 스플리팅):
1. 대시보드 첫 진입 시 캘린더 로드 잠깐 (skeleton 표시)
2. npm run build 시 dist/assets/에 청크 분할 확인
3. 메인 페이지 (로그인 등) 진입 시 캘린더 번들 안 받음
```

---

## 작업 후 보고

1. 변경 파일 목록
2. K/L/M 각각의 변경 방식 설명 (예: K는 Repository 격리 방식 채택)
3. 빌드 통과 + npm run build 결과 (청크 크기 변화)
4. 동작 검증 결과
5. 막힌 부분

## 작업 후 커밋 메시지 가이드 (커밋은 사용자가 직접)

```
refactor: Phase 3 마무리 묶음 2 - 코드 품질

- OwnershipValidator: Repository에 findByIdAndUserId 추가, Service 로직 단순화
- user 재조회 제거: getReferenceById로 프록시 사용 (FK 전용)
- FullCalendar 코드 스플리팅: 대시보드만 lazy 로드

동작 변경 없음. 빌드 통과. 기존 동작 모두 유지 확인.

다음: 휴식 또는 Phase 4 진입
```

---

작업 시작 전 의문점 있으면 먼저 질문해줘. 특히 OwnershipValidator vs Repository 격리 방식 선택에 대한 의견 차이가 있으면 미리 물어봐.
