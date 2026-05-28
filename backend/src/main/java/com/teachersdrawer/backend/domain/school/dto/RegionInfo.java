package com.teachersdrawer.backend.domain.school.dto;

import java.util.List;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RegionInfo {
	private String sidoName;
	private String sidoCode;
	private List<Sigungu> sigunguList;
	
	@Getter
	@NoArgsConstructor
	public static class Sigungu {
		private String name;
		private String code;
	}
}
