package com.csniico.restart.audit.service;

import com.csniico.restart.audit.dto.AuditLogResponseDto;
import com.csniico.restart.audit.entity.AuditLog;
import com.csniico.restart.audit.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditLog log) {
        auditLogRepository.save(log);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponseDto> getLogs(String actorUsername, String tenantId,
                                             String resourceType, String action, Pageable pageable) {
        Page<AuditLog> page;
        if (actorUsername != null && !actorUsername.isBlank()) {
            page = auditLogRepository.findByActorUsernameOrderByCreatedAtDesc(actorUsername, pageable);
        } else if (tenantId != null && !tenantId.isBlank()) {
            page = auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        } else if (resourceType != null && !resourceType.isBlank()) {
            page = auditLogRepository.findByResourceTypeOrderByCreatedAtDesc(resourceType, pageable);
        } else if (action != null && !action.isBlank()) {
            page = auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
        } else {
            page = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return page.map(this::toDto);
    }

    private AuditLogResponseDto toDto(AuditLog log) {
        AuditLogResponseDto dto = new AuditLogResponseDto();
        dto.setId(log.getId());
        dto.setActorUsername(log.getActorUsername());
        dto.setActorRole(log.getActorRole());
        dto.setTenantId(log.getTenantId());
        dto.setAction(log.getAction());
        dto.setResourceType(log.getResourceType());
        dto.setResourceId(log.getResourceId());
        dto.setDetails(log.getDetails());
        dto.setIpAddress(log.getIpAddress());
        dto.setHttpMethod(log.getHttpMethod());
        dto.setEndpointPath(log.getEndpointPath());
        dto.setHttpStatus(log.getHttpStatus());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }
}

