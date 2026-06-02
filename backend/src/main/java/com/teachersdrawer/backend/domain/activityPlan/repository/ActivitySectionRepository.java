package com.teachersdrawer.backend.domain.activityPlan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivitySection;

public interface ActivitySectionRepository extends JpaRepository<ActivitySection, Long> {

    List<ActivitySection> findByActivityPlanIdOrderByOrderIndexAsc(Long planId);

    void deleteByActivityPlanId(Long activityPlanId);
}
