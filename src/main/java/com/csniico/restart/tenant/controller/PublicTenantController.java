package com.csniico.restart.tenant.controller;

import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.tenant.dto.TenantResponseDto;
import com.csniico.restart.tenant.service.TenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Unauthenticated endpoints used by the instructor login page.
 * Returns only active tenants — no sensitive admin data.
 */
@RestController
@RequestMapping("/api/public")
public class PublicTenantController {

    private final TenantService tenantService;

    public PublicTenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @GetMapping("/tenants")
    public ResponseEntity<ApiResponse<List<TenantResponseDto>>> getActiveTenants() {
        return ResponseEntity.ok(ApiResponse.success(tenantService.getActiveTenants()));
    }
}
