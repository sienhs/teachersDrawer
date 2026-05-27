package com.teachersdrawer.backend.domain.auth.controller;

import com.teachersdrawer.backend.domain.auth.repository.RefreshTokenRepository;

import java.util.Arrays;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teachersdrawer.backend.domain.auth.dto.LoginRequest;
import com.teachersdrawer.backend.domain.auth.dto.LoginResponse;
import com.teachersdrawer.backend.domain.auth.service.AuthService;
import com.teachersdrawer.backend.global.response.ApiResponse;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth") // 엔드 포인트
@RequiredArgsConstructor
public class AuthController {
	private final RefreshTokenRepository refreshTokenRepository;
	private final AuthService authService;
	
	// 쿠키 이름 상수
	private static final String REFRESH_TOKEN_COOKIE = "refresh_token";
	
	@PostMapping("/login")
	public ResponseEntity<ApiResponse<LoginResponse>> login(
			// 요청 바디의 json을 loginRequest 객체로 반환함
			// 그다음 @Valid가 loginRequest의 @Email, @NotBlank 검증을 실행함
			// 실패하면 GlobalExceptionHandler가 잡아서 400 반환
			@RequestBody @Valid LoginRequest request,
			HttpServletResponse response){
		LoginResponse loginResponse = authService.login(request); // 쿠키를 위해 response를 인자로 받아서 loginResponse로 이름 변경
		
		// refreshtoken을 httpOnly cookie에 저장
		// js 접근불가 -> XSS 공격으로 탈취 불가
		setRefreshTokenCooke(response, loginResponse.getRefreshToken());
		
		LoginResponse safeResponse = LoginResponse.builder()
				.accessToken(loginResponse.getAccessToken())
				.name(loginResponse.getName())
				.email(loginResponse.getEmail())
				.build();
		
		return ResponseEntity.ok(ApiResponse.success("로그인 성공", safeResponse));
	}
	
	// HttpOnly 쿠키 세팅 헬퍼
	private void setRefreshTokenCooke(HttpServletResponse response, String token) {
		Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, token);
		cookie.setHttpOnly(true); // js 접근 차단
		cookie.setSecure(false); // TODO: 운영환경에서는 true로 변경해야함 - https 필수
		cookie.setPath("/"); // 모든 경로 전송
		cookie.setMaxAge(60 * 60 * 24 * 7); // 7일 단위
		response.addCookie(cookie); 
	}
	// Cookie에서 Refresh token 추출 헬퍼
	private String extractRefreshTokenFromCookie(HttpServletRequest request) {
		if(request.getCookies() == null) {
			throw new IllegalArgumentException("쿠키가 없습니다.");
		}
		return Arrays.stream(request.getCookies())
				.filter(c -> REFRESH_TOKEN_COOKIE.equals(c.getName()))
				.map(Cookie::getValue)
				.findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Refresh Token 쿠키가 없습니다."));
	}
	@PostMapping("/reissue")
	public ResponseEntity<ApiResponse<String>> reissue(HttpServletRequest request){
		// 쿠키에서 refresh token을 꺼냄
		String refreshToken = extractRefreshTokenFromCookie(request);
		String newAccessToken = authService.reissue(refreshToken);
		return ResponseEntity.ok(ApiResponse.success("토큰 재발급 성공", newAccessToken));
	}
	
	@PostMapping("/logout")
	public ResponseEntity<ApiResponse<Void>> logout(
				HttpServletRequest request,
				HttpServletResponse response){
		String refreshToken = extractRefreshTokenFromCookie(request);
		
		if(refreshToken != null && !refreshToken.isBlank()) {
			// JWT 이메일 꺼내서 DB 토큰 삭제
			// JwtUtil 직접 쓰지 않고 Service에서 처리하도록 email 추출은 생략
            // TODO:실제로는 SecurityContext에서 꺼내는 게 맞음 -> 추후 개선
		}
		
		Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, null);
		cookie.setMaxAge(0);
		cookie.setPath("/");
		response.addCookie(cookie);
		
		return ResponseEntity.ok(ApiResponse.success("로그아웃 성공"));	
	}
}

