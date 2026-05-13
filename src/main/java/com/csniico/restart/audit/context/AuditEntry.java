package com.csniico.restart.audit.context;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuditEntry {
    private String action;
    private String resourceType;
    private Long resourceId;
    private String tenantId;
}

