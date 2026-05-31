package com.teachersdrawer.backend.domain.activityPlan.dto.parser;

import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class HwpParseResponse {
    private ParsedMetadata metadata;
    private List<ParsedSection> sections;
    private List<ParsedMontessoriRecord> montessoriRecords;
    private String rawJson;
}
