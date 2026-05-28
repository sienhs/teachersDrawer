package com.teachersdrawer.backend.global.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {
	
	// 운영 환경에서는 환경변수 CORS_ALLOWD_ORIGINS로 오버라이드
	@Value("${cors.allowed-origins}") // application.yml 참고
    private String allowedOrigins;
	
	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		
		// 허용 서버 (프론트) 더 추가될 수도 
		config.setAllowedOrigins(
				List.of(allowedOrigins.split(","))
				);
		
		// 허용할 http 메서드
		config.setAllowedMethods(List.of(
				"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
				));
		
		// 허용할 헤더
		// Authorization -> JWT accessToken 전송용
		config.setAllowedHeaders(List.of(
				"Authorization",
				"Content-Type"
				));
		
		// 자격증명 허용 (cookie)
		// true여야 refresh token 쿠키가 요청에 포함됨 false면 쿠키가 아예 안날아감
		config.setAllowCredentials(true);
		
		// 응답 헤더 노출
		config.setExposedHeaders(List.of("Authorization"));
		
		// preflight 요청 캐시 초 단위 시간
		config.setMaxAge(3600L);
		
		// 모든 경로에 위 설정들을 적용
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		
		return source;
		
	}
}
