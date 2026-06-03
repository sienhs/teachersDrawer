package com.teachersdrawer.backend.domain.activityPlan.dto.analyze;

import java.time.LocalDate;
import java.util.List;

import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedMontessoriRecord;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedSection;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 프론트엔드 extractActivityPlan() 결과 — analyze API에 multipart로 전달됨.
 * hwp-parser 폐기 후 파싱 주체가 프론트(rhwp/core)로 이동.
 */
@Getter
@NoArgsConstructor
public class FrontendParsedPlan {
    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;
    private List<ParsedSection> sections;
    private List<ParsedMontessoriRecord> montessoriRecords;
    private String rawJson;
}
