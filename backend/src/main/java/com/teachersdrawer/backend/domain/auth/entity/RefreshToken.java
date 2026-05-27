package com.teachersdrawer.backend.domain.auth.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
/*
 * 사용자가 ID, PW를 통해 록인을 하면 서버에서는 유저DB에서 값을 비교함.
 * 로그인이 완료되면 AccessToken, RefreshToken을 발급함. 이때 회원 DB에다가 RefreshToken을 저장함
 * 사용자는 RefreshToken을 안전한 저장소(브라우저 쿠키)에 저장 후, AccessToken을 헤더에 실어 요청
 * AccessToken을 검증하여 이에 맞는 데이터를 전송
 
 * 시간이 지나 AccessToken이 만료되면 사용자는 이전과 동일하게 AccessToken을 헤더에 실어 요청을 보냄
 * 서버는 AccessToken이 만료됨을 확인하고 권한없음(403)을 신호로 보냄
 * { 근데 사용자(프론트)에서 AccessToken의 Payload를 통해 유효기간을 알 수 있음.
 * 		프론트엔드 단에서 API 요청 전에 토큰이 만료됐다면 곧바로 재발급 요청을 할 수도 있음. }
 * 사용자는 RefreshToken과 AccessToken을 함께 서버로 보냄
 * 서버는 받은 AccessToken이 조작되지 않았는지 확인하고 사용자가 보낸 RefreshToken과 DB에 저장된 토큰을 비교
 * 토큰이 동일하고 유효기간도 지나지 않았다면 새로운 AccessToken을 발급해줌.
 * 서버는 새로운 AccessToken을 헤더에 실어 Api요청 응답을 진행.
 */

@Entity
@Table(name = "refresh_token")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EntityListeners(AuditingEntityListener.class)
public class RefreshToken { // 재발급에 관여하는 토큰
	// id, email, token, expiresAt, createdAt, updateToken()
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// 유저 식별
	@Column(nullable = false, unique = true)
	private String email;
	
	// 실제 토큰
	@Column(nullable = false)
	private String token;
	
	@Column(nullable = false)
	private LocalDateTime expiresAt;
	
	@CreatedDate
	@Column(updatable = false)
	private LocalDateTime createdAt;
	
	
	// 토큰 갱신 - 로그인할 때 마다 새로운 토큰으로 교체
	public void updateToken(String newToken, LocalDateTime newExpiresAt) {
		this.token = newToken;
		this.expiresAt = newExpiresAt;
	}
}
