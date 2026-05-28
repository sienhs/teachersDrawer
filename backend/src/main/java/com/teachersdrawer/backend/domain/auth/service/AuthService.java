package com.teachersdrawer.backend.domain.auth.service;

import java.time.LocalDateTime;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teachersdrawer.backend.domain.auth.dto.LoginRequest;
import com.teachersdrawer.backend.domain.auth.dto.LoginResponse;
import com.teachersdrawer.backend.domain.auth.dto.SignupRequest;
import com.teachersdrawer.backend.domain.auth.entity.RefreshToken;
import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.RefreshTokenRepository;
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
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtUtil;

	
	// 로그인
	// readOnly = true는 SELECT만 하는 트랜잭션으로 약간의 성능 최적화를 기대
	/* { 좀더 자세히 알아보니
	 * 		JPA의 영속성 컨텍스트가 수행하는 변경 감지 기능 때문에이다.
	 * 변경감지란?
	 * 		트랜잭션이 commit 될 때 초기상태의 정보를 가지는 스냅샷과 엔티티의 상태를 비교하여 변경된 내용에 대해 update쿼리를 생성해 쓰기 지연 저장소에 저장한다.
	 * 		그 후에 일괄적으로 쓰기 지연 저장소에 있는 SQL쿼리를 flush하고 데이터베이스의 트랜잭션을 커밋함으로써
	 * 		update와 같은 메서드를 사용하지 않고도 엔티티 수정이 이루어진다. 이를 변경 감지라고 함.
	 * 
	 * 그래서, readOnly = true를 설정하면 JPA의 세션 플러시 모드를 MANUAL로 설정한다.
	 * (MANUAL 모드 : 사용자가 수동으로 flush하지 않으면 자동으로 flush를 수행하지 않음)
	 * 	이를 통해 트랜잭션 커밋시 조회용으로 가져온 엔티티의 예상치 못한 수정을 방지할 수 있다.
	 * 
	 * 게다가 JPA가 해당 트랜잭션 내에서 조회하는 엔티티는 조회용이라 인식하고 변경 감지를 위한
	 * 스냅샷을 따로 보관하지 않으므로 메모리가 절약되는 성능상 이점이 생긴다. }
	 * 
	 * ㅋㅋ 근데 여기선 못씀.........
	 */
	@Transactional
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
		String refreshToken = jwtUtil.generateRefreshToken(user.getEmail());
		
		// RefreshToken DB 저장 (있으면 갱신, 없으면 생성)
		refreshTokenRepository.findByEmail(user.getEmail())
				.ifPresentOrElse(
						token -> token.updateToken(refreshToken, LocalDateTime.now().plusDays(7)),
						() -> refreshTokenRepository.save(
								RefreshToken.builder()
								.email(user.getEmail())
								.token(refreshToken)
								.expiresAt(LocalDateTime.now().plusDays(7))
								.build()));
		
		
		log.info("로그인 성공: {}", user.getEmail());
		
		return LoginResponse.builder()
				.accessToken(accessToken)
				.name(user.getName())
				.email(user.getEmail())
				.refreshToken(refreshToken)
				.schoolName(user.getSchoolName())
		        .schoolType(user.getSchoolType())
				.build();
	}
	
	@Transactional
	public String reissue(String refreshToken) {
		// 토큰 유효성 검증
		if(!jwtUtil.isTokenValid(refreshToken)) {
			throw new BusinessException(ErrorCode.INVALID_TOKEN);
		}
		
		// DB에서 토큰 조회 - 탈취됐는지
		RefreshToken saved = refreshTokenRepository.findByToken(refreshToken)
				.orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
		
		// 만료 시간 확인
		if(saved.getExpiresAt().isBefore(LocalDateTime.now())) {
			throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
		}
		
		return jwtUtil.generateAccessToken(saved.getEmail());
	}
	
	@Transactional
	public void logout(String email) {
		refreshTokenRepository.deleteByEmail(email);
		log.info("로그아웃: {}", email);
	}
	
	// 회원가입 부분
	@Transactional
	public void signup(SignupRequest request) {
		if(userRepository.existsByEmail(request.getEmail())) {
			throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
		}
		
		userRepository.save(User.builder()
				.email(request.getEmail())
				.password(passwordEncoder.encode(request.getPassword()))
				.name(request.getName())
				.schoolCode(request.getSchoolCode())
				.schoolName(request.getSchoolName())
				.schoolType(request.getSchoolType())
				.build());
		log.info("회원가입 성공: {}", request.getEmail());
		
	}

}
