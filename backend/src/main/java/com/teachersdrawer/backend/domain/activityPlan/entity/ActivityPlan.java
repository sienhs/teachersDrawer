package com.teachersdrawer.backend.domain.activityPlan.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.classroom.entity.Classroom;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "activity_plans")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ActivityPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false)
    private LocalDate planDate;

    private String subject;
    private String teacherName;
    private String classNameRaw;
    private String classTimeRaw;
    private Integer classDayCount;

    private String fileKey;
    private String fileName;

    @Column(columnDefinition = "TEXT")
    private String rawJson;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /** 정리화면 반영 시 메타데이터 갱신. fileKey/fileName은 PUT file API에서 이미 갱신됨. */
    public void updateContent(LocalDate planDate, String subject, String teacherName,
                               String classNameRaw, String classTimeRaw, Integer classDayCount,
                               String rawJson, Classroom classroom) {
        this.planDate = planDate;
        this.subject = subject;
        this.teacherName = teacherName;
        this.classNameRaw = classNameRaw;
        this.classTimeRaw = classTimeRaw;
        this.classDayCount = classDayCount;
        this.rawJson = rawJson;
        this.classroom = classroom;
    }
}
