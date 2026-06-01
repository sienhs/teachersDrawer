package com.teachersdrawer.backend.domain.child.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.teachersdrawer.backend.domain.auth.entity.User;
import com.teachersdrawer.backend.domain.auth.repository.UserRepository;
import com.teachersdrawer.backend.domain.child.dto.ChildCreateRequest;
import com.teachersdrawer.backend.domain.child.dto.ChildResponse;
import com.teachersdrawer.backend.domain.child.dto.ChildUpdateRequest;
import com.teachersdrawer.backend.domain.child.entity.Child;
import com.teachersdrawer.backend.domain.child.repository.ChildRepository;
import com.teachersdrawer.backend.global.exception.BusinessException;
import com.teachersdrawer.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChildService {
	private final ChildRepository childRepository;
	private final UserRepository userRepository;

    // 공통 헬퍼를 만들어서 아이를 조회하고 담당 아이가 맞는지 검증
    // 멀티유저 격리 - 남의 아이 id로 접근 차단
    private Child findOwnedChild(Long userId, Long childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));

        // 이 아이의 주인이 현재 로그인한 선생님이 아니면 차단
        if (!child.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }
	
	@Transactional
	public ChildResponse create(Long userId, ChildCreateRequest request) {
		
		// 명확한 실제 조회
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(ErrorCode.CHILD_NOT_FOUND));
		Child child = Child.builder()
                .user(user)
                .name(request.getName())
                .birthDate(request.getBirthDate())
                .gender(request.getGender())
                .memo(request.getMemo())
                .status("ENROLLED")
                .build();
		
		
		return ChildResponse.from(childRepository.save(child));
	}
	
	// 내 아이 목록 조회 (PENDING 제외 — 확정된 아이만)
    public List<ChildResponse> getMyChildren(Long userId) {
        return childRepository.findByUserIdAndStatus(userId, "ENROLLED").stream()
                .map(ChildResponse::from)
                .toList();
    }

    // PENDING 아이 목록 (HWP 자동 생성, 확정 대기)
    public List<ChildResponse> getMyPendingChildren(Long userId) {
        return childRepository.findByUserIdAndStatus(userId, "PENDING").stream()
                .map(ChildResponse::from)
                .toList();
    }
    
    // 아이 단건 조회 (소유권검증)
    public ChildResponse getChild(Long userId, Long childId) {
    	Child child = findOwnedChild(userId, childId);
    	return ChildResponse.from(child);
    }
    
    // 아이 수정
    @Transactional
    public ChildResponse update(Long userId, Long childId, ChildUpdateRequest request) {
    	Child child = findOwnedChild(userId, childId);
    	
    	// 엔티티에다가 수정 메서드를 두는게 정석이라고 하는데 나중에 필요성 찾으면 해봄
    	child.update(
    			request.getName(),
    			request.getBirthDate(),
    			request.getGender(),
    			request.getMemo(),
    			request.getStatus());
    	
    	// transactional안에서 변경감지로 자동 업뎃
    	return ChildResponse.from(child);
    }
    
    // 아이 삭제
    @Transactional
    public void delete(Long userId, Long childId) {
    	Child child = findOwnedChild(userId, childId);
    	childRepository.delete(child);
    }
}
