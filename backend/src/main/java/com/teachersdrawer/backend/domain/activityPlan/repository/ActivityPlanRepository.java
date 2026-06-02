package com.teachersdrawer.backend.domain.activityPlan.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivityPlan;

public interface ActivityPlanRepository extends JpaRepository<ActivityPlan, Long> {

    List<ActivityPlan> findByUserIdOrderByPlanDateDesc(Long userId);

    List<ActivityPlan> findByUserIdAndClassroomIdOrderByPlanDateDesc(Long userId, Long classroomId);

    List<ActivityPlan> findByUserIdAndPlanDateBetweenOrderByPlanDateDesc(Long userId, LocalDate from, LocalDate to);

    Optional<ActivityPlan> findByUserIdAndClassroomIdAndPlanDate(Long userId, Long classroomId, LocalDate planDate);

    // 소유권 포함 단건 조회
    Optional<ActivityPlan> findByIdAndUserId(Long id, Long userId);
}
