package com.teachersdrawer.backend.domain.classroom.entity;

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
@Table(name = "classrooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Classroom {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// 담임 선생님
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;
	
	// 연도 같은 이름이라도 연도가 다르면 별개 반
	@Column(nullable = false)
	private Integer year;
	
	// 반 이름
	@Column(nullable = false)
	private String name;
	
	// 반 상태 : ACTIVE = (현재, 편집가능), ARCHIVED(과거, 읽기전용)
	@Column(nullable = false)
	@Builder.Default
	private String status = "ACTIVE";
	
	@CreatedDate
	@Column(updatable = false)
	private LocalDateTime createdAt;
	
	@LastModifiedDate
	private LocalDateTime updatedAt;
	
	
	// 도메인 주도 설계의 기본 습관
	// setStatus 같은 막연한 setter보다 이 반을 아카이브한다. 등 의도가 명확한 이름으로 짓는게 기본 습관.
	
	// 수정 메서드 (이름만 가능, year는 불변)
	public void update(String name) {
		this.name = name;
	}
	
	// 아카이브 처리
	public void archive() {
		this.status = "ARCHIVED";
	}
	
	// 현재 반으로 복구
	public void activate() {
		this.status = "ACTIVE";
	}
	// 읽기 전용 여부 확인
	public boolean isArchived() {
		return "ARCHIVED".equals(this.status);
	}
}
