package com.teachersdrawer.backend.domain.enrollment.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teachersdrawer.backend.domain.child.entity.Child;
import com.teachersdrawer.backend.domain.child.repository.ChildRepository;
import com.teachersdrawer.backend.domain.classroom.entity.Classroom;
import com.teachersdrawer.backend.domain.classroom.repository.ClassroomRepository;
import com.teachersdrawer.backend.domain.enrollment.dto.EnrollmentCreateRequest;
import com.teachersdrawer.backend.domain.enrollment.dto.EnrollmentResponse;
import com.teachersdrawer.backend.domain.enrollment.entity.Enrollment;
import com.teachersdrawer.backend.domain.enrollment.repository.EnrollmentRepository;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final ChildRepository childRepository;
    private final ClassroomRepository classroomRepository;

    @Transactional
    public EnrollmentResponse enroll(Long userId, EnrollmentCreateRequest request) {
        Child child = findOwnedChild(userId, request.getChildId());
        Classroom classroom = findOwnedClassroom(userId, request.getClassroomId());

        if (classroom.isArchived()) {
            throw new BusinessException(ErrorCode.ARCHIVED_CLASSROOM);
        }

        if (enrollmentRepository.existsByChildIdAndClassroomId(child.getId(), classroom.getId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_ENROLLMENT);
        }

        Enrollment enrollment = Enrollment.builder()
                .child(child)
                .classroom(classroom)
                .year(classroom.getYear())
                .build();

        return EnrollmentResponse.from(enrollmentRepository.save(enrollment));
    }

    public List<EnrollmentResponse> getEnrollmentsByChild(Long userId, Long childId) {
        findOwnedChild(userId, childId);
        return enrollmentRepository.findByChildIdOrderByYearDesc(childId).stream()
                .map(EnrollmentResponse::from)
                .toList();
    }

    public List<EnrollmentResponse> getEnrollmentsByClassroom(Long userId, Long classroomId) {
        findOwnedClassroom(userId, classroomId);
        return enrollmentRepository.findByClassroomId(classroomId).stream()
                .map(EnrollmentResponse::from)
                .toList();
    }

    @Transactional
    public void unenroll(Long userId, Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENROLLMENT_NOT_FOUND));

        // 이 배정의 반이 내 반인지 검증
        Classroom classroom = enrollment.getClassroom();
        if (!classroom.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (classroom.isArchived()) {
            throw new BusinessException(ErrorCode.ARCHIVED_CLASSROOM);
        }

        enrollmentRepository.delete(enrollment);
    }

    // ---- 공통 헬퍼 ----

    private Child findOwnedChild(Long userId, Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));
        if (!child.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }

    private Classroom findOwnedClassroom(Long userId, Long classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASSROOM_NOT_FOUND));
        if (!classroom.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return classroom;
    }
}
