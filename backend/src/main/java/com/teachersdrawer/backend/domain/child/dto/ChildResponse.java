package com.teachersdrawer.backend.domain.child.dto;

import java.time.LocalDate;

import com.teachersdrawer.backend.domain.child.entity.Child;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChildResponse {
	/** 
	 * 엔티티를 그대로 노출 X, DTO로 변환해서 응답
	 * user같은 민감/불필요 정보 제외하고 필요한 것만 
	 * 
	 * 
	 * */
	
	private Long id;
	private String name;
	private LocalDate birthDate;
	private String gender;
	private String status;
	private String memo;
	
	// 엔티티를 DTO로 변환하는 정적 팩토리 메서드
	public static ChildResponse from(Child child) {
		return ChildResponse.builder()
				.id(child.getId())
				.name(child.getName())
				.birthDate(child.getBirthDate())
				.gender(child.getGender())
				.status(child.getStatus())
				.memo(child.getMemo())
				.build();
	}
	
	/*
	 * 왜 엔티티가 아닌 DTO로 변환하는지.
	 * 
	 * 엔티티를 직접 반환하면 user정보까지 딸려나가서 LAZY강제로딩, 순화참조, 민감정보 노출 등의 문제가 생김
	 * 
	 * DTO변환해서 반환하면 필요한 필드만 안전하게 반환할 수 있음.
	 * 
	 * 
	 * 왜 Create와 Update를 나눴는가?
	 * 
	 * 나중에 확장성을 고려해서 요청성격이 달라졌을때 DTO가 나눠져있으면 유지보수하기 좋기 때문임.
	 */
}
