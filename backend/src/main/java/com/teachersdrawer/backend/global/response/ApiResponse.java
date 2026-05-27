package com.teachersdrawer.backend.global.response;

import lombok.Getter;

@Getter
public class ApiResponse<T> {
    private final boolean success; // 요청 성공 여부
    private final String message; // 응답 메시지
    private final T data; // 응답 데이터

    public ApiResponse(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null);
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
