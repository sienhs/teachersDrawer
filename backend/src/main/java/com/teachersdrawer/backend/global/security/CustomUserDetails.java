package com.teachersdrawer.backend.global.security;

import java.util.Collection;
import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.teachersdrawer.backend.domain.auth.entity.User;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails{
	
	// auth/entity/User.java 엔티티를 감싸는 UserDetails 구현체
	// SecurityContext에 저장되고 컨트롤러에서 @AuthenticationPrincipal 로 꺼내서 유저정보 바로 접근 가능
	private final User user;
	
	public Long getId() { // 단순 축약
		return user.getId();
	}
	
	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		// TODO Auto-generated method stub
		return List.of(new SimpleGrantedAuthority("ROLE_USER"));
	}

	@Override
	public @Nullable String getPassword() { // 이거 안전한거 맞음?
		// TODO Auto-generated method stub
		return user.getPassword();
	}

	@Override // SpringSecurity기준으로 username = email 
	public String getUsername() {
		// TODO Auto-generated method stub
		return user.getEmail();
	}
	
	
	// 여기서부터 계정 상태 플래그 (지금은 전부 활성 true)
	@Override
	public boolean isAccountNonExpired() { return true;}

	@Override
	public boolean isAccountNonLocked() { return true;}
	
	@Override
	public boolean isCredentialsNonExpired() { return true; }
	
	@Override
	public boolean isEnabled() { return true; }
}
