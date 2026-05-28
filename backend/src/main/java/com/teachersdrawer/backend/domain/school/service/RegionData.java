package com.teachersdrawer.backend.domain.school.service;

import java.io.InputStream;
import java.util.List;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teachersdrawer.backend.domain.school.dto.RegionInfo;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component

public class RegionData {
	private List<RegionInfo> regions;
	private final ObjectMapper objectMapper = new ObjectMapper();
	
	@PostConstruct // Bean 생성직후 자동으로 실행
	public void init() {
		try {
			// resource/region_codes.json파일 읽어와서
			ClassPathResource resource = new ClassPathResource("region_codes.json");
			InputStream is = resource.getInputStream();
			// json배열을 List<RegionInfo>로 변환함.
			regions = objectMapper.readValue(
					is,
					objectMapper.getTypeFactory()
					.constructCollectionType(List.class, RegionInfo.class));
			log.info("지역 코드 로딩 완료: {}개 시도", regions.size());
		} catch(Exception e) {
			log.error("지역 코드 로딩 실패", e);
			regions = List.of();
		}
	}
	
	// 시도 목록 반환
	public List<RegionInfo> getAllRegions(){
		return regions;
	}
	
	// 특정 시도의 시군구 목록 반환
	public List<RegionInfo.Sigungu> getSigunguList(String sidoCode) {
        return regions.stream()
                .filter(r -> r.getSidoCode().equals(sidoCode))
                .findFirst()
                .map(RegionInfo::getSigunguList)
                .orElse(List.of());
    }
	
	// 시군구 코드로 시도 코드 찾기
	public String findSidoCodeBySigungu(String sigunguCode) {
		return regions.stream()
				.filter(r -> r.getSigunguList().stream()
						.anyMatch(s -> s.getCode().equals(sigunguCode)))
				.map(RegionInfo::getSidoCode)
				.findFirst()
				.orElse(null);
	}
}
