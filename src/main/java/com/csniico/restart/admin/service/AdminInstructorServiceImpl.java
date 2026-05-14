package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.InstructorProvisionRequestDto;
import com.csniico.restart.admin.dto.InstructorResponseDto;
import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.entity.PasswordMeta;
import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.repository.PasswordMetaRepository;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminInstructorServiceImpl implements AdminInstructorService {

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final int TEMP_PASSWORD_LENGTH = 12;

    private final TenantUserRepository tenantUserRepository;
    private final PasswordMetaRepository passwordMetaRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminInstructorServiceImpl(TenantUserRepository tenantUserRepository,
                                      PasswordMetaRepository passwordMetaRepository,
                                      TenantRepository tenantRepository,
                                      PasswordEncoder passwordEncoder) {
        this.tenantUserRepository = tenantUserRepository;
        this.passwordMetaRepository = passwordMetaRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public InstructorResponseDto createInstructor(InstructorProvisionRequestDto request) {
        String schemaName = request.getSchemaName();

        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }

        TenantContext.setTenant(schemaName);
        try {
            if (tenantUserRepository.existsByUsername(request.getUsername())) {
                throw new IllegalArgumentException(
                        "Instructor '" + request.getUsername() + "' already exists in tenant: " + schemaName);
            }

            String tempPassword = generateTempPassword();

            TenantUser user = new TenantUser();
            user.setUsername(request.getUsername());
            user.setDisplayName(request.getDisplayName());
            user.setEmail(request.getEmail());
            user.setPasswordHash(passwordEncoder.encode(tempPassword));
            TenantUser saved = tenantUserRepository.save(user);

            PasswordMeta meta = new PasswordMeta();
            meta.setUser(saved);
            meta.setState(PasswordMeta.State.SYSTEM_GENERATED);
            passwordMetaRepository.save(meta);

            InstructorResponseDto dto = toDto(saved, schemaName);
            dto.setTempPassword(tempPassword);
            return dto;
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public List<InstructorResponseDto> getInstructorsBySchema(String schemaName) {
        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }

        TenantContext.setTenant(schemaName);
        try {
            return tenantUserRepository.findAll().stream()
                    .map(u -> toDto(u, schemaName))
                    .collect(Collectors.toList());
        } finally {
            TenantContext.clearTenant();
        }
    }

    @Override
    public void deleteInstructor(String schemaName, String username) {
        if (!tenantRepository.existsBySchemaName(schemaName)) {
            throw new ResourceNotFoundException("Tenant not found: " + schemaName);
        }

        TenantContext.setTenant(schemaName);
        try {
            TenantUser user = tenantUserRepository.findByUsername(username)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Instructor '" + username + "' not found in tenant: " + schemaName));
            tenantUserRepository.delete(user);
        } finally {
            TenantContext.clearTenant();
        }
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            sb.append(CHARS.charAt(secureRandom.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    private InstructorResponseDto toDto(TenantUser user, String schemaName) {
        InstructorResponseDto dto = new InstructorResponseDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setDisplayName(user.getDisplayName());
        dto.setEmail(user.getEmail());
        dto.setSchemaName(schemaName);
        dto.setRole(user.getRole().name());
        dto.setActive(user.isActive());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}
