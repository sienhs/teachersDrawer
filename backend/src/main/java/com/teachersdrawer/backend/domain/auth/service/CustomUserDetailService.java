package com.teachersdrawer.backend.domain.auth.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.teachersdrawer.backend.domain.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {
	// AuthService에서 순환참조 발생으로 따로 뺌.
	private final UserRepository userRepository;
	
	
	// Spring Security가 내부적으로 호출하는 메서드
	// JwtFilter가 DB유저 조회할 때 여기로 옴
	@Override
	public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
		return userRepository.findByEmail(email)
				.map(user -> org.springframework.security.core.userdetails.User
						.withUsername(user.getEmail())
						.password(user.getPassword())
						.roles("USER")
						.build()
				).orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다: " + email));
	}
	
}
