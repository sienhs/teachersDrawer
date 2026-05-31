package com.teachersdrawer.backend.domain.activityPlan.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivityPlan;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ActivityPlanSummaryResponse {
    private Long id;
    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private Long classroomId;
    private String fileName;
    private LocalDateTime createdAt;

    public static ActivityPlanSummaryResponse from(ActivityPlan plan) {
        return ActivityPlanSummaryResponse.builder()
                .id(plan.getId())
                .planDate(plan.getPlanDate())
                .subject(plan.getSubject())
                .teacherName(plan.getTeacherName())
                .classNameRaw(plan.getClassNameRaw())
                .classroomId(plan.getClassroom() != null ? plan.getClassroom().getId() : null)
                .fileName(plan.getFileName())
                .createdAt(plan.getCreatedAt())
                .build();
    }
}
