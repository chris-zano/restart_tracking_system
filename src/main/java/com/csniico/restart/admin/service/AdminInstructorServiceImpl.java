package com.csniico.restart.admin.service;

import com.csniico.restart.admin.dto.InstructorProvisionRequestDto;
import com.csniico.restart.admin.dto.InstructorResponseDto;
import com.csniico.restart.common.exception.ResourceNotFoundException;
import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminInstructorServiceImpl implements AdminInstructorService {

    private final TenantUserRepository tenantUserRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInstructorServiceImpl(TenantUserRepository tenantUserRepository,
                                      TenantRepository tenantRepository,
                                      PasswordEncoder passwordEncoder) {
        this.tenantUserRepository = tenantUserRepository;
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
            TenantUser user = new TenantUser();
            user.setUsername(request.getUsername());
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            TenantUser saved = tenantUserRepository.save(user);
            return toDto(saved, schemaName);
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

    private InstructorResponseDto toDto(TenantUser user, String schemaName) {
        InstructorResponseDto dto = new InstructorResponseDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setSchemaName(schemaName);
        dto.setRole(user.getRole().name());
        dto.setActive(user.isActive());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}




