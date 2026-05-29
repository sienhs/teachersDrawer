package com.teachersdrawer.backend.domain.enrollment.dto;

import com.teachersdrawer.backend.domain.enrollment.entity.Enrollment;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EnrollmentResponse {

    private Long id;
    private Long childId;
    private String childName;
    private Long classroomId;
    private String classroomName;
    private Integer year;

    public static EnrollmentResponse from(Enrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .childId(enrollment.getChild().getId())
                .childName(enrollment.getChild().getName())
                .classroomId(enrollment.getClassroom().getId())
                .classroomName(enrollment.getClassroom().getName())
                .year(enrollment.getYear())
                .build();
    }
}
