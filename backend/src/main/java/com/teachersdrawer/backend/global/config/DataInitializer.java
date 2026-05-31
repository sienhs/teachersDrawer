package com.teachersdrawer.backend.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner{
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final MinioClient minioClient;

	@Value("${minio.bucket-name}")
	private String bucketName;
	
	
	@Override
	public void run(ApplicationArguments args) throws Exception {
		initMinioBucket();
		initTestUser();
	}

	private void initMinioBucket() {
		try {
			boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
			if (!exists) {
				minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
				log.info("MinIO 버킷 생성: {}", bucketName);
			} else {
				log.info("MinIO 버킷 이미 존재: {}", bucketName);
			}
		} catch (Exception e) {
			log.error("MinIO 버킷 초기화 실패 (MinIO가 실행 중인지 확인): {}", e.getMessage());
		}
	}

	private void initTestUser() {
		if (userRepository.existsByEmail("test@test.com")) {
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
