package com.teachersdrawer.backend.domain.activityPlan.dto.confirm;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChildActionRequest {
    private String nameFromHwp;
    /** USE_EXISTING | CREATE_NEW | MERGE_WITH */
    private String action;
    private Long existingChildId;
    private Long mergeTargetId;
}
