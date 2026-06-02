package com.teachersdrawer.backend.domain.activityPlan.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.teachersdrawer.backend.domain.activityPlan.dto.ActivityPlanResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.ActivityPlanSummaryResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.MontessoriRecordResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.analyze.ActivityPlanAnalysisResponse;
import com.teachersdrawer.backend.domain.activityPlan.dto.confirm.ActivityPlanConfirmRequest;
import com.teachersdrawer.backend.domain.activityPlan.service.ActivityPlanService;
import com.teachersdrawer.backend.global.response.ApiResponse;
import com.teachersdrawer.backend.global.security.CustomUserDetails;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/activity-plans")
@RequiredArgsConstructor
public class ActivityPlanController {

    private final ActivityPlanService activityPlanService;

    // HWP 분석 (DB 저장 X, 팝업용)
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ActivityPlanAnalysisResponse>> analyze(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "classroomId", required = false) Long classroomId
    ) {
        ActivityPlanAnalysisResponse response = activityPlanService.analyze(userDetails.getId(), file, classroomId);
        return ResponseEntity.ok(ApiResponse.success("HWP 분석 완료", response));
    }

    // 확정 저장
    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<ActivityPlanResponse>> confirm(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody @Valid ActivityPlanConfirmRequest request
    ) {
        ActivityPlanResponse response = activityPlanService.confirm(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("활동계획안 저장 완료", response));
    }

    // 임시 파일 삭제 (거부)
    @DeleteMapping("/temp")
    public ResponseEntity<ApiResponse<Void>> cancelTemp(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("fileKey") String fileKey
    ) {
        activityPlanService.cancelTemp(userDetails.getId(), fileKey);
        return ResponseEntity.ok(ApiResponse.success("임시 파일 삭제 완료", null));
    }

    // HWP 업로드 (레거시 — 자동 확정)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ActivityPlanResponse>> upload(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "classroomId", required = false) Long classroomId
    ) {
        ActivityPlanResponse response = activityPlanService.upload(userDetails.getId(), file, classroomId);
        return ResponseEntity.ok(ApiResponse.success("활동계획안 업로드 성공", response));
    }

    // 내 활동계획안 목록
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityPlanSummaryResponse>>> getMyPlans(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "classroomId", required = false) Long classroomId,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        List<ActivityPlanSummaryResponse> response = activityPlanService.getMyPlans(
                userDetails.getId(), classroomId, from, to);
        return ResponseEntity.ok(ApiResponse.success("활동계획안 목록 조회 성공", response));
    }

    // 상세 조회
    @GetMapping("/{planId}")
    public ResponseEntity<ApiResponse<ActivityPlanResponse>> getPlan(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("planId") Long planId
    ) {
        ActivityPlanResponse response = activityPlanService.getPlan(userDetails.getId(), planId);
        return ResponseEntity.ok(ApiResponse.success("활동계획안 상세 조회 성공", response));
    }

    // 삭제
    @DeleteMapping("/{planId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("planId") Long planId
    ) {
        activityPlanService.delete(userDetails.getId(), planId);
        return ResponseEntity.ok(ApiResponse.success("활동계획안 삭제 성공", null));
    }

    // 원본 HWP 파일 교체 (편집 후 자동 저장)
    @PutMapping(value = "/{planId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Void>> updateFile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("planId") Long planId,
            @RequestParam("file") MultipartFile file
    ) {
        activityPlanService.updateFile(userDetails.getId(), planId, file);
        return ResponseEntity.ok(ApiResponse.success("파일 업데이트 완료", null));
    }

    // 원본 HWP 다운로드
    @GetMapping("/{planId}/file")
    public ResponseEntity<byte[]> downloadFile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("planId") Long planId
    ) {
        ActivityPlanService.FileDownload result = activityPlanService.downloadFile(userDetails.getId(), planId);
        String filename = result.fileName() != null ? result.fileName() : "file.hwp";
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encodedFilename)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(result.bytes());
    }

    // 아이별 몬테소리 활동 이력
    @GetMapping("/children/{childId}/montessori")
    public ResponseEntity<ApiResponse<List<MontessoriRecordResponse>>> getChildMontessoriHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("childId") Long childId
    ) {
        List<MontessoriRecordResponse> response = activityPlanService.getChildMontessoriHistory(
                userDetails.getId(), childId);
        return ResponseEntity.ok(ApiResponse.success("몬테소리 활동 이력 조회 성공", response));
    }
}
