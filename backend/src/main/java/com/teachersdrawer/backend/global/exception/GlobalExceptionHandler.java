package com.teachersdrawer.backend.global.exception;

import com.teachersdrawer.backend.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
	/**
	 *  
	 * 애플리케이션 전역에서 발생하는 예외 처리 클래스
	 * RestController에서 던진걸 여기서 받은 다음 json으로 직렬화 함
	 * 	계속 위로 던지고 RestControllerAdvice가 낚아챔
	 */
	
	// BusinessException처리
	// 클라 문제는 warn 레벨
	// 에러 응답에는 data가 없어서 void 
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn("BusinessException: {}", e.getMessage());
        return ResponseEntity
                .status(e.getErrorCode().getStatus()) // 상태코드 넣고
                .body(ApiResponse.fail(e.getMessage())); // Errorcode에서 메세지 꺼냄
    }
    
    // @Valid 검증 실패
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
    	String message = e.getBindingResult()
    			.getFieldErrors()
    			.stream()
    			.map(error -> error.getField() + ": " + error.getDefaultMessage())
    			.findFirst()
    			.orElse(ErrorCode.INVALID_INPUT.getMessage());
    	
    	log.warn("ValidationException: {}", message);
    	return ResponseEntity.badRequest().body(ApiResponse.fail(message));    	
    }
    
    // 예상 못한 예외
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e){
    	log.error("Unexcepted Exception: ", e);
    	return ResponseEntity.internalServerError().body(ApiResponse.fail(ErrorCode.INTERNAL_SERVER_ERROR.getMessage()));
    }
    
    
}
