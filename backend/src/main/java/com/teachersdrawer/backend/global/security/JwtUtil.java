package com.teachersdrawer.backend.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
// 딸깍
@Component  // Spring Bean으로 등록 → @Autowired로 주입 가능
public class JwtUtil {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    // application.yml의 jwt.* 값을 생성자에서 주입받음
    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration}") long accessTokenExpiration,
            @Value("${jwt.refresh-token-expiration}") long refreshTokenExpiration
    ) {
        // 문자열 시크릿키 → HMAC-SHA 암호화 키 객체로 변환
    	// HS256
    	// JWT를 생성할떄 HMAC에다 SHA-256을 끼얹은 HS256을 많이들 사용하는데
    	// 이는 그대로 사용해도 크게 무리가 없다.
    	// https://nhahan.tistory.com/128
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    // Access Token 생성
    public String generateAccessToken(String email) {
        return buildToken(email, accessTokenExpiration);
    }

    // Refresh Token 생성
    public String generateRefreshToken(String email) {
        return buildToken(email, refreshTokenExpiration);
    }

    // 토큰에서 이메일(subject) 추출
    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    // 토큰 유효성 검증
    // 파싱 자체가 실패하면 위조/만료된 토큰
    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // 토큰 생성 공통 로직
    private String buildToken(String email, long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(email)          // 토큰 주인 (이메일)
                .issuedAt(now)           // 발급 시각
                .expiration(expiryDate)  // 만료 시각
                .signWith(secretKey)     // 서명 (위조 방지)
                .compact();              // 문자열로 직렬화
    }

    // 토큰 파싱 → Claims(payload) 추출
    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)  // 서명 검증
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}