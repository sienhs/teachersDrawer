package com.teachersdrawer.backend.global.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner{
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	
	
	@Override
	public void run(ApplicationArguments args) throws Exception {
		
		// 이미 테스트 유저가 있으면 스킵
		if(userRepository.existsByEmail("test@test.com")) {
			log.info("테스트 유저가 이미 있어 스킵함");
			return;
		}
		
		User testUser = User.builder()
				.email("test@test.com")
				.password(passwordEncoder.encode("test1234"))
				.name("테스트선생님")
				.build();
		
		userRepository.save(testUser);
		log.info("테스트 유저 생성 : test@test.com / test1234");
	}

}
