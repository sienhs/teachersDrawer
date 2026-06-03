# Phase 3 - Step 3-E-2-b-4: rhwp/core 통합 + hwp-parser 폐기

> 작성일: 2026-06-03
> 선행: 3-E-2-b-3 일관성 검증 통과. rhwp/core 75ms vs hwp-parser 712ms.
> 작업 범위: 업로드/편집 두 흐름 모두 rhwp/core 사용으로 통합. hwp-parser 폐기.

## 작업 전 필독

1. PROJECT.md
2. mydocs/research/20260603-rhwp-core-consistency.md
3. lib/hwp/ 모듈 (3-E-2-b-2 결과)

## 통합 결정 사항

- **범위**: 원본 업로드 + [정리화면에 반영] 둘 다 rhwp/core
- **hwp-parser**: 완전 폐기 (Docker, Python 코드, Spring Client 삭제)
- **confirmed 빈 값**: 백엔드 @PrePersist로 null→"" 변환 (C안)
- **줄바꿈 처리**: rhwp/core 방식 그대로 채택 (압축)

## 1. 백엔드 변경

### 삭제

```
hwp-parser/                                  디렉토리 통째로
docker-compose.yml                           hwp-parser 서비스 블록 제거
backend/.../activityPlan/client/HwpParserClient.java
backend/.../activityPlan/dto/parser/         (hwp-parser 응답 DTO들, 사용 안 되면 삭제)
application.yml / application-docker.yml     hwp-parser URL 설정 제거
```

### ActivityPlanService 변경

`analyze()` 메서드:
- HwpParserClient 호출 제거
- 프론트에서 보낸 sections/montessoriRecords/메타를 그대로 받음
- analyze API 자체가 더이상 필요한가? → 검토:
  - 자동 매칭(반/아이/동명이인)은 여전히 필요
  - 중복 감지(duplicateOfId)도 필요
  - 그래서 endpoint는 유지, 입력만 변경

새 analyze 흐름:
```
입력: multipart (file + 프론트가 미리 파싱한 ParsedActivityPlan JSON)
   또는: 그냥 JSON (파일은 confirm 시 전송)
처리:
  1. 메타 검증 (planDate 등)
  2. 반/아이 자동 매칭
  3. 중복 감지
출력: ActivityPlanAnalysisResponse (기존과 동일)
```

→ 파일 업로드와 분석이 분리됨. 두 가지 옵션:

**옵션 A**: 기존 multipart 유지. 백엔드는 파일을 MinIO에 임시 저장만 하고 파싱은 안 함. 프론트가 별도로 파일을 파싱해서 분석 요청 시 함께 전송.

**옵션 B**: 분리. 파일 업로드 → MinIO 저장만 → fileKey 반환. 그 후 프론트가 파싱한 JSON으로 analyze 호출.

**A 권장**. 기존 API 시그니처 유지 가능. multipart에 file과 parsedJson 둘 다 포함.

### confirm API

기존 그대로. 이미 sections/montessoriRecords를 프론트에서 받게 되어있음.

### Entity @PrePersist

`MontessoriRecord.java`:
```java
@PrePersist
@PreUpdate
private void normalizeConfirmed() {
    if (this.confirmed == null) {
        this.confirmed = "";
    }
}
```

또는 setter에서 처리. 둘 중 클래스 컨벤션에 맞는 방식.

## 2. 프론트 변경

### ActivityPlanUploadPage.tsx

기존 흐름:
```
1. 파일 선택
2. [업로드하기] 클릭
3. POST /analyze (multipart, file만)
4. 백엔드 hwp-parser 호출 → 분석
5. 응답 → 모달
```

새 흐름:
```
1. 파일 선택
2. [업로드하기] 클릭
3. 프론트에서 rhwp/core로 파싱 (extractActivityPlan)
4. POST /analyze (multipart: file + parsedJson)
5. 백엔드는 자동 매칭/중복 감지만
6. 응답 → 모달
```

코드 흐름:
```typescript
async function handleUpload(file: File, classroomId?: number) {
  setLoading(true);
  try {
    // 1. rhwp/core로 파싱
    const bytes = await file.arrayBuffer();
    const doc = await HwpDocument.fromBytes(new Uint8Array(bytes));
    const parsed = await extractActivityPlan(doc);
    
    // 2. 백엔드에 파일 + 파싱 결과 함께 전송
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parsed', new Blob([JSON.stringify(parsed)], { type: 'application/json' }));
    if (classroomId) formData.append('classroomId', String(classroomId));
    
    const response = await api.post('/api/activity-plans/analyze', formData);
    setAnalysisResult(response.data.data);
    
    // 3. WASM 메모리 정리
    doc.destroy?.();
  } catch (e) {
    // 에러 처리
  } finally {
    setLoading(false);
  }
}
```

