package com.csniico.restart.tenant.controller;

import com.csniico.restart.common.response.ApiResponse;
import com.csniico.restart.tenant.dto.TenantRequestDto;
import com.csniico.restart.tenant.dto.TenantResponseDto;
import com.csniico.restart.tenant.service.TenantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TenantResponseDto>> createTenant(
            @Valid @RequestBody TenantRequestDto request) {
        TenantResponseDto tenant = tenantService.createTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tenant created", tenant));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TenantResponseDto>>> getAllTenants() {
        return ResponseEntity.ok(ApiResponse.success(tenantService.getAllTenants()));
    }

    @GetMapping("/{schemaName}")
    public ResponseEntity<ApiResponse<TenantResponseDto>> getTenant(
            @PathVariable String schemaName) {
        return ResponseEntity.ok(ApiResponse.success(tenantService.getTenantBySchema(schemaName)));
    }
}
