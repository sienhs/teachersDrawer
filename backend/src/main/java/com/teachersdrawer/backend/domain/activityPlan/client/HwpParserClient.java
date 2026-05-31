package com.teachersdrawer.backend.domain.activityPlan.client;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.teachersdrawer.backend.domain.activityPlan.dto.parser.HwpParseResponse;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class HwpParserClient {

    private final RestClient restClient;

    public HwpParserClient(
            @Value("${hwp.parser.base-url}") String baseUrl,
            @Value("${hwp.parser.timeout-seconds:60}") int timeoutSeconds
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    public HwpParseResponse parse(byte[] fileBytes, String filename) {
        ByteArrayResource resource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);

        try {
            return restClient.post()
                    .uri("/parse")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(HwpParseResponse.class);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is4xxClientError()) {
                log.warn("hwp-parser 4xx 응답: {}", e.getMessage());
                throw new BusinessException(ErrorCode.INVALID_FILE_FORMAT);
            }
            log.error("hwp-parser 5xx 응답: {}", e.getMessage());
            throw new BusinessException(ErrorCode.HWP_PARSE_FAILED);
        } catch (Exception e) {
            log.error("hwp-parser 연결 오류: {}", e.getMessage());
            throw new BusinessException(ErrorCode.HWP_PARSE_FAILED);
        }
    }
}
