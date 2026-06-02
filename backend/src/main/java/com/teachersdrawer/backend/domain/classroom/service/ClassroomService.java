package com.teachersdrawer.backend.domain.classroom.service;

import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;
import com.teachersdrawer.backend.domain.classroom.dto.ClassroomCreateRequest;
import com.teachersdrawer.backend.domain.classroom.dto.ClassroomResponse;
import com.teachersdrawer.backend.domain.classroom.dto.ClassroomUpdateRequest;
import com.teachersdrawer.backend.domain.classroom.entity.Classroom;
import com.teachersdrawer.backend.domain.classroom.repository.ClassroomRepository;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final UserRepository userRepository;

    // 반 생성
    @Transactional
    public ClassroomResponse create(Long userId, ClassroomCreateRequest request) {
        User user = userRepository.getReferenceById(userId);

        Classroom classroom = Classroom.builder()
                .user(user)
                .year(request.getYear())
                .name(request.getName())
                .build();

        return ClassroomResponse.from(classroomRepository.save(classroom));
    }

    // 내 반 전체 조회 (연도 내림차순)
    public List<ClassroomResponse> getMyClassrooms(Long userId) {
        return classroomRepository.findByUserIdOrderByYearDesc(userId).stream()
                .map(ClassroomResponse::from)
                .toList();
    }

    // 상태별 조회 (ACTIVE / ARCHIVED)
    public List<ClassroomResponse> getMyClassroomsByStatus(Long userId, String status) {
        return classroomRepository.findByUserIdAndStatusOrderByYearDesc(userId, status).stream()
                .map(ClassroomResponse::from)
                .toList();
    }

    // 반 단건 조회
    public ClassroomResponse getClassroom(Long userId, Long classroomId) {
        return ClassroomResponse.from(findOwnedClassroom(userId, classroomId));
    }

    // 반 이름 수정 (아카이브된 반은 수정 금지)
    @Transactional
    public ClassroomResponse update(Long userId, Long classroomId, ClassroomUpdateRequest request) {
        Classroom classroom = findOwnedClassroom(userId, classroomId);
        validateNotArchived(classroom);

        classroom.update(request.getName());
        return ClassroomResponse.from(classroom);
    }

    // 반 아카이브 (학년 마치고 보관)
    @Transactional
    public ClassroomResponse archive(Long userId, Long classroomId) {
        Classroom classroom = findOwnedClassroom(userId, classroomId);
        classroom.archive();
        return ClassroomResponse.from(classroom);
    }

    // 반 복구 (아카이브된 반을 현재반으로 옮김)
    @Transactional
    public ClassroomResponse activate(Long userId, Long classroomId) {
        Classroom classroom = findOwnedClassroom(userId, classroomId);
        classroom.activate();
        return ClassroomResponse.from(classroom);
    }

    // 반 삭제 (실수로 만든 반 정리용. 운영 단계에선 신중)
    // TODO: 반 삭제 기능인데, 운영을 시작할때는 다시 파악하고 기능의 필요성 검증이 필요함
    @Transactional
    public void delete(Long userId, Long classroomId) {
        Classroom classroom = findOwnedClassroom(userId, classroomId);
        validateNotArchived(classroom);  // 아카이브된 과거 반은 삭제 금지

        classroomRepository.delete(classroom);
    }

    // ---- 공통 헬퍼 ----

    // 소유권 검증
    private Classroom findOwnedClassroom(Long userId, Long classroomId) {
        return classroomRepository.findByIdAndUserId(classroomId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASSROOM_NOT_FOUND));
    }

    // 아카이브 검증 (수정/삭제 시 사용)
    private void validateNotArchived(Classroom classroom) {
        if (classroom.isArchived()) {
            throw new BusinessException(ErrorCode.ARCHIVED_CLASSROOM);
        }
    }
}