package com.teachersdrawer.backend.domain.activityPlan.dto.parser;

import java.time.LocalDate;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ParsedMetadata {
    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;
}
