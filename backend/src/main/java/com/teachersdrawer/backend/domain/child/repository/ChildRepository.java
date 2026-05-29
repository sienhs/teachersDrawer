package com.teachersdrawer.backend.domain.child.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.child.entity.Child;

public interface ChildRepository extends JpaRepository<Child, Long>{
	
	// 특정 선생님이 소유한 모든 아이 조회
	// userId로 필터링하고 다른선생님의 아이는 안보이게끔 (멀티 유저 격리)
	List<Child> findByUserId(Long userId);
}
