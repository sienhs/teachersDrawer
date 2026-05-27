package com.teachersdrawer.backend.global.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter{
	// OncePerRequestFilter 요청당 한번씩 실행되는 필터
	// 일반 필터는 foward나 include시에 중복으로 실행될 수 있음
	
	// UserDetailsService는 DB에서 유저 정보 조회해주는 인터페이스
	// 나중에 authservice가 이걸 구현
	private final JwtUtil jwtUtil;
	private final UserDetailsService userDetailsService;
	
	// Authorization헤더에서 Bearer토큰 추출
	private String extractToken(HttpServletRequest request) {
		String bearerToken = request.getHeader("Authorization");
		
		if(StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
			return bearerToken.substring(7); // bearer 이후 토큰만 잘라내기
		}
		return null;
	}
	
	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain
			) throws ServletException, IOException{
		// 요청헤더에서 토큰을 추출
		String token = extractToken(request);
		
		// 토큰이 있고 유효하면 인증 처리
		if(token != null && jwtUtil.isTokenValid(token)) {
			// 토큰에서 이메일을 추출
			String email = jwtUtil.extractEmail(token);
			
			// 아직 인증 안된 상태일 때만 처리 (중복인증방지)
			if(SecurityContextHolder.getContext().getAuthentication() == null) {
				// DB에서 유저 정보 조회
				UserDetails userDetails = userDetailsService.loadUserByUsername(email);
				
				// 인증 객체생성
				UsernamePasswordAuthenticationToken authentication =
						new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
				
				// 요청 정보 추가
				authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
				
				// SecurityContext에 인증 정보 저장
				SecurityContextHolder.getContext().setAuthentication(authentication);;
				log.debug("인증 성공: {}", email);
				
			}
		}
		filterChain.doFilter(request, response);
		
	}
}
