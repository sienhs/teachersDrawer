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
public class SchoolService { // 합쳐서 검색 -> 분할 했음. 수정완
	private final NeisClient neisClient;
	private final KinderClient kinderClient;
	
	public List<SchoolInfo> searchSchools(String name){
		return neisClient.searchSchools(name);
	}
	public List<SchoolInfo> searchKindergartens(String sidoCode, String sggCode, String name){
		return kinderClient.search(sidoCode, sggCode, name);
	}
}
