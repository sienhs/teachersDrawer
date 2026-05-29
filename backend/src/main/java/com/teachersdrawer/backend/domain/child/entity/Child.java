package com.teachersdrawer.backend.domain.child.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.teachersdrawer.backend.domain.auth.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "children")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Child {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// 아이를 소유한 선생님
	// 지연 로딩 : 아이 조회 시 매번 User까지 조인하지 않도록
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable=false)
	private User user;
	
	@Column(nullable = false)
	private String name;
	
	// 생년 월일 (만나이)
	private LocalDate birthDate;
	
	// 성별 (male, female, 미지정 null)
	private String gender;
	
	// ENROLLED = 재원, GRADUATED = 졸업, WITHDRAWN = 퇴소
	// 아이 졸업 상태 체크
	@Column(nullable = false)
	@Builder.Default
	private String status = "ENROLLED";
	
	// 특이사항, 알레르기, 메모 등 (이건 나중에 고도화 해야할듯 1000자 제한 걸어둠)
	@Column(length = 1000)
	private String memo;
	

	
	@CreatedDate
	@Column(updatable = false)
	private LocalDateTime createdAt;
	
	@LastModifiedDate
	private LocalDateTime updatedAt;
}
