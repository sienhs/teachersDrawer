package com.teachersdrawer.backend.domain.child.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.child.entity.Child;

public interface ChildRepository extends JpaRepository<Child, Long>{

	// 특정 선생님이 소유한 모든 아이 조회
	List<Child> findByUserId(Long userId);

	// 이름으로 아이 자동 매칭 (MontessoriRecord 저장 시 사용)
	Optional<Child> findFirstByUserIdAndName(Long userId, String name);
}