### RhwpViewerPanel.tsx — [정리화면에 반영] 활성화

기존: 버튼 disabled + 툴팁 "준비 중인 기능입니다"
변경: 활성화 + 핸들러 동작

```typescript
async function handleReflect() {
  setReflecting(true);
  try {
    // 현재 자동 저장된 파일을 다시 받아옴 (또는 캐시된 pendingBytes 사용)
    const bytes = pendingBytes ?? await downloadCurrentFile();
    
    // rhwp/core로 파싱
    const doc = await HwpDocument.fromBytes(bytes);
    const parsed = await extractActivityPlan(doc);
    doc.destroy?.();
    
    // analyze API 호출 (file 대신 fileKey + parsed JSON)
    // 또는 빠르게: 그냥 자동 매칭만 시켜서 모달 띄움
    const file = new File([bytes], fileName);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parsed', new Blob([JSON.stringify(parsed)], { type: 'application/json' }));
    formData.append('classroomId', String(classroomId));
    
    const analysis = (await api.post('/api/activity-plans/analyze', formData)).data.data;
    setAnalysisResult(analysis);
    setShowConfirmModal(true);
  } finally {
    setReflecting(false);
  }
}
```

모달 [수락하고 저장] → confirm API에 existingPlanId 포함 → DB 갱신 → 페이지 새로고침.

이전에 비활성화했던 코드 주석 해제하면서 새 흐름에 맞게 정리.

하단 상태 메시지도 원복:
```
"X초 전 자동 저장됨 (원본 파일만 갱신, 정리화면은 첫 업로드 기준)"
→ "X초 전 저장됨" (단순화)
```

## 3. Docker 변경

docker-compose.yml에서 hwp-parser 서비스 블록 제거. 의존성 다른 서비스가 없으므로 안전.

```yaml
# 삭제
hwp-parser:
  build: ./hwp-parser
  ports: ...
  ...
```

backend 서비스의 `depends_on` 또는 환경변수에 hwp-parser 참조 있다면 제거.

## 4. 검증 시나리오

```
0. STS 재시작 + frontend dev + docker-compose up -d (hwp-parser 제외)

1. 신규 업로드 흐름
   - /activity-plans/new → CASE_5_8.hwp 업로드
   - 분석 진행 (이번엔 프론트에서 파싱) 
   - 모달 정상 표시 (이전과 동일한 UX)
   - [수락하고 저장] → 상세 페이지 정상

2. 자동 등록 확인
   - 반/아이/Enrollment 정상 생성
   - PENDING 17명 확인

3. [정리화면에 반영] 흐름
   - 상세 페이지 → 편집 모드 ON
   - 텍스트 한 글자 추가
   - 자동 저장됨
   - [정리화면에 반영] 클릭 (이제 활성화됨)
   - 모달 표시
   - [수락하고 저장] → 새로고침 → 변경 사항 반영

4. confirmed 빈 값 처리
   - DB 확인: MontessoriRecord.confirmed가 "" (null 아님)

5. 성능
   - 업로드 진행 시간이 이전보다 빠른지 (체감)
```

## 5. 작업 후 보고

1. 변경/추가/삭제 파일 목록
2. 빌드 통과 (백엔드 + 프론트)
3. 검증 시나리오 결과
4. hwp-parser 디렉토리·서비스 완전 제거 확인
5. 막힌 부분

## 6. 주의사항

- hwp-parser 삭제 전에 lib/hwp/가 모든 케이스 커버하는지 한 번 더 확인. 잘못 삭제하면 복구 비용 큼.
- 백엔드 ActivityPlanService에서 HwpParserClient import 다 제거되는지 확인.
- application.yml의 `hwp-parser.url` 설정 제거.
- WASM doc 인스턴스 destroy 누락 시 메모리 누수 가능. 모든 사용처에 destroy 호출.
- DB는 ddl-auto: create니까 재시작 시 초기화됨. 기존 데이터 손실 OK.
- README.md, PROJECT.md의 hwp-parser 언급도 다 정리 (문서 정리는 이번에 같이 또는 별도).

## 7. 커밋 메시지 가이드

```
feat: rhwp/core 완전 통합, hwp-parser 폐기 (Phase 3 Step 3-E-2-b-4)

- 업로드 + [정리화면에 반영] 모두 프론트 rhwp/core 사용
- hwp-parser Docker 서비스 + Python 코드 + Spring Client 삭제
- analyze API: 파일 + 프론트 파싱 JSON 함께 받음 (자동 매칭/중복 감지만)
- MontessoriRecord @PrePersist로 confirmed null→"" 변환
- RhwpViewerPanel [정리화면에 반영] 버튼 활성화

성능: 분석 712ms → 75ms (체감 즉시)
인프라: Docker 서비스 1개 감소, Python 의존성 제거
```

---

작업 시작 전 의문점 있으면 먼저 질문해줘.
