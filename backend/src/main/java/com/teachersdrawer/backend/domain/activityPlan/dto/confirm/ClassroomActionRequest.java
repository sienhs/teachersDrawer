package com.teachersdrawer.backend.domain.activityPlan.dto.confirm;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ClassroomActionRequest {
    private boolean useExisting;
    private Long existingId;
    private String newName;
    private Integer newYear;
}
