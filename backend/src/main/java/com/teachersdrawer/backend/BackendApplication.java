package com.teachersdrawer.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing // created, updated At 자동 주입 활성화하는거
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
/*
 * 
# 환경변수로 오버라이드
CORS_ALLOWED_ORIGINS=https://teachersdrawer.com ./gradlew bootRun

# Docker 실행 시
docker run -e CORS_ALLOWED_ORIGINS=https://teachersdrawer.com ...
 */
