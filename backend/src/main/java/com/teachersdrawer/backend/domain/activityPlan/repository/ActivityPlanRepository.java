package com.teachersdrawer.backend.domain.activityPlan.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivityPlan;

public interface ActivityPlanRepository extends JpaRepository<ActivityPlan, Long> {

    List<ActivityPlan> findByUserIdOrderByPlanDateDesc(Long userId);

    List<ActivityPlan> findByUserIdAndClassroomIdOrderByPlanDateDesc(Long userId, Long classroomId);

    List<ActivityPlan> findByUserIdAndPlanDateBetweenOrderByPlanDateDesc(Long userId, LocalDate from, LocalDate to);
}
