// TenantService.java
package com.csniico.restart.tenant.service;

import com.csniico.restart.tenant.dto.TenantRequestDto;
import com.csniico.restart.tenant.dto.TenantResponseDto;
import java.util.List;

public interface TenantService {
    TenantResponseDto createTenant(TenantRequestDto request);
    List<TenantResponseDto> getAllTenants();
    List<TenantResponseDto> getActiveTenants();
    TenantResponseDto getTenantBySchema(String schemaName);
}