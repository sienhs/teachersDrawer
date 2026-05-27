package com.teachersdrawer.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
	
	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
		http
		// CSRF 비활성화
		// csrf는 브라우저 세션 기반 공격인데, JWT는 세션을 안써서 공격자체가 불가능.
		// 비활성화해도 안전함
		.csrf(AbstractHttpConfigurer::disable)
		// 기본 폼 로그인 방식 비활성화
		// rest api + jwt 쓸때는 폼 로그인 안쓴대
		.formLogin(AbstractHttpConfigurer::disable)
		// HTTP Basic 인증 비활성화
		// basic인증은 author: Basic base64(id:pw) 헤더방식인데 jwt쓸거라 필요 없음
		.httpBasic(AbstractHttpConfigurer::disable)
		
		// 세션 비활성화
		// jwt는 stateless라서 세션을 만들지도, 사용하지도 않는다는 선언
		.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
		
		// 요청별 접근 권한 설정
		.authorizeHttpRequests(auth -> auth
				// 로그인 회원가입은 토큰 없이 누구나 가능하게 끔
				.requestMatchers("/api/auth/**").permitAll()
				// 나머지 요청은 인증이 필요하게
				.anyRequest().authenticated());
		
		return http.build();
	}
	
	@Bean
	public PasswordEncoder passEncoder() {
		return new BCryptPasswordEncoder();
	}
}
