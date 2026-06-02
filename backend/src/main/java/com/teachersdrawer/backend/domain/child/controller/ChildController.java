package com.teachersdrawer.backend.domain.child.controller;

import com.teachersdrawer.backend.domain.child.dto.ChildCreateRequest;
import com.teachersdrawer.backend.domain.child.dto.ChildResponse;
import com.teachersdrawer.backend.domain.child.dto.ChildUpdateRequest;
import com.teachersdrawer.backend.domain.child.service.ChildService;
import com.teachersdrawer.backend.global.response.ApiResponse;
import com.teachersdrawer.backend.global.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/children")
@RequiredArgsConstructor
public class ChildController {

    private final ChildService childService;

    // 아이 등록
    // POST /api/children
    @PostMapping
    public ResponseEntity<ApiResponse<ChildResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ChildCreateRequest request
    ) {
        ChildResponse response = childService.create(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("아이 등록 성공", response));
    }

    // 내 아이 목록 조회
    // GET /api/children?status=ENROLLED|PENDING|ALL (기본: ENROLLED)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ChildResponse>>> getMyChildren(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(name = "status", required = false) String status
    ) {
        List<ChildResponse> response = childService.getMyChildrenByStatus(userDetails.getId(), status);
        return ResponseEntity.ok(ApiResponse.success("아이 목록 조회 성공", response));
    }

    // 아이 단건 조회
    // GET /api/children/{childId}
    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<ChildResponse>> getChild(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("childId") Long childId
    ) {
        ChildResponse response = childService.getChild(userDetails.getId(), childId);
        return ResponseEntity.ok(ApiResponse.success("아이 조회 성공", response));
    }

    // 아이 수정
    // PUT /api/children/{childId}
    @PutMapping("/{childId}")
    public ResponseEntity<ApiResponse<ChildResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("childId") Long childId,
            @Valid @RequestBody ChildUpdateRequest request
    ) {
        ChildResponse response = childService.update(userDetails.getId(), childId, request);
        return ResponseEntity.ok(ApiResponse.success("아이 수정 성공", response));
    }

    // 아이 삭제
    // DELETE /api/children/{childId}
    @DeleteMapping("/{childId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("childId") Long childId
    ) {
        childService.delete(userDetails.getId(), childId);
        return ResponseEntity.ok(ApiResponse.success("아이 삭제 성공", null));
    }
}