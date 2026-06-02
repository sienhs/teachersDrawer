package com.teachersdrawer.backend.domain.child.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.child.entity.Child;

public interface ChildRepository extends JpaRepository<Child, Long>{

	// 특정 선생님이 소유한 모든 아이 조회
	List<Child> findByUserId(Long userId);

	// 상태별 조회 (PENDING 목록 등)
	List<Child> findByUserIdAndStatus(Long userId, String status);

	// 이름으로 아이 자동 매칭 (MontessoriRecord 저장 시 사용)
	Optional<Child> findFirstByUserIdAndName(Long userId, String name);

	// status + 이름으로 정확 매칭 (analyze 시 ENROLLED 우선 매칭)
	Optional<Child> findFirstByUserIdAndStatusAndName(Long userId, String status, String name);

	// 이름 전체 검색 (동명이인 후보 탐색용)
	List<Child> findByUserIdAndName(Long userId, String name);

	// 소유권 포함 단건 조회 (userId 불일치 시 empty — NOT_FOUND 처리)
	Optional<Child> findByIdAndUserId(Long id, Long userId);
}
