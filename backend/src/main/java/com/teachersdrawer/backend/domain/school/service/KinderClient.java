package com.teachersdrawer.backend.domain.school.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teachersdrawer.backend.domain.school.dto.SchoolInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class KinderClient {
    // 유치원알리미 API 호출 전담

    @Value("${kinder.api-key}")
    private String apiKey;

    @Value("${kinder.base-url}")
    private String baseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    // 유치원 검색
    // 유치원알리미는 이름 검색이 안 되므로
    // 시도/시군구로 전체를 받아온 뒤 이름으로 필터링
    public List<SchoolInfo> search(String sidoCode, String sggCode, String name) {
        String url = baseUrl + "/basicInfo2.do"
                + "?key=" + apiKey
                + "&sidoCode=" + sidoCode
                + "&sggCode=" + sggCode
                + "&pageCnt=100"
                + "&currentPage=1"; 

        try {
            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);
            
            JsonNode root = objectMapper.readTree(response);

            // status 확인
            JsonNode status = root.get("status");
            if (status == null || !"SUCCESS".equals(status.asText())) {
                log.warn("유치원 API 실패: {}", response);
                return List.of();
            }

            JsonNode kinderInfo = root.get("kinderInfo");
            if (kinderInfo == null || !kinderInfo.isArray()) {
                return List.of();
            }

            List<SchoolInfo> result = new ArrayList<>();
            for (JsonNode row : kinderInfo) {
                String kinderName = row.get("kindername").asText();

                // 이름 필터링 (검색어 포함하는 것만)
                if (name != null && !name.isBlank()
                        && !kinderName.contains(name)) {
                    continue;
                }

                result.add(SchoolInfo.builder()
                        .schoolCode(row.get("kindercode").asText())
                        .schoolName(kinderName)
                        .schoolType("KINDERGARTEN")
                        .address(row.has("addr") ? row.get("addr").asText() : "")
                        .region(row.has("officeedu") ? row.get("officeedu").asText() : "")
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.error("유치원 API 호출 실패: {}", e.getMessage());
            return List.of();
        }
    }
}
