package com.csniico.restart.audit.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "audit_logs", schema = "public")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_username")
    private String actorUsername;

    @Column(name = "actor_role", length = 50)
    private String actorRole;

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    @Column(length = 100)
    private String action;

    @Column(name = "resource_type", length = 100)
    private String resourceType;

    @Column(name = "resource_id")
    private Long resourceId;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "endpoint_path", length = 500)
    private String endpointPath;

    @Column(name = "http_status")
    private Short httpStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

