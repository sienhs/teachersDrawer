package com.teachersdrawer.backend.domain.school.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teachersdrawer.backend.domain.school.dto.SchoolInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NeisClient {

    @Value("${neis.api-key}")
    private String apiKey;

    @Value("${neis.base-url}")
    private String baseUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    // JSON 파싱용

    private final RestClient restClient = RestClient.create();
    // Spring 6.1+ RestClient (RestTemplate 후속, 동기 HTTP 클라이언트)

    // 유치원 검색
    public List<SchoolInfo> searchKindergartens(String name) {
        // /kindergartenInfo 엔드포인트 호출
        String url = baseUrl + "/kindergartenInfo"
                + "?KEY=" + apiKey
                + "&Type=json"
                + "&pIndex=1"
                + "&pSize=100"
                + "&KINDER_NAME=" + name;  // 유치원은 KINDER_NAME 파라미터 사용

        return callNeis(url, "kindergartenInfo", "KINDERGARTEN");
    }

    // 초중고 검색
    public List<SchoolInfo> searchSchools(String name) {
        String url = baseUrl + "/schoolInfo"
                + "?KEY=" + apiKey
                + "&Type=json"
                + "&pIndex=1"
                + "&pSize=100"
                + "&SCHUL_NM=" + name;  // 초중고는 SCHUL_NM 파라미터 사용

        return callNeis(url, "schoolInfo", null);  // 학교 종류는 응답에서 판단
    }

    // 공통 호출 로직
    private List<SchoolInfo> callNeis(String url, String rootKey, String fixedType) {
        try {
            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            JsonNode rootArray = root.get(rootKey);

            // 결과 없으면 빈 리스트
            // (예: RESULT 객체만 오면 데이터 없음)
            if (rootArray == null || !rootArray.isArray()) {
                return List.of();
            }

            // [0]은 head, [1]에 row 배열이 있음
            JsonNode rows = rootArray.get(1).get("row");
            if (rows == null) {
                return List.of();
            }

            List<SchoolInfo> result = new ArrayList<>();
            for (JsonNode row : rows) {
                result.add(SchoolInfo.builder()
                        .schoolCode(row.get("SD_SCHUL_CODE").asText())
                        .schoolName(fixedType != null
                                ? row.get("KINDER_NAME").asText()    // 유치원
                                : row.get("SCHUL_NM").asText())      // 초중고
                        .schoolType(fixedType != null
                                ? fixedType
                                : mapSchoolType(row.get("SCHUL_KND_SC_NM").asText()))
                        .address(row.has("ORG_RDNMA") ? row.get("ORG_RDNMA").asText() : "")
                        .region(row.get("ATPT_OFCDC_SC_NM").asText())
                        .build());
            }
            return result;
        } catch (Exception e) {
            log.error("나이스 API 호출 실패: {}", e.getMessage());
            return List.of();
        }
    }

    // 학교종류명 → 우리 시스템 enum 매핑
    private String mapSchoolType(String kndScNm) {
        return switch (kndScNm) {
            case "초등학교" -> "ELEMENTARY";
            case "중학교" -> "MIDDLE";
            case "고등학교" -> "HIGH";
            default -> "OTHER";
        };
    }
}