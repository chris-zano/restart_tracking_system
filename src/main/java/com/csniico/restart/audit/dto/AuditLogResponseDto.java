package com.csniico.restart.audit.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AuditLogResponseDto {
    private Long id;
    private String actorUsername;
    private String actorRole;
    private String tenantId;
    private String action;
    private String resourceType;
    private Long resourceId;
    private String details;
    private String ipAddress;
    private String httpMethod;
    private String endpointPath;
    private Short httpStatus;
    private LocalDateTime createdAt;
}

