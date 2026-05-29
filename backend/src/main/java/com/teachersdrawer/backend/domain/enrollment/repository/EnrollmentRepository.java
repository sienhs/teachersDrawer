package com.teachersdrawer.backend.domain.enrollment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.enrollment.entity.Enrollment;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    // 한 아이의 반배정 이력 (연도 내림차순)
    List<Enrollment> findByChildIdOrderByYearDesc(Long childId);

    // 한 반의 아이 명단
    List<Enrollment> findByClassroomId(Long classroomId);

    // 중복 배정 체크
    boolean existsByChildIdAndClassroomId(Long childId, Long classroomId);
}
