package com.teachersdrawer.backend.domain.school.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SchoolInfo {
	// 프론트에 반환하는 학교 정보
	private String schoolCode; // 행정표준코드 | 이건 식별용으로 쓰면 좋을듯
	private String schoolName; // 학교명
	
	// KINDERGARTEN = 유치원
	// ELEMENTRY = 초등학교
	// MIDDLE = 중학교
	// HIGH = 고등학교
	private String schoolType; 
	private String address; // 주소 (참고용)
	private String region; // 시도교육청
	
}
