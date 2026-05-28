package com.teachersdrawer.backend.global.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.teachersdrawer.backend.global.security.JwtFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
// @RequiredArgsConstructor
public class SecurityConfig {
	/*
	 * 
	 * Spring Boot 4.0에서 파라미터 이름 정보를 컴파일 시점에 보존하는 방식이 변경됨.
	 * 그래서 Spring이 생성자를 보고 주입할 bean을 찾을때 파라미터 이름을 보고 같은 이름의 bean을 찾음
	 * 이전엔 컴파일러가 파라미터 이름을 바이트코드에 자동으로 보존해줬는데 spring 6.1부터 컴파일러 옵션(-parameters)이 없으면
	 * 파라미터 이름 정보가 날아감
	 * 
	 * 일단은 build.gradle 에 옵션 작성하는걸로 수정하겠음.
	 * 
	 * */
	
	// JwtFilter를 주입 자동 생성자 생성
	private final JwtFilter jwtFilter;
	private final CorsConfigurationSource corsConfigurationSource;
	

	public SecurityConfig(
			JwtFilter jwtFilter,
			// Bean 명시적 지정
			@Qualifier("corsConfigurationSource") CorsConfigurationSource corsConfigurationSource
			) {
		this.jwtFilter = jwtFilter;
		this.corsConfigurationSource = corsConfigurationSource;
	}
	
	
	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
		http
		// CorsCofing 적용
		.cors(cors -> cors.configurationSource(corsConfigurationSource))
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
				.anyRequest().authenticated())
		.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
		
		return http.build();
	}
	
	@Bean
	public PasswordEncoder passEncoder() {
		return new BCryptPasswordEncoder();
	}
}
