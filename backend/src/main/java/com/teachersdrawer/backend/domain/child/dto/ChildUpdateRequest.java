package com.teachersdrawer.backend.domain.child.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ChildUpdateRequest {
	
	@NotBlank(message = "아이 이름을 입력해주세요.")
	private String name;
	
	
	private LocalDate birthDate;
	private String gender;
	private String memo;
	private String status; // 재원/졸업/퇴소 변경용
}
