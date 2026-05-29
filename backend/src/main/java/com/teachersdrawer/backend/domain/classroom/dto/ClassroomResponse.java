package com.teachersdrawer.backend.domain.classroom.dto;

import com.teachersdrawer.backend.domain.classroom.entity.Classroom;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ClassroomResponse {

    private Long id;
    private Integer year;
    private String name;
    private String status;

    // 반 
    public static ClassroomResponse from(Classroom classroom) {
        return ClassroomResponse.builder()
                .id(classroom.getId())
                .year(classroom.getYear())
                .name(classroom.getName())
                .status(classroom.getStatus())
                .build();
    }
}