package com.csniico.restart.tenant.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "tenants", schema = "public")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="schema_name", unique = true, nullable = false)
    private String schemaName;

    @Column(name = "instructor_name", nullable=false)
    private String instructorName;

    @Column(nullable=false)
    private boolean active = true;

    @Column(name = "created_at",nullable=false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
