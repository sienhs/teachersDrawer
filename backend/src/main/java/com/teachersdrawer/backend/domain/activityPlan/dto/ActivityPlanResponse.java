package com.teachersdrawer.backend.domain.activityPlan.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivityPlan;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ActivityPlanResponse {
    private Long id;
    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;
    private Long classroomId;
    private String fileName;
    private LocalDateTime createdAt;
    private List<ActivitySectionResponse> sections;
    private List<MontessoriRecordResponse> montessoriRecords;

    public static ActivityPlanResponse from(ActivityPlan plan,
                                            List<ActivitySectionResponse> sections,
                                            List<MontessoriRecordResponse> records) {
        return ActivityPlanResponse.builder()
                .id(plan.getId())
                .planDate(plan.getPlanDate())
                .subject(plan.getSubject())
                .teacherName(plan.getTeacherName())
                .classNameRaw(plan.getClassNameRaw())
                .classTimeRaw(plan.getClassTimeRaw())
                .classDayCount(plan.getClassDayCount())
                .classroomId(plan.getClassroom() != null ? plan.getClassroom().getId() : null)
                .fileName(plan.getFileName())
                .createdAt(plan.getCreatedAt())
                .sections(sections)
                .montessoriRecords(records)
                .build();
    }
}
