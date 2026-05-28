package com.teachersdrawer.backend.domain.school.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.teachersdrawer.backend.domain.school.dto.RegionInfo;
import com.teachersdrawer.backend.domain.school.dto.SchoolInfo;
import com.teachersdrawer.backend.domain.school.service.SchoolService;
import com.teachersdrawer.backend.global.response.ApiResponse;
import com.teachersdrawer.backend.domain.school.service.RegionData;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
public class SchoolController {
	private final SchoolService schoolService;
	private final RegionData regionData;
	
	
	// 초중고 검색
	// get /api/schools/search?name=삼성
	@GetMapping("/search")
	public ResponseEntity<ApiResponse<List<SchoolInfo>>> searchSchools(
			@RequestParam("name") String name){
		return ResponseEntity.ok(ApiResponse.success("학교 검색 성공", 
				schoolService.searchSchools(name)));
	}
	
	// 유치원 검색
	@GetMapping("/kindergartens")
	public ResponseEntity<ApiResponse<List<SchoolInfo>>> searchKindergartens(
			@RequestParam("sidoCode") String sidoCode,
			@RequestParam("sggCode") String sggCode,
			@RequestParam(value = "name", required = false) String name){
		return ResponseEntity.ok(ApiResponse.success("유치원 검색 성공", 
				schoolService.searchKindergartens(sidoCode, sggCode, name)));
	}
	
	// 시도 목록 조회
	@GetMapping("/regions")
	public ResponseEntity<ApiResponse<List<RegionInfo>>> getRegions(){
		List<RegionInfo> regions = regionData.getAllRegions();
		return ResponseEntity.ok(ApiResponse.success("시도 목록 조회 성공", regions));
	}
	
	@GetMapping("/regions/{sidoCode}")
	public ResponseEntity<ApiResponse<List<RegionInfo.Sigungu>>> getSugungu(
			@PathVariable("sidoCode") String sidoCode
			){
		List<RegionInfo.Sigungu> list = regionData.getSigunguList(sidoCode);
		return ResponseEntity.ok(ApiResponse.success("시군구 목록 조회 성공", list));
	}
}
