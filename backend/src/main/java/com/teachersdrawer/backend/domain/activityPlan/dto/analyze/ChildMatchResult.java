package com.teachersdrawer.backend.domain.activityPlan.dto.analyze;

import java.util.List;

import com.teachersdrawer.backend.domain.child.entity.Child;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChildMatchResult {
    private String nameFromHwp;
    private Long exactMatchId;
    private List<DuplicateCandidateResult> duplicateCandidates;
    private boolean willCreate;

    public static ChildMatchResult useExisting(Child child) {
        return ChildMatchResult.builder()
                .nameFromHwp(child.getName())
                .exactMatchId(child.getId())
                .duplicateCandidates(List.of())
                .willCreate(false)
                .build();
    }

    public static ChildMatchResult withDuplicates(String name, List<DuplicateCandidateResult> candidates) {
        return ChildMatchResult.builder()
                .nameFromHwp(name)
                .exactMatchId(null)
                .duplicateCandidates(candidates)
                .willCreate(true)
                .build();
    }

    public static ChildMatchResult willCreate(String name) {
        return ChildMatchResult.builder()
                .nameFromHwp(name)
                .exactMatchId(null)
                .duplicateCandidates(List.of())
                .willCreate(true)
                .build();
    }
}
