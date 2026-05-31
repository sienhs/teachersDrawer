package com.teachersdrawer.backend.domain.activityPlan.service;

import java.io.ByteArrayInputStream;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinioFileStorageService implements FileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Override
    public String upload(byte[] fileBytes, String originalFilename, String contentType, String prefix) {
        String fileKey = prefix + UUID.randomUUID() + "-" + originalFilename;
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .stream(new ByteArrayInputStream(fileBytes), fileBytes.length, -1)
                            .contentType(contentType)
                            .build()
            );
            return fileKey;
        } catch (Exception e) {
            log.error("MinIO 업로드 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }
    }

    @Override
    public byte[] download(String fileKey) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .build()
            ).readAllBytes();
        } catch (Exception e) {
            log.error("MinIO 다운로드 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String fileKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(fileKey)
                            .build()
            );
        } catch (Exception e) {
            log.error("MinIO 삭제 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.FILE_STORAGE_ERROR);
        }
    }
}
