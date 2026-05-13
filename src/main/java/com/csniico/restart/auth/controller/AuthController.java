package com.csniico.restart.auth.controller;

import com.csniico.restart.admin.service.AdminUserDetailsService;
import com.csniico.restart.auth.dto.LoginRequestDto;
import com.csniico.restart.auth.dto.LoginResponseDto;
import com.csniico.restart.auth.service.JwtService;
import com.csniico.restart.common.response.ApiResponse;
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

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminUserDetailsService adminUserDetailsService;
    private final TenantUserDetailsService tenantUserDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private AuthenticationManager adminAuthManager;
    private AuthenticationManager tenantAuthManager;

    public AuthController(AdminUserDetailsService adminUserDetailsService,
                          TenantUserDetailsService tenantUserDetailsService,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.adminUserDetailsService = adminUserDetailsService;
        this.tenantUserDetailsService = tenantUserDetailsService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
        // Read tenant directly from header (TenantFilter may not run before controller in all contexts)
        String tenantId = httpRequest.getHeader("X-Tenant-ID");
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = TenantContext.getTenant();
        }
        if (tenantId == null || tenantId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("X-Tenant-ID header is required"));
        }
        // Explicitly set TenantContext so TenantUserDetailsService can resolve the correct schema
        TenantContext.setTenant(tenantId);
        try {
            Authentication auth = tenantAuthManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
            String role = extractRole(auth);
            String token = jwtService.generateToken(auth.getName(), role, tenantId);
            return ResponseEntity.ok(ApiResponse.success("Login successful",
                    new LoginResponseDto(token, role, tenantId)));
        } finally {
            TenantContext.clearTenant();
        }
    }

    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_UNKNOWN")
                .replace("ROLE_", "");
    }
}


