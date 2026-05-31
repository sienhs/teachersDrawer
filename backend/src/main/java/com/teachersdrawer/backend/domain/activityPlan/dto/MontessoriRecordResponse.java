package com.teachersdrawer.backend.domain.activityPlan.dto;

import java.time.LocalDate;

import com.teachersdrawer.backend.domain.activityPlan.entity.MontessoriRecord;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MontessoriRecordResponse {
    private Long id;
    private String childNameRaw;
    private Long childId;
    private String area;
    private String material;
    private String confirmed;
    private LocalDate planDate;

    public static MontessoriRecordResponse from(MontessoriRecord record) {
        return MontessoriRecordResponse.builder()
                .id(record.getId())
                .childNameRaw(record.getChildNameRaw())
                .childId(record.getChild() != null ? record.getChild().getId() : null)
                .area(record.getArea())
                .material(record.getMaterial())
                .confirmed(record.getConfirmed())
                .build();
    }

    public static MontessoriRecordResponse fromWithPlanDate(MontessoriRecord record) {
        return MontessoriRecordResponse.builder()
                .id(record.getId())
                .childNameRaw(record.getChildNameRaw())
                .childId(record.getChild() != null ? record.getChild().getId() : null)
                .area(record.getArea())
                .material(record.getMaterial())
                .confirmed(record.getConfirmed())
                .planDate(record.getActivityPlan().getPlanDate())
                .build();
    }
}
