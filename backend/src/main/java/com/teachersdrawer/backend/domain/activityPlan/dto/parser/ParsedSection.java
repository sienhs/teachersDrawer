package com.teachersdrawer.backend.domain.activityPlan.dto.parser;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ParsedSection {
    private Integer orderIndex;
    private String label;
    private String content;
    private String category;
}
