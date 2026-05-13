package com.csniico.restart.admin.controller;

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
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminTenantLearnerControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;
    @Autowired private AuditLogRepository auditLogRepository;

    private static final String ADMIN_USERNAME = "admin_learner_ctrl_test";
    private static final String ADMIN_PASSWORD = "adminPass456";
    private static final String INSTR_NAME     = "Admin Learner Test Instructor";
    private static final String SCHEMA_NAME    = "admin_learner_test_instructor"; // SchemaUtil.toSchemaName(INSTR_NAME)

    private String adminToken;

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
    }

    @AfterEach
    void cleanup() {
        tenantRepository.findBySchemaName(SCHEMA_NAME).ifPresent(tenantRepository::delete);
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + SCHEMA_NAME + " CASCADE");
        } catch (Exception ignored) {}
        adminUserRepository.findByUsername(ADMIN_USERNAME).ifPresent(adminUserRepository::delete);
        auditLogRepository.deleteAll(auditLogRepository.findByActorUsername(ADMIN_USERNAME));
        auditLogRepository.deleteAll(auditLogRepository.findByTenantId(SCHEMA_NAME));
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/admin/tenants/{schemaName}/learners — creates learner and returns 201")
    void adminCreateLearner_shouldReturn201() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Nana Addo",
                "email", "nana.addo@institution.edu.gh",
                "phone", "0241112233",
                "institution", "UG",
                "graduated", false));

        mockMvc.perform(post("/api/admin/tenants/{schemaName}/learners", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullname").value("Nana Addo"))
                .andExpect(jsonPath("$.data.id").isNumber());
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/admin/tenants/{schemaName}/learners/bulk — bulk creates and returns 201")
    void adminBulkCreateLearners_shouldReturn201() throws Exception {
        List<Map<String, Object>> learners = List.of(
                Map.of("fullname", "Efua Mensah", "email", "efua.mensah@uni.edu.gh",
                        "phone", "0271112233", "institution", "UCC", "graduated", false),
                Map.of("fullname", "Kojo Boateng", "email", "kojo.boateng@uni.edu.gh",
                        "phone", "0551112233", "institution", "KNUST", "graduated", true)
        );

        mockMvc.perform(post("/api/admin/tenants/{schemaName}/learners/bulk", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(learners)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data", hasSize(2)));

        assertThat(auditLogRepository.findByActorUsername(ADMIN_USERNAME))
                .anyMatch(log -> "ADMIN_BULK_CREATE_LEARNER".equals(log.getAction()));
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/admin/tenants/{schemaName}/learners — lists learners in tenant")
    void adminGetAllLearners_shouldReturnList() throws Exception {
        // Seed
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Esi Quaye", "email", "esi.quaye@uni.edu.gh",
                "phone", "0231112233", "institution", "UHAS", "graduated", false));
        mockMvc.perform(post("/api/admin/tenants/{schemaName}/learners", SCHEMA_NAME)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(body));

        mockMvc.perform(get("/api/admin/tenants/{schemaName}/learners", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].email", hasItem("esi.quaye@uni.edu.gh")));
    }

    @Test
    @Order(4)
    @DisplayName("PUT /api/admin/tenants/{schemaName}/learners/{id} — updates a learner")
    void adminUpdateLearner_shouldReturn200() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Yaw Amponsah", "email", "yaw.amponsah@uni.edu.gh",
                "phone", "0201112233", "institution", "Ashesi", "graduated", false));
        String response = mockMvc.perform(post("/api/admin/tenants/{schemaName}/learners", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        String updateBody = objectMapper.writeValueAsString(Map.of(
                "fullname", "Yaw Amponsah Updated", "email", "yaw.amponsah@uni.edu.gh",
                "phone", "0201112233", "institution", "Ashesi", "graduated", true));

        mockMvc.perform(put("/api/admin/tenants/{schemaName}/learners/{id}", SCHEMA_NAME, id)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.graduated").value(true));

        assertThat(auditLogRepository.findByActorUsername(ADMIN_USERNAME))
                .anyMatch(log -> "ADMIN_UPDATE_LEARNER".equals(log.getAction())
                        && SCHEMA_NAME.equals(log.getTenantId()));
    }

    @Test
    @Order(5)
    @DisplayName("DELETE /api/admin/tenants/{schemaName}/learners/{id} — deletes a learner")
    void adminDeleteLearner_shouldReturn200() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Abena Antwi", "email", "abena.antwi@uni.edu.gh",
                "phone", "0291112233", "institution", "UENR", "graduated", false));
        String response = mockMvc.perform(post("/api/admin/tenants/{schemaName}/learners", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/tenants/{schemaName}/learners/{id}", SCHEMA_NAME, id)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(auditLogRepository.findByActorUsername(ADMIN_USERNAME))
                .anyMatch(log -> "ADMIN_DELETE_LEARNER".equals(log.getAction()));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/admin/tenants/{schemaName}/learners — unknown tenant returns 404")
    void adminGetLearners_unknownTenant_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/admin/tenants/{schemaName}/learners", "nonexistent_schema")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}





