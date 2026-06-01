package com.teachersdrawer.backend.domain.activityPlan.dto.analyze;

import java.time.LocalDate;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DuplicateCandidateResult {
    private Long id;
    private String name;
    private String status;
    private LocalDate birthDate;
    private String memo;
    private String lastClassroomName;
}
