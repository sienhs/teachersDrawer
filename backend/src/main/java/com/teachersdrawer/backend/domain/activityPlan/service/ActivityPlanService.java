package com.teachersdrawer.backend.domain.activityPlan.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.teachersdrawer.backend.domain.activityPlan.client.HwpParserClient;
import com.teachersdrawer.backend.domain.activityPlan.dto.ActivityPlanResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.ActivityPlanSummaryResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.ActivitySectionResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.MontessoriRecordResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.analyze.ActivityPlanAnalysisResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.analyze.ChildMatchResult;
import com.teachersdrawer.backend.domain.activityPlan.dto.analyze.ClassroomMatchResult;
import com.teachersdrawer.backend.domain.activityPlan.dto.analyze.DuplicateCandidateResult;
import com.teachersdrawer.backend.domain.activityPlan.dto.confirm.ActivityPlanConfirmRequest;
import com.teachersdrawer.backend.domain.activityPlan.dto.confirm.ChildActionRequest;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.HwpParseResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedMetadata;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedMontessoriRecord;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedSection;
import com.teachersdrawer.backend.domain.activityPlan.entity.ActivityPlan;
import com.teachersdrawer.backend.domain.activityPlan.entity.ActivitySection;
import com.teachersdrawer.backend.domain.activityPlan.entity.MontessoriRecord;
import com.teachersdrawer.backend.domain.activityPlan.entity.SectionCategory;
import com.teachersdrawer.backend.domain.activityPlan.repository.ActivityPlanRepository;
import com.teachersdrawer.backend.domain.activityPlan.repository.ActivitySectionRepository;
import com.teachersdrawer.backend.domain.activityPlan.repository.MontessoriRecordRepository;
import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;
import com.teachersdrawer.backend.domain.child.entity.Child;
import com.teachersdrawer.backend.domain.child.repository.ChildRepository;
import com.teachersdrawer.backend.domain.classroom.entity.Classroom;
import com.teachersdrawer.backend.domain.classroom.repository.ClassroomRepository;
import com.teachersdrawer.backend.domain.enrollment.entity.Enrollment;
import com.teachersdrawer.backend.domain.enrollment.repository.EnrollmentRepository;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityPlanService {

    private final ActivityPlanRepository activityPlanRepository;
    private final ActivitySectionRepository activitySectionRepository;
    private final MontessoriRecordRepository montessoriRecordRepository;
    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final ChildRepository childRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final FileStorageService fileStorageService;
    private final HwpParserClient hwpParserClient;

    public record FileDownload(byte[] bytes, String fileName) {}

    // ---- 업로드 ----

    @Transactional
    public ActivityPlanResponse upload(Long userId, MultipartFile file, Long classroomId) {
        String originalFilename = file.getOriginalFilename();
        validateHwpExtension(originalFilename);

        // MultipartFile은 한 번만 읽을 수 있으므로 미리 byte[]로 읽어둠
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }

        // classroomId 소유권·아카이브 검증
        Classroom classroom = null;
        if (classroomId != null) {
            classroom = classroomRepository.findById(classroomId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CLASSROOM_NOT_FOUND));
            if (!classroom.getUser().getId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
            if (classroom.isArchived()) {
                throw new BusinessException(ErrorCode.ARCHIVED_CLASSROOM);
            }
        }

        // MinIO 업로드 (userId 포함 prefix로 소유권 격리)
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String fileKey = fileStorageService.upload(fileBytes, originalFilename, contentType, "activity-plans/" + userId + "/");

        // hwp-parser 호출 (업로드한 byte[] 재사용)
        HwpParseResponse parseResponse;
        try {
            parseResponse = hwpParserClient.parse(fileBytes, originalFilename);
        } catch (BusinessException e) {
            // 파싱 실패 시 MinIO에 저장된 파일 롤백
            try { fileStorageService.delete(fileKey); } catch (Exception ex) {
                log.warn("파싱 실패 후 MinIO 파일 삭제 실패: {}", ex.getMessage());
            }
            throw e;
        }

        ParsedMetadata meta = parseResponse.getMetadata();

        // classroomId 없으면 classNameRaw로 ACTIVE 반 자동 매칭 시도
        if (classroom == null && meta != null && meta.getClassNameRaw() != null) {
            classroom = classroomRepository.findByUserIdAndStatusOrderByYearDesc(userId, "ACTIVE")
                    .stream()
                    .filter(c -> c.getName().equals(meta.getClassNameRaw()))
                    .findFirst()
                    .orElse(null);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        ActivityPlan plan = ActivityPlan.builder()
                .user(user)
                .classroom(classroom)
                .planDate(meta != null && meta.getPlanDate() != null ? meta.getPlanDate() : LocalDate.now())
                .subject(meta != null ? meta.getSubject() : null)
                .teacherName(meta != null ? meta.getTeacherName() : null)
                .classNameRaw(meta != null ? meta.getClassNameRaw() : null)
                .classTimeRaw(meta != null ? meta.getClassTimeRaw() : null)
                .classDayCount(meta != null ? meta.getClassDayCount() : null)
                .fileKey(fileKey)
                .fileName(originalFilename)
                .rawJson(parseResponse.getRawJson())
                .build();

        plan = activityPlanRepository.save(plan);

        // sections 저장
        List<ActivitySection> sections = new ArrayList<>();
        if (parseResponse.getSections() != null) {
            for (ParsedSection ps : parseResponse.getSections()) {
                sections.add(ActivitySection.builder()
                        .activityPlan(plan)
                        .orderIndex(ps.getOrderIndex())
                        .label(ps.getLabel())
                        .content(ps.getContent())
                        .category(parseSectionCategory(ps.getCategory()))
                        .build());
            }
            activitySectionRepository.saveAll(sections);
        }

        // MontessoriRecords 저장 (아이 자동 매칭)
        List<MontessoriRecord> records = new ArrayList<>();
        if (parseResponse.getMontessoriRecords() != null) {
            for (ParsedMontessoriRecord pmr : parseResponse.getMontessoriRecords()) {
                Child matchedChild = null;
                if (pmr.getChildNameRaw() != null) {
                    matchedChild = childRepository
                            .findFirstByUserIdAndStatusAndName(userId, "ENROLLED", pmr.getChildNameRaw().trim())
                            .orElse(null);
                }
                records.add(MontessoriRecord.builder()
                        .activityPlan(plan)
                        .childNameRaw(pmr.getChildNameRaw())
                        .child(matchedChild)
                        .area(pmr.getArea())
                        .material(pmr.getMaterial())
                        .confirmed(pmr.getConfirmed())
                        .build());
            }
            montessoriRecordRepository.saveAll(records);
        }

        return buildResponse(plan, sections, records);
    }

    // ---- 목록 조회 ----

    public List<ActivityPlanSummaryResponse> getMyPlans(Long userId, Long classroomId, LocalDate from, LocalDate to) {
        List<ActivityPlan> plans;
        if (classroomId != null) {
            plans = activityPlanRepository.findByUserIdAndClassroomIdOrderByPlanDateDesc(userId, classroomId);
        } else if (from != null && to != null) {
            plans = activityPlanRepository.findByUserIdAndPlanDateBetweenOrderByPlanDateDesc(userId, from, to);
        } else {
            plans = activityPlanRepository.findByUserIdOrderByPlanDateDesc(userId);
        }
        return plans.stream().map(ActivityPlanSummaryResponse::from).toList();
    }

    // ---- 상세 조회 ----

    public ActivityPlanResponse getPlan(Long userId, Long planId) {
        ActivityPlan plan = findOwnedPlan(userId, planId);
        List<ActivitySection> sections = activitySectionRepository.findByActivityPlanIdOrderByOrderIndexAsc(planId);
        List<MontessoriRecord> records = montessoriRecordRepository.findByActivityPlanId(planId);
        return buildResponse(plan, sections, records);
    }

    // ---- 파일 다운로드 ----

    public FileDownload downloadFile(Long userId, Long planId) {
        ActivityPlan plan = findOwnedPlan(userId, planId);
        byte[] bytes = fileStorageService.download(plan.getFileKey());
        return new FileDownload(bytes, plan.getFileName());
    }

    // ---- 삭제 ----

    @Transactional
    public void delete(Long userId, Long planId) {
        ActivityPlan plan = findOwnedPlan(userId, planId);
        String fileKey = plan.getFileKey();

        montessoriRecordRepository.deleteAll(
                montessoriRecordRepository.findByActivityPlanId(planId));
        activitySectionRepository.deleteAll(
                activitySectionRepository.findByActivityPlanIdOrderByOrderIndexAsc(planId));
        activityPlanRepository.delete(plan);

        try {
            fileStorageService.delete(fileKey);
        } catch (Exception e) {
            log.warn("MinIO 파일 삭제 실패 (DB는 이미 삭제됨): {}", e.getMessage());
        }
    }

    // ---- 아이별 몬테소리 이력 ----

    public List<MontessoriRecordResponse> getChildMontessoriHistory(Long userId, Long childId) {
        // 소유권 검증
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));
        if (!child.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return montessoriRecordRepository.findByChildIdOrderByActivityPlan_PlanDateDesc(childId)
                .stream()
                .map(MontessoriRecordResponse::fromWithPlanDate)
                .toList();
    }

    // ---- 분석 (DB 저장 X) ----

    @Transactional
    public ActivityPlanAnalysisResponse analyze(Long userId, MultipartFile file, Long classroomId) {
        String originalFilename = file.getOriginalFilename();
        validateHwpExtension(originalFilename);

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }

        // MinIO에 업로드 (userId 포함 prefix)
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String fileKey = fileStorageService.upload(fileBytes, originalFilename, contentType, "activity-plans/" + userId + "/");

        // hwp-parser 호출
        HwpParseResponse parsed;
        try {
            parsed = hwpParserClient.parse(fileBytes, originalFilename);
        } catch (BusinessException e) {
            try { fileStorageService.delete(fileKey); } catch (Exception ex) {
                log.warn("파싱 실패 후 MinIO 파일 삭제 실패: {}", ex.getMessage());
            }
            throw e;
        }

        ParsedMetadata meta = parsed.getMetadata();
        LocalDate planDate = meta != null && meta.getPlanDate() != null ? meta.getPlanDate() : LocalDate.now();
        String nameFromHwp = meta != null ? meta.getClassNameRaw() : null;

        // 반 매칭
        ClassroomMatchResult classroomMatch = matchClassroom(userId, nameFromHwp, planDate);

        // 아이 매칭 (몬테소리 레코드의 childNameRaw, 중복 제거)
        List<String> childNames = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        if (parsed.getMontessoriRecords() != null) {
            for (ParsedMontessoriRecord pmr : parsed.getMontessoriRecords()) {
                if (pmr.getChildNameRaw() != null) {
                    String trimmed = pmr.getChildNameRaw().trim();
                    if (seen.add(trimmed)) childNames.add(trimmed);
                }
            }
        }
        List<ChildMatchResult> childMatches = matchChildren(userId, childNames);

        return ActivityPlanAnalysisResponse.builder()
                .fileKey(fileKey)
                .fileName(originalFilename)
                .planDate(planDate)
                .subject(meta != null ? meta.getSubject() : null)
                .teacherName(meta != null ? meta.getTeacherName() : null)
                .classNameRaw(meta != null ? meta.getClassNameRaw() : null)
                .classTimeRaw(meta != null ? meta.getClassTimeRaw() : null)
                .classDayCount(meta != null ? meta.getClassDayCount() : null)
                .classroom(classroomMatch)
                .children(childMatches)
                .sections(parsed.getSections() != null ? parsed.getSections() : List.of())
                .montessoriRecords(parsed.getMontessoriRecords() != null ? parsed.getMontessoriRecords() : List.of())
                .rawJson(parsed.getRawJson())
                .build();
    }

    // ---- 확정 (실제 저장) ----

    @Transactional
    public ActivityPlanResponse confirm(Long userId, ActivityPlanConfirmRequest req) {
        // fileKey 소유권 검증
        if (!req.getFileKey().startsWith("activity-plans/" + userId + "/")) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        // 반 처리
        Classroom classroom;
        if (req.getClassroomAction().isUseExisting()) {
            Long cid = req.getClassroomAction().getExistingId();
            classroom = classroomRepository.findById(cid)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CLASSROOM_NOT_FOUND));
            if (!classroom.getUser().getId().equals(userId)) throw new BusinessException(ErrorCode.FORBIDDEN);
        } else {
            classroom = classroomRepository.save(Classroom.builder()
                    .user(user)
                    .year(req.getClassroomAction().getNewYear())
                    .name(req.getClassroomAction().getNewName())
                    .build());
        }

        // childActions → 이름 기준 맵 빌드
        Map<String, Child> resolvedChildren = new HashMap<>();
        for (ChildActionRequest ca : req.getChildActions()) {
            String name = ca.getNameFromHwp();
            Child resolved;
            switch (ca.getAction()) {
                case "USE_EXISTING" -> {
                    resolved = childRepository.findById(ca.getExistingChildId())
                            .orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));
                    if (!resolved.getUser().getId().equals(userId)) throw new BusinessException(ErrorCode.FORBIDDEN);
                }
                case "MERGE_WITH" -> {
                    resolved = childRepository.findById(ca.getMergeTargetId())
                            .orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));
                    if (!resolved.getUser().getId().equals(userId)) throw new BusinessException(ErrorCode.FORBIDDEN);
                }
                case "CREATE_NEW" -> resolved = childRepository.save(Child.builder()
                        .user(user).name(name).status("PENDING").build());
                default -> throw new BusinessException(ErrorCode.INVALID_CONFIRM_ACTION);
            }
            resolvedChildren.put(name, resolved);
        }

        // ActivityPlan 저장
        ActivityPlan plan = activityPlanRepository.save(ActivityPlan.builder()
                .user(user)
                .classroom(classroom)
                .planDate(req.getPlanDate())
                .subject(req.getSubject())
                .teacherName(req.getTeacherName())
                .classNameRaw(req.getClassNameRaw())
                .classTimeRaw(req.getClassTimeRaw())
                .classDayCount(req.getClassDayCount())
                .fileKey(req.getFileKey())
                .fileName(req.getFileName())
                .rawJson(req.getRawJson())
                .build());

        // sections 저장
        List<ActivitySection> sections = new ArrayList<>();
        if (req.getSections() != null) {
            for (ParsedSection ps : req.getSections()) {
                sections.add(ActivitySection.builder()
                        .activityPlan(plan)
                        .orderIndex(ps.getOrderIndex())
                        .label(ps.getLabel())
                        .content(ps.getContent())
                        .category(parseSectionCategory(ps.getCategory()))
                        .build());
            }
            activitySectionRepository.saveAll(sections);
        }

        // montessori records 저장 + enrollment 자동 생성
        List<MontessoriRecord> records = new ArrayList<>();
        Set<Long> enrolledChildIds = new LinkedHashSet<>();

        if (req.getMontessoriRecords() != null) {
            for (ParsedMontessoriRecord pmr : req.getMontessoriRecords()) {
                String rawName = pmr.getChildNameRaw();
                Child resolved = rawName != null ? resolvedChildren.get(rawName.trim()) : null;
                records.add(MontessoriRecord.builder()
                        .activityPlan(plan)
                        .childNameRaw(rawName)
                        .child(resolved)
                        .area(pmr.getArea())
                        .material(pmr.getMaterial())
                        .confirmed(pmr.getConfirmed())
                        .build());
                if (resolved != null) enrolledChildIds.add(resolved.getId());
            }
            montessoriRecordRepository.saveAll(records);
        }

        // Enrollment 자동 생성 (중복 스킵)
        for (Long childId : enrolledChildIds) {
            if (!enrollmentRepository.existsByChildIdAndClassroomId(childId, classroom.getId())) {
                Child child = childRepository.findById(childId).orElseThrow();
                enrollmentRepository.save(Enrollment.builder()
                        .child(child)
                        .classroom(classroom)
                        .year(classroom.getYear())
                        .build());
            }
        }

        return buildResponse(plan, sections, records);
    }

    // ---- 임시 파일 삭제 (거부) ----

    @Transactional
    public void cancelTemp(Long userId, String fileKey) {
        if (!fileKey.startsWith("activity-plans/" + userId + "/")) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        try {
            fileStorageService.delete(fileKey);
        } catch (Exception e) {
            log.warn("임시 파일 삭제 실패 (fileKey={}): {}", fileKey, e.getMessage());
            throw new BusinessException(ErrorCode.PENDING_FILE_NOT_FOUND);
        }
    }

    // ---- 헬퍼 ----

    private ActivityPlan findOwnedPlan(Long userId, Long planId) {
        ActivityPlan plan = activityPlanRepository.findById(planId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACTIVITY_PLAN_NOT_FOUND));
        if (!plan.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return plan;
    }

    private ClassroomMatchResult matchClassroom(Long userId, String nameFromHwp, LocalDate planDate) {
        if (nameFromHwp == null) return ClassroomMatchResult.willCreate("미지정", planDate.getYear());
        Integer year = planDate.getYear();
        return classroomRepository.findByUserIdAndYearAndName(userId, year, nameFromHwp)
                .map(c -> ClassroomMatchResult.useExisting(nameFromHwp, year, c))
                .orElseGet(() -> ClassroomMatchResult.willCreate(nameFromHwp, year));
    }

    private List<ChildMatchResult> matchChildren(Long userId, List<String> names) {
        List<ChildMatchResult> results = new ArrayList<>();
        for (String name : names) {
            // ENROLLED 정확 매칭 우선
            var exact = childRepository.findFirstByUserIdAndStatusAndName(userId, "ENROLLED", name);
            if (exact.isPresent()) {
                results.add(ChildMatchResult.useExisting(exact.get()));
                continue;
            }
            // 다른 상태의 동명이인 후보 탐색
            List<Child> candidates = childRepository.findByUserIdAndName(userId, name)
                    .stream().filter(c -> !"ENROLLED".equals(c.getStatus())).toList();
            if (!candidates.isEmpty()) {
                List<DuplicateCandidateResult> cands = candidates.stream()
                        .map(c -> DuplicateCandidateResult.builder()
                                .id(c.getId()).name(c.getName()).status(c.getStatus())
                                .birthDate(c.getBirthDate()).memo(c.getMemo())
                                .lastClassroomName(enrollmentRepository.findByChildIdOrderByYearDesc(c.getId())
                                        .stream().findFirst()
                                        .map(e -> e.getClassroom().getName()).orElse(null))
                                .build())
                        .toList();
                results.add(ChildMatchResult.withDuplicates(name, cands));
            } else {
                results.add(ChildMatchResult.willCreate(name));
            }
        }
        return results;
    }

    private void validateHwpExtension(String filename) {
        if (filename == null) throw new BusinessException(ErrorCode.INVALID_FILE_FORMAT);
        String lower = filename.toLowerCase();
        if (!lower.endsWith(".hwp") && !lower.endsWith(".hwpx")) {
            throw new BusinessException(ErrorCode.INVALID_FILE_FORMAT);
        }
    }

    private SectionCategory parseSectionCategory(String category) {
        if (category == null) return SectionCategory.OTHER;
        try {
            return SectionCategory.valueOf(category.toUpperCase());
        } catch (IllegalArgumentException e) {
            return SectionCategory.OTHER;
        }
    }

    private ActivityPlanResponse buildResponse(ActivityPlan plan,
                                                List<ActivitySection> sections,
                                                List<MontessoriRecord> records) {
        return ActivityPlanResponse.from(
                plan,
                sections.stream().map(ActivitySectionResponse::from).toList(),
                records.stream().map(MontessoriRecordResponse::from).toList()
        );
    }
}
