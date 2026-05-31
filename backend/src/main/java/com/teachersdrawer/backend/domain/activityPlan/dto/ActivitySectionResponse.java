package com.teachersdrawer.backend.domain.activityPlan.dto;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivitySection;
import com.teachersdrawer.backend.domain.activityPlan.entity.SectionCategory;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ActivitySectionResponse {
    private Long id;
    private Integer orderIndex;
    private String label;
    private String content;
    private SectionCategory category;

    public static ActivitySectionResponse from(ActivitySection section) {
        return ActivitySectionResponse.builder()
                .id(section.getId())
                .orderIndex(section.getOrderIndex())
                .label(section.getLabel())
                .content(section.getContent())
                .category(section.getCategory())
                .build();
    }
}
