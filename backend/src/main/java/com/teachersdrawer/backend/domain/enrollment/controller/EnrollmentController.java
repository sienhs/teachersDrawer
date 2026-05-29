package com.teachersdrawer.backend.domain.enrollment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teachersdrawer.backend.domain.enrollment.dto.EnrollmentCreateRequest;
import com.teachersdrawer.backend.domain.enrollment.dto.EnrollmentResponse;
import com.teachersdrawer.backend.domain.enrollment.service.EnrollmentService;
import com.teachersdrawer.backend.global.response.ApiResponse;
import com.teachersdrawer.backend.global.security.CustomUserDetails;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    // POST /api/enrollments
    @PostMapping
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody EnrollmentCreateRequest request
    ) {
        EnrollmentResponse response = enrollmentService.enroll(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("반배정 성공", response));
    }

    // GET /api/enrollments/children/{childId}
    @GetMapping("/children/{childId}")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getByChild(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("childId") Long childId
    ) {
        List<EnrollmentResponse> response = enrollmentService.getEnrollmentsByChild(userDetails.getId(), childId);
        return ResponseEntity.ok(ApiResponse.success("아이 반배정 이력 조회 성공", response));
    }

    // GET /api/enrollments/classrooms/{classroomId}
    @GetMapping("/classrooms/{classroomId}")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getByClassroom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId
    ) {
        List<EnrollmentResponse> response = enrollmentService.getEnrollmentsByClassroom(userDetails.getId(), classroomId);
        return ResponseEntity.ok(ApiResponse.success("반 아이 명단 조회 성공", response));
    }

    // DELETE /api/enrollments/{enrollmentId}
    @DeleteMapping("/{enrollmentId}")
    public ResponseEntity<ApiResponse<Void>> unenroll(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("enrollmentId") Long enrollmentId
    ) {
        enrollmentService.unenroll(userDetails.getId(), enrollmentId);
        return ResponseEntity.ok(ApiResponse.success("반배정 해제 성공", null));
    }
}
