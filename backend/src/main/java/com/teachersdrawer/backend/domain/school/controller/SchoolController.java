package com.teachersdrawer.backend.domain.school.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.teachersdrawer.backend.domain.school.dto.SchoolInfo;
import com.teachersdrawer.backend.domain.school.service.SchoolService;
import com.teachersdrawer.backend.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
public class SchoolController {
	private final SchoolService schoolService;
	
	@GetMapping("/search")
	public ResponseEntity<ApiResponse<List<SchoolInfo>>> search(
			@RequestParam("name") String name){
		List<SchoolInfo> result = schoolService.search(name);
		return ResponseEntity.ok(ApiResponse.success("학교 검색 성공", result));
	}
}
