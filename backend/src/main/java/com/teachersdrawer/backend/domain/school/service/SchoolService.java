package com.teachersdrawer.backend.domain.school.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.teachersdrawer.backend.domain.school.dto.SchoolInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchoolService { // 유치원과 초중고를 같이 검색해서 합쳐서 반환
	private final NeisClient neisClient;
	
	public List<SchoolInfo> search(String name){
		List<SchoolInfo> result = new ArrayList<>();
		result.addAll(neisClient.searchKindergartens(name));
		result.addAll(neisClient.searchSchools(name));
		return result;
	}
}
