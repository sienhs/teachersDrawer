package com.teachersdrawer.backend.domain.classroom.repository;

import com.teachersdrawer.backend.domain.classroom.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {

    // 내 반 전체 조회 (연도 내림차순으로 최신 반이 먼저)
    List<Classroom> findByUserIdOrderByYearDesc(Long userId);

    // 특정 연도의 내 반 조회 (예: 2026년 반들)
    List<Classroom> findByUserIdAndYear(Long userId, Integer year);

    // 상태별 조회 (현재반만, 아카이브만)
    List<Classroom> findByUserIdAndStatusOrderByYearDesc(Long userId, String status);
}