package com.teachersdrawer.backend.domain.classroom.controller;

import com.teachersdrawer.backend.domain.classroom.dto.ClassroomCreateRequest;
import com.teachersdrawer.backend.domain.classroom.dto.ClassroomResponse;
import com.teachersdrawer.backend.domain.classroom.dto.ClassroomUpdateRequest;
import com.teachersdrawer.backend.domain.classroom.service.ClassroomService;
import com.teachersdrawer.backend.global.response.ApiResponse;
import com.teachersdrawer.backend.global.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final ClassroomService classroomService;

    // 반 생성
    // POST /api/classrooms
    @PostMapping
    public ResponseEntity<ApiResponse<ClassroomResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ClassroomCreateRequest request
    ) {
        ClassroomResponse response = classroomService.create(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("반 생성 성공", response));
    }

    // 내 반 목록 조회 (전체 또는 상태별)
    // GET /api/classrooms (전체)
    // GET /api/classrooms?status=ACTIVE (현재반)
    // GET /api/classrooms?status=ARCHIVED (아카이브된 반)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> getMyClassrooms(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<ClassroomResponse> response = (status == null)
                ? classroomService.getMyClassrooms(userDetails.getId())
                : classroomService.getMyClassroomsByStatus(userDetails.getId(), status);
        return ResponseEntity.ok(ApiResponse.success("반 목록 조회 성공", response));
    }

    // 반 단건 조회
    // GET /api/classrooms/{classroomId}
    @GetMapping("/{classroomId}")
    public ResponseEntity<ApiResponse<ClassroomResponse>> getClassroom(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId
    ) {
        ClassroomResponse response = classroomService.getClassroom(userDetails.getId(), classroomId);
        return ResponseEntity.ok(ApiResponse.success("반 조회 성공", response));
    }

 // 반 이름 수정
    // PUT /api/classrooms/{classroomId}
    @PutMapping("/{classroomId}")
    public ResponseEntity<ApiResponse<ClassroomResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId,
            @Valid @RequestBody ClassroomUpdateRequest request
    ) {
        ClassroomResponse response = classroomService.update(userDetails.getId(), classroomId, request);
        return ResponseEntity.ok(ApiResponse.success("반 수정 성공", response));
    }

    // 반 아카이브 (학년 마치고 보관)
    // POST /api/classrooms/{classroomId}/archive
    @PostMapping("/{classroomId}/archive")
    public ResponseEntity<ApiResponse<ClassroomResponse>> archive(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId
    ) {
        ClassroomResponse response = classroomService.archive(userDetails.getId(), classroomId);
        return ResponseEntity.ok(ApiResponse.success("반 아카이브 완료", response));
    }

    // 반 복구
    // POST /api/classrooms/{classroomId}/activate
    @PostMapping("/{classroomId}/activate")
    public ResponseEntity<ApiResponse<ClassroomResponse>> activate(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId
    ) {
        ClassroomResponse response = classroomService.activate(userDetails.getId(), classroomId);
        return ResponseEntity.ok(ApiResponse.success("반 복구 완료", response));
    }

    // 반 삭제 (아카이브된 반은 삭제 불가)
    // DELETE /api/classrooms/{classroomId}
    @DeleteMapping("/{classroomId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("classroomId") Long classroomId
    ) {
        classroomService.delete(userDetails.getId(), classroomId);
        return ResponseEntity.ok(ApiResponse.success("반 삭제 성공", null));
    }
}