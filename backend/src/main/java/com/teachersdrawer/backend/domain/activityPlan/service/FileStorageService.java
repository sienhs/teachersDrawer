package com.teachersdrawer.backend.domain.activityPlan.service;

public interface FileStorageService {
    /** 업로드. 객체 키 반환 */
    String upload(byte[] fileBytes, String originalFilename, String contentType, String prefix);

    /** 다운로드. byte[] 반환 */
    byte[] download(String fileKey);

    /** 삭제 */
    void delete(String fileKey);

    /** 기존 객체를 새 바이트로 교체 (같은 키 유지) */
    void replace(String fileKey, byte[] bytes, String contentType);
}
