package com.teachersdrawer.backend.domain.activityPlan.dto.analyze;

import java.time.LocalDate;
import java.util.List;

import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedMontessoriRecord;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedSection;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ActivityPlanAnalysisResponse {
    private String fileKey;
    private String fileName;

    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;

    private ClassroomMatchResult classroom;
    private List<ChildMatchResult> children;

    private List<ParsedSection> sections;
    private List<ParsedMontessoriRecord> montessoriRecords;

    private String rawJson;
}
