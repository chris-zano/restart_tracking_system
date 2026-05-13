package com.csniico.restart.tenant.repository;

import com.csniico.restart.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findBySchemaName(String schemaName);
    boolean existsBySchemaName(String schemaName);
    List<Tenant> findAllByActiveTrue();
}