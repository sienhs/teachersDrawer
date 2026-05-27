package com.teachersdrawer.backend.domain.auth.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teachersdrawer.backend.domain.auth.dto.LoginRequest;
import com.teachersdrawer.backend.domain.auth.dto.LoginResponse;
import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;
import com.teachersdrawer.backend.global.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
	// SpringSecurity가 유저 정보 조회할 때 이 구현체를 사용
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtUtil;

	
	// 로그인
	// readOnly = true는 SELECT만 하는 트랜잭션으로 약간의 성능 최적화를 기대
	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		// 이메일로 유저 조회
		User user = userRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
		
		// 비밀번호 검증
		// passwordEncoder.matches(평문, 암호화값)
		// DB에는 BCrypt 해시 값이 있어서 직접 비교가 불가능하다.
		// 그래서 matches로 검증함
		if(!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
			throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
		}
		
		// 토큰 생성
		String accessToken = jwtUtil.generateAccessToken(user.getEmail());
		
		log.info("로그인 성공: {}", user.getEmail());
		
		return LoginResponse.builder()
				.accessToken(accessToken)
				.name(user.getName())
				.email(user.getEmail())
				.build();
	}

}
