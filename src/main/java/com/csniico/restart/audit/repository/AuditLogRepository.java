package com.csniico.restart.audit.repository;

import com.csniico.restart.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByActorUsername(String actorUsername);
    List<AuditLog> findByTenantId(String tenantId);
    List<AuditLog> findByResourceTypeAndAction(String resourceType, String action);
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AuditLog> findByActorUsernameOrderByCreatedAtDesc(String actorUsername, Pageable pageable);
    Page<AuditLog> findByTenantIdOrderByCreatedAtDesc(String tenantId, Pageable pageable);
    Page<AuditLog> findByResourceTypeOrderByCreatedAtDesc(String resourceType, Pageable pageable);
    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
}

