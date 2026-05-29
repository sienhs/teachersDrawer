package com.teachersdrawer.backend.domain.enrollment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class EnrollmentCreateRequest {

    @NotNull
    private Long childId;

    @NotNull
    private Long classroomId;
}
