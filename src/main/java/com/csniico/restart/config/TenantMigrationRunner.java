package com.csniico.restart.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

/**
 * Applies pending tenant Flyway migrations to all existing tenant schemas on startup.
 * New tenants are migrated at creation time (TenantServiceImpl); this runner covers
 * tenants that already existed before a new migration file was added.
 */
@Component
public class TenantMigrationRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantMigrationRunner.class);

    private final DataSource dataSource;

    public TenantMigrationRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void migrateAllTenants() {
        List<String> schemas = fetchTenantSchemas();
        if (schemas.isEmpty()) return;

        log.info("Running tenant migrations for {} existing tenant(s)…", schemas.size());
        for (String schema : schemas) {
            try {
                Flyway flyway = Flyway.configure()
                        .dataSource(dataSource)
                        .schemas(schema)
                        .defaultSchema(schema)
                        .locations("classpath:db/migration/tenant")
                        .baselineOnMigrate(true)
                        .baselineVersion("0")
                        .load();
                int applied = flyway.migrate().migrationsExecuted;
                if (applied > 0) {
                    log.info("  [{}] applied {} migration(s)", schema, applied);
                }
            } catch (Exception e) {
                log.error("  [{}] migration failed: {}", schema, e.getMessage());
            }
        }
    }

    private List<String> fetchTenantSchemas() {
        List<String> schemas = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             ResultSet rs = conn.createStatement()
                     .executeQuery("SELECT schema_name FROM public.tenants")) {
            while (rs.next()) schemas.add(rs.getString(1));
        } catch (Exception e) {
            log.error("Failed to fetch tenant schemas for migration: {}", e.getMessage());
        }
        return schemas;
    }
}
