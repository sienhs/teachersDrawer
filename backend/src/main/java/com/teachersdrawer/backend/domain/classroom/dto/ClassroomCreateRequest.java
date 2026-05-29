package com.teachersdrawer.backend.domain.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ClassroomCreateRequest {
	@NotNull(message = "연도를 입력해주세요.")
	private Integer year;
	
	@NotBlank(message = "반 이름을 입력해주세요.")
	private String name;
}
