package com.teachersdrawer.backend.global.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 모든 에러 종류를 한 곳에 정의하는 enum
 * 새로운 에러가 필요할 떄마다 이곳에다가 추가
 * 
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    
    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    
    // Common
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),

    // File
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "파일 업로드에 실패했습니다."),
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "허용되지 않는 파일 형식입니다.");
	
	// User 곧 있으면 필요할 듯
	
	// Child ? 이건 어떻게 관리해야할지도 보안이 좀 확실해야해서
	
    /**
     * HTTP 응답 상태코드
     *  auth(UNAUTHORIZED) = 401
     *  not found = 404
     *  bad request = 400
     */
    private final HttpStatus status;

    /**
     * 클라이언트에 전달하는 에러 메세지
     * ApiResponse.fail(message)에 들어감
     */
    private final String message;
}
