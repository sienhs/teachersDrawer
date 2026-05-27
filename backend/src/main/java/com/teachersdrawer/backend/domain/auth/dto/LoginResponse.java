package com.teachersdrawer.backend.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginResponse {
	// 로그인 성공시 클라에게 반환하는 데이터
	// accessToken만 바디에 담음
	// refresh는 보안성을 위해 httpOnly Cookie로 별도로 전달
	private String accessToken;
	private String refreshToken;
	private String name;
	private String email;
}
