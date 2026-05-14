package com.csniico.restart.auth.controller;

import com.csniico.restart.admin.service.AdminUserDetailsService;
import com.csniico.restart.auth.dto.LoginRequestDto;
import com.csniico.restart.auth.dto.LoginResponseDto;
import com.csniico.restart.auth.service.JwtService;
import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.instructor.entity.PasswordMeta;
import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.repository.PasswordMetaRepository;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import com.csniico.restart.instructor.service.TenantUserDetailsService;
import com.csniico.restart.multitenancy.TenantContext;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminUserDetailsService adminUserDetailsService;
    private final TenantUserDetailsService tenantUserDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TenantUserRepository tenantUserRepository;
    private final PasswordMetaRepository passwordMetaRepository;

    private AuthenticationManager adminAuthManager;
    private AuthenticationManager tenantAuthManager;

    public AuthController(AdminUserDetailsService adminUserDetailsService,
                          TenantUserDetailsService tenantUserDetailsService,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          TenantUserRepository tenantUserRepository,
                          PasswordMetaRepository passwordMetaRepository) {
        this.adminUserDetailsService = adminUserDetailsService;
        this.tenantUserDetailsService = tenantUserDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tenantUserRepository = tenantUserRepository;
        this.passwordMetaRepository = passwordMetaRepository;
    }

    @PostConstruct
    void buildAuthManagers() {
        DaoAuthenticationProvider adminProvider = new DaoAuthenticationProvider(adminUserDetailsService);
        adminProvider.setPasswordEncoder(passwordEncoder);
        adminAuthManager = new ProviderManager(adminProvider);

        DaoAuthenticationProvider tenantProvider = new DaoAuthenticationProvider(tenantUserDetailsService);
        tenantProvider.setPasswordEncoder(passwordEncoder);
        tenantAuthManager = new ProviderManager(tenantProvider);
    }

    @PostMapping("/admin/login")
    public ResponseEntity<ApiResponse<LoginResponseDto>> adminLogin(
            @Valid @RequestBody LoginRequestDto request) {
        Authentication auth = adminAuthManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        String role = extractRole(auth);
        String token = jwtService.generateToken(auth.getName(), role, null);
        return ResponseEntity.ok(ApiResponse.success("Login successful",
                new LoginResponseDto(token, role, null)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponseDto>> instructorLogin(
            @Valid @RequestBody LoginRequestDto request,
            HttpServletRequest httpRequest) {
        String tenantId = httpRequest.getHeader("X-Tenant-ID");
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = TenantContext.getTenant();
        }
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("X-Tenant-ID header is required"));
        }
        TenantContext.setTenant(tenantId);
        try {
            Authentication auth = tenantAuthManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
            String role = extractRole(auth);

            boolean mustChange = resolveMustChangePassword(request.getUsername());

            String token = jwtService.generateToken(auth.getName(), role, tenantId, mustChange);
            return ResponseEntity.ok(ApiResponse.success("Login successful",
                    new LoginResponseDto(token, role, tenantId)));
        } finally {
            TenantContext.clearTenant();
        }
    }

    private boolean resolveMustChangePassword(String username) {
        return tenantUserRepository.findByUsername(username)
                .flatMap(passwordMetaRepository::findByUser)
                .map(meta -> {
                    if (meta.getState() == PasswordMeta.State.SYSTEM_GENERATED) return true;
                    return meta.getCreatedAt().isBefore(LocalDateTime.now().minusDays(90));
                })
                .orElse(false);
    }

    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_UNKNOWN")
                .replace("ROLE_", "");
    }
}
