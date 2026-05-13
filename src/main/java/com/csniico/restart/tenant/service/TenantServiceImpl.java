package com.csniico.restart.tenant.service;

import com.csniico.restart.common.exception.TenantNotFoundException;
import com.csniico.restart.common.util.SchemaUtil;
import com.csniico.restart.tenant.dto.TenantRequestDto;
import com.csniico.restart.tenant.dto.TenantResponseDto;
import com.csniico.restart.tenant.entity.Tenant;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.flywaydb.core.Flyway;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TenantServiceImpl implements TenantService {

    private final TenantRepository tenantRepository;
    private final DataSource dataSource;

    public TenantServiceImpl(TenantRepository tenantRepository, DataSource dataSource) {
        this.tenantRepository = tenantRepository;
        this.dataSource = dataSource;
    }

    @Override
    @Transactional
    public TenantResponseDto createTenant(TenantRequestDto request) {
        String schemaName = SchemaUtil.toSchemaName(request.getInstructorName());

        if (tenantRepository.existsBySchemaName(schemaName)) {
            throw new IllegalArgumentException("Tenant already exists: " + schemaName);
        }
        createSchema(schemaName);
        runTenantMigrations(schemaName);
        Tenant tenant = new Tenant();
        tenant.setSchemaName(schemaName);
        tenant.setInstructorName(request.getInstructorName());
        tenantRepository.save(tenant);

        return toDto(tenant);
    }

    @Override
    public List<TenantResponseDto> getAllTenants() {
        return tenantRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TenantResponseDto> getActiveTenants() {
        return tenantRepository.findAllByActiveTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public TenantResponseDto getTenantBySchema(String schemaName) {
        return tenantRepository.findBySchemaName(schemaName)
                .map(this::toDto)
                .orElseThrow(() -> new TenantNotFoundException(schemaName));
    }

    private void createSchema(String schemaName) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create schema: " + schemaName, e);
        }
    }

    private void runTenantMigrations(String schemaName) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .schemas(schemaName)
                .defaultSchema(schemaName)
                .locations("classpath:db/migration/tenant")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();
        flyway.migrate();
    }

    private TenantResponseDto toDto(Tenant tenant) {
        TenantResponseDto dto = new TenantResponseDto();
        dto.setId(tenant.getId());
        dto.setSchemaName(tenant.getSchemaName());
        dto.setInstructorName(tenant.getInstructorName());
        dto.setActive(tenant.isActive());
        dto.setCreatedAt(tenant.getCreatedAt());
        return dto;
    }
}
