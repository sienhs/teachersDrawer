package com.teachersdrawer.backend.domain.activityPlan.dto.confirm;

import java.time.LocalDate;
import java.util.List;

import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedMontessoriRecord;
import com.teachersdrawer.backend.domain.activityPlan.dto.parser.ParsedSection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ActivityPlanConfirmRequest {
    /** null이면 신규 생성, non-null이면 기존 plan 업데이트 모드 */
    private Long existingPlanId;

    @NotBlank
    private String fileKey;
    @NotBlank
    private String fileName;

    @NotNull
    private LocalDate planDate;
    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;
    private String rawJson;

    // 파서 결과 (재파싱 없이 프론트에서 그대로 전달)
    private List<ParsedSection> sections;
    private List<ParsedMontessoriRecord> montessoriRecords;

    @NotNull
    private ClassroomActionRequest classroomAction;

    @NotNull
    private List<ChildActionRequest> childActions;
}
