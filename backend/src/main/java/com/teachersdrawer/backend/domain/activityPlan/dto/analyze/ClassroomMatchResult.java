package com.teachersdrawer.backend.domain.activityPlan.dto.analyze;

import com.teachersdrawer.backend.domain.classroom.entity.Classroom;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ClassroomMatchResult {
    private String nameFromHwp;
    private Integer yearFromHwp;
    private Long existingId;
    private String existingName;
    private String existingStatus;
    private boolean willCreate;

    public static ClassroomMatchResult useExisting(String nameFromHwp, Integer yearFromHwp, Classroom classroom) {
        return ClassroomMatchResult.builder()
                .nameFromHwp(nameFromHwp)
                .yearFromHwp(yearFromHwp)
                .existingId(classroom.getId())
                .existingName(classroom.getName())
                .existingStatus(classroom.getStatus())
                .willCreate(false)
                .build();
    }

    public static ClassroomMatchResult willCreate(String nameFromHwp, Integer yearFromHwp) {
        return ClassroomMatchResult.builder()
                .nameFromHwp(nameFromHwp)
                .yearFromHwp(yearFromHwp)
                .existingId(null)
                .existingName(null)
                .existingStatus(null)
                .willCreate(true)
                .build();
    }
}
