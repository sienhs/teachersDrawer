package com.teachersdrawer.backend.domain.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teachersdrawer.backend.domain.auth.dto.LoginRequest;
import com.teachersdrawer.backend.domain.auth.dto.LoginResponse;
import com.teachersdrawer.backend.domain.auth.service.AuthService;
import com.teachersdrawer.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth") // 엔드 포인트
@RequiredArgsConstructor
public class AuthController {
	private final AuthService authService;
	
	public ResponseEntity<ApiResponse<LoginResponse>> login(
			// 요청 바디의 json을 loginRequest 객체로 반환함
			// 그다음 @Valid가 loginRequest의 @Email, @NotBlank 검증을 실행함
			// 실패하면 GlobalExceptionHandler가 잡아서 400 반환
			@RequestBody @Valid LoginRequest request){
		LoginResponse response = authService.login(request);
		return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
	}
}
