package com.teachersdrawer.backend.domain.activityPlan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.activityPlan.entity.MontessoriRecord;

public interface MontessoriRecordRepository extends JpaRepository<MontessoriRecord, Long> {

    List<MontessoriRecord> findByActivityPlanId(Long planId);

    List<MontessoriRecord> findByChildIdOrderByActivityPlan_PlanDateDesc(Long childId);
}
