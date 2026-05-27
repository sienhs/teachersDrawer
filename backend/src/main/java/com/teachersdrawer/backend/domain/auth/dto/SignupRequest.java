package com.teachersdrawer.backend.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;

@Getter
public class SignupRequest {
	
	@Email(message = "이메일 형식이 올바르지 않습니다.")
	@NotBlank(message = "이메일을 입력해주세요.")
	private String email;
	
	@NotBlank(message = "비밀번호를 입력해주세요.")
	@Pattern(
			regexp = "^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
			message = "비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다."
			)
	private String password;
	
	@NotBlank(message = "이름을 입력해주세요")
	private String name;
}
