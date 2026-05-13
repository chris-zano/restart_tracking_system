package com.csniico.restart.audit;

import com.csniico.restart.BaseIntegrationTest;
import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
import com.csniico.restart.audit.repository.AuditLogRepository;
import com.csniico.restart.tenant.dto.TenantRequestDto;
import com.csniico.restart.tenant.repository.TenantRepository;
import com.csniico.restart.tenant.service.TenantService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuditLogIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;
    @Autowired private AuditLogRepository auditLogRepository;

    private static final String ADMIN_USERNAME = "audit_admin_test";
    private static final String ADMIN_PASSWORD = "auditPass789";
    private static final String INSTR_NAME     = "Audit Test Instructor";
    private static final String SCHEMA_NAME    = "audit_test_instructor"; // SchemaUtil.toSchemaName(INSTR_NAME)
    private static final String INSTR_USERNAME = "audit_instr_user";
    private static final String INSTR_PASSWORD = "instrAudit123";

    private String adminToken;
    private String instructorToken;

    @BeforeEach
    void setup() throws Exception {
        if (!adminUserRepository.existsByUsername(ADMIN_USERNAME)) {
            AdminUser admin = new AdminUser();
            admin.setUsername(ADMIN_USERNAME);
            admin.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD));
            adminUserRepository.save(admin);
        }
        if (!tenantRepository.existsBySchemaName(SCHEMA_NAME)) {
            TenantRequestDto req = new TenantRequestDto();
            req.setInstructorName(INSTR_NAME);
            tenantService.createTenant(req);
        }

        adminToken = getAdminToken(ADMIN_USERNAME, ADMIN_PASSWORD);

        String provBody = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME, "username", INSTR_USERNAME, "password", INSTR_PASSWORD));
        mockMvc.perform(post("/api/admin/instructors")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(provBody));

        instructorToken = getTenantToken(SCHEMA_NAME, INSTR_USERNAME, INSTR_PASSWORD);
    }

    @AfterEach
    void cleanup() {
        tenantRepository.findBySchemaName(SCHEMA_NAME).ifPresent(tenantRepository::delete);
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + SCHEMA_NAME + " CASCADE");
        } catch (Exception ignored) {}
        adminUserRepository.findByUsername(ADMIN_USERNAME).ifPresent(adminUserRepository::delete);
        auditLogRepository.deleteAll(auditLogRepository.findByActorUsername(ADMIN_USERNAME));
        auditLogRepository.deleteAll(auditLogRepository.findByActorUsername(INSTR_USERNAME));
    }

    @Test
    @Order(1)
    @DisplayName("Audit: admin creating learner logs correct actor, role, action, tenantId")
    void admin_createLearner_generatesAuditLog() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Audit Test Learner", "email", "audit.learner@test.edu.gh",
                "phone", "0241119999", "institution", "UG", "graduated", false));

        mockMvc.perform(post("/api/admin/tenants/{schema}/learners", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        var logs = auditLogRepository.findByActorUsername(ADMIN_USERNAME);
        assertThat(logs).isNotEmpty();

        var createLog = logs.stream()
                .filter(l -> "ADMIN_CREATE_LEARNER".equals(l.getAction()))
                .findFirst();
        assertThat(createLog).isPresent();
        assertThat(createLog.get().getActorRole()).isEqualTo("ADMIN");
        assertThat(createLog.get().getTenantId()).isEqualTo(SCHEMA_NAME);
        assertThat(createLog.get().getResourceType()).isEqualTo("LEARNER");
        assertThat(createLog.get().getHttpStatus()).isEqualTo((short) 201);
        assertThat(createLog.get().getEndpointPath()).contains("/api/admin/tenants/");
    }

    @Test
    @Order(2)
    @DisplayName("Audit: instructor creating cohort logs correct actor, role, tenantId")
    void instructor_createCohort_generatesAuditLog() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name", "Audit Cohort", "description", "For audit test"));

        mockMvc.perform(post("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        var logs = auditLogRepository.findByActorUsername(INSTR_USERNAME);
        assertThat(logs).isNotEmpty();

        var createLog = logs.stream()
                .filter(l -> "CREATE_COHORT".equals(l.getAction()))
                .findFirst();
        assertThat(createLog).isPresent();
        assertThat(createLog.get().getActorRole()).isEqualTo("INSTRUCTOR");
        assertThat(createLog.get().getTenantId()).isEqualTo(SCHEMA_NAME);
        assertThat(createLog.get().getResourceType()).isEqualTo("COHORT");
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/admin/audit-logs — returns paginated results filtered by actorUsername")
    void adminGetAuditLogs_filteredByActor() throws Exception {
        // Trigger an action
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Audit Filter Test", "email", "audit.filter@test.edu.gh",
                "phone", "0271119999", "institution", "UCC", "graduated", false));
        mockMvc.perform(post("/api/admin/tenants/{schema}/learners", SCHEMA_NAME)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(body));

        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("actorUsername", ADMIN_USERNAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[*].actorUsername", everyItem(is(ADMIN_USERNAME))));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/admin/audit-logs — returns paginated results filtered by tenantId")
    void adminGetAuditLogs_filteredByTenant() throws Exception {
        // Trigger an action for this tenant
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Tenant Filter Test", "email", "tenant.filter@test.edu.gh",
                "phone", "0551119999", "institution", "KNUST", "graduated", false));
        mockMvc.perform(post("/api/admin/tenants/{schema}/learners", SCHEMA_NAME)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(body));

        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("tenantId", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.content[*].tenantId", everyItem(is(SCHEMA_NAME))));
    }

    @Test
    @Order(5)
    @DisplayName("Audit: every action has httpMethod and endpointPath populated")
    void auditLog_hasHttpMetadata() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Meta Test", "email", "meta.test@test.edu.gh",
                "phone", "0201119999", "institution", "Ashesi", "graduated", false));
        mockMvc.perform(post("/api/admin/tenants/{schema}/learners", SCHEMA_NAME)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(body));

        var logs = auditLogRepository.findByActorUsername(ADMIN_USERNAME).stream()
                .filter(l -> "ADMIN_CREATE_LEARNER".equals(l.getAction()))
                .toList();

        assertThat(logs).isNotEmpty();
        logs.forEach(log -> {
            assertThat(log.getHttpMethod()).isNotBlank();
            assertThat(log.getEndpointPath()).isNotBlank();
            assertThat(log.getHttpStatus()).isNotNull();
            assertThat(log.getActorUsername()).isEqualTo(ADMIN_USERNAME);
        });
    }
}


