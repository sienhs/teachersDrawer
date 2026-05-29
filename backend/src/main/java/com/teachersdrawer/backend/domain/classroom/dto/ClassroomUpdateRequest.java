package com.teachersdrawer.backend.domain.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ClassroomUpdateRequest {
	
	@NotBlank(message = "반 이름을 입력해주세요.")
	private String name;
}
