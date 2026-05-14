package com.csniico.restart.instructor.profile.service;

import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.entity.PasswordMeta;
import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.profile.dto.ChangePasswordRequestDto;
import com.csniico.restart.instructor.profile.dto.ProfileResponseDto;
import com.csniico.restart.instructor.profile.dto.UpdateProfileRequestDto;
import com.csniico.restart.instructor.repository.PasswordMetaRepository;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ProfileServiceImpl implements ProfileService {

    private final TenantUserRepository tenantUserRepository;
    private final PasswordMetaRepository passwordMetaRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileServiceImpl(TenantUserRepository tenantUserRepository,
                               PasswordMetaRepository passwordMetaRepository,
                               PasswordEncoder passwordEncoder) {
        this.tenantUserRepository = tenantUserRepository;
        this.passwordMetaRepository = passwordMetaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public ProfileResponseDto getProfile(String username) {
        TenantUser user = findUser(username);
        return toDto(user);
    }

    @Override
    public ProfileResponseDto updateProfile(String username, UpdateProfileRequestDto request) {
        TenantUser user = findUser(username);
        user.setDisplayName(request.getDisplayName());
        user.setEmail(request.getEmail());
        tenantUserRepository.save(user);
        return toDto(user);
    }

    @Override
    public void changePassword(String username, ChangePasswordRequestDto request) {
        TenantUser user = findUser(username);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        tenantUserRepository.save(user);

        PasswordMeta meta = passwordMetaRepository.findByUser(user)
                .orElseGet(() -> {
                    PasswordMeta m = new PasswordMeta();
                    m.setUser(user);
                    return m;
                });
        meta.setState(PasswordMeta.State.USER_DEFINED);
        meta.setCreatedAt(LocalDateTime.now());
        passwordMetaRepository.save(meta);
    }

    private TenantUser findUser(String username) {
        return tenantUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private ProfileResponseDto toDto(TenantUser user) {
        boolean mustChange = passwordMetaRepository.findByUser(user)
                .map(m -> m.getState() == PasswordMeta.State.SYSTEM_GENERATED
                        || m.getCreatedAt().isBefore(LocalDateTime.now().minusDays(90)))
                .orElse(false);

        ProfileResponseDto dto = new ProfileResponseDto();
        dto.setUsername(user.getUsername());
        dto.setDisplayName(user.getDisplayName());
        dto.setEmail(user.getEmail());
        dto.setMustChangePassword(mustChange);
        return dto;
    }
}
