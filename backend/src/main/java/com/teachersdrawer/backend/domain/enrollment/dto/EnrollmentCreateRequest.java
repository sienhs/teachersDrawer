package com.teachersdrawer.backend.domain.enrollment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class EnrollmentCreateRequest {

    @NotNull(message = "아이 ID를 입력해주세요.")
    private Long childId;

    @NotNull(message = "반 ID를 입력해주세요.")
    private Long classroomId;
}
