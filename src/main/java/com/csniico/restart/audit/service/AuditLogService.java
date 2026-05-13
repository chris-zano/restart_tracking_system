package com.csniico.restart.audit.service;

import com.csniico.restart.audit.dto.AuditLogResponseDto;
import com.csniico.restart.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogService {
    void record(AuditLog log);
    Page<AuditLogResponseDto> getLogs(String actorUsername, String tenantId, String resourceType, String action, Pageable pageable);
}

