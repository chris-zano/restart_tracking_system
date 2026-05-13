package com.csniico.restart.tenant.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class TenantResponseDto {
    private Long id;
    private String schemaName;
    private String instructorName;
    private boolean active;
    private LocalDateTime createdAt;
}
