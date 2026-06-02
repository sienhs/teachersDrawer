package com.teachersdrawer.backend.domain.enrollment.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.enrollment.entity.Enrollment;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    // 한 아이의 반배정 이력 (연도 내림차순)
    List<Enrollment> findByChildIdOrderByYearDesc(Long childId);

    // 한 반의 아이 명단
    List<Enrollment> findByClassroomId(Long classroomId);

    // 중복 배정 체크
    boolean existsByChildIdAndClassroomId(Long childId, Long classroomId);

    // 아이 삭제 시 FK 정리
    void deleteByChildId(Long childId);

    // 소유권 포함 단건 조회 (classroom.user.id 경유)
    Optional<Enrollment> findByIdAndClassroom_UserId(Long id, Long userId);
}
