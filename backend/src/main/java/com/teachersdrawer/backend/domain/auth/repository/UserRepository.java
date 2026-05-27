package com.teachersdrawer.backend.domain.auth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teachersdrawer.backend.domain.auth.entity.User;

public interface UserRepository extends JpaRepository<User, Long>{
	// JpaRepository<Entity타입, PK타입>
	// 앞으로 만들 repo도 위 형식 처럼 만들 거
	// 기본 crud save findById, findAll, delete 등 자동제공
	
	// 이메일로 유저 조회
	// spring data jpa가 메서드 이름을 파싱해서 쿼리 자동 생성
	// findBy + email -> WHERE email = ?
	Optional<User> findByEmail(String email);
	
	// 이메일 중복 체크
	boolean existsByEmail(String email);
}
