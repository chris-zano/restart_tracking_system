package com.csniico.restart.admin.controller;

import com.csniico.restart.audit.dto.AuditLogResponseDto;
import com.csniico.restart.audit.service.AuditLogService;
import com.csniico.restart.common.response.ApiResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AdminAuditLogController {

    private final AuditLogService auditLogService;

    public AdminAuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponseDto>>> getLogs(
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String action,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        Page<AuditLogResponseDto> page = auditLogService.getLogs(actorUsername, tenantId, resourceType, action, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }
}

