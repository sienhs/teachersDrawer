package com.teachersdrawer.backend.domain.activityPlan.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teachersdrawer.backend.domain.activityPlan.entity.ActivitySection;

public interface ActivitySectionRepository extends JpaRepository<ActivitySection, Long> {

    List<ActivitySection> findByActivityPlanIdOrderByOrderIndexAsc(Long planId);

    void deleteByActivityPlanId(Long activityPlanId);

    @Query(value = """
    	    select content from (
    	      select distinct s.content, length(s.content) as len
    	      from activity_sections s
    	      join activity_plans ap on s.activity_plan_id = ap.id
    	      where ap.user_id = ?1
    	        and lower(s.content) like lower(concat('%', ?2, '%'))
    	        and length(s.content) > 0
    	    ) sub
    	    order by len asc
    	    limit 10
    	    """, nativeQuery = true)
    	List<String> findContentByUserIdAndKeyword(@Param("userId") Long userId, @Param("keyword") String keyword);
}
