package com.teachersdrawer.backend.domain.activityPlan.dto.parser;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ParsedMontessoriRecord {
    private String childNameRaw;
    private String area;
    private String material;
    private String confirmed;
}
