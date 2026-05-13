package com.csniico.restart.instructor.learner.controller;

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
class LearnerControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;
    @Autowired private AuditLogRepository auditLogRepository;

    private static final String ADMIN_USERNAME = "learner_admin_test";
    private static final String ADMIN_PASSWORD = "adminPass123";
    private static final String INSTR_NAME     = "Learner Test Instructor";
    private static final String SCHEMA_NAME    = "learner_test_instructor"; // SchemaUtil.toSchemaName(INSTR_NAME)
    private static final String INSTR_USERNAME = "learner_instr_user";
    private static final String INSTR_PASSWORD = "instrPass123";

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

        // Provision instructor if not already
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
        auditLogRepository.deleteAll(
                auditLogRepository.findByTenantId(SCHEMA_NAME));
    }

    // ── Single Create ────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /api/instructor/learners — creates learner and returns 201")
    void createLearner_shouldReturn201() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Kofi Mensah",
                "email", "kofi.mensah@institution.edu.gh",
                "phone", "0241234567",
                "institution", "UG",
                "graduated", false));

        mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullname").value("Kofi Mensah"))
                .andExpect(jsonPath("$.data.email").value("kofi.mensah@institution.edu.gh"))
                .andExpect(jsonPath("$.data.phone").value("0241234567"))
                .andExpect(jsonPath("$.data.id").isNumber());

        // Assert audit was recorded
        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(log -> "CREATE_LEARNER".equals(log.getAction()) && "LEARNER".equals(log.getResourceType()));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/instructor/learners — invalid phone returns 400")
    void createLearner_invalidPhone_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Kofi Mensah",
                "email", "bad.phone@test.com",
                "phone", "12345",        // too short and wrong prefix
                "institution", "UG",
                "graduated", false));

        mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/instructor/learners/bulk — bulk creates learners and returns 201")
    void createBulkLearners_shouldReturn201() throws Exception {
        List<Map<String, Object>> learners = List.of(
                Map.of("fullname", "Ama Owusu", "email", "ama.owusu@institution.edu.gh",
                        "phone", "0271234567", "institution", "KNUST", "graduated", true),
                Map.of("fullname", "Yaw Asante", "email", "yaw.asante@institution.edu.gh",
                        "phone", "0551234567", "institution", "UCC", "graduated", false)
        );

        mockMvc.perform(post("/api/instructor/learners/bulk")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(learners)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].email", hasItems("ama.owusu@institution.edu.gh", "yaw.asante@institution.edu.gh")));

        // Assert audit was recorded for bulk
        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(log -> "BULK_CREATE_LEARNER".equals(log.getAction()));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/instructor/learners — returns all learners list")
    void getAllLearners_shouldReturnList() throws Exception {
        // Seed one learner
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Abena Boateng", "email", "abena.boateng@uni.edu.gh",
                "phone", "0231234567", "institution", "GIMPA", "graduated", false));
        mockMvc.perform(post("/api/instructor/learners")
                .header("Authorization", "Bearer " + instructorToken)
                .header("X-Tenant-ID", SCHEMA_NAME)
                .contentType(MediaType.APPLICATION_JSON).content(body));

        mockMvc.perform(get("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].fullname", hasItem("Abena Boateng")));
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/instructor/learners/{id} — returns learner by id")
    void getLearnerById_shouldReturnLearner() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Kwame Darko", "email", "kwame.darko@uni.edu.gh",
                "phone", "0201234567", "institution", "Ashesi", "graduated", false));
        String response = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();

        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        mockMvc.perform(get("/api/instructor/learners/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullname").value("Kwame Darko"))
                .andExpect(jsonPath("$.data.id").value(id));
    }

    @Test
    @Order(6)
    @DisplayName("PUT /api/instructor/learners/{id} — updates learner")
    void updateLearner_shouldReturn200() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Akosua Nyarko", "email", "akosua.nyarko@uni.edu.gh",
                "phone", "0291234567", "institution", "UHAS", "graduated", false));
        String response = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        String updateBody = objectMapper.writeValueAsString(Map.of(
                "fullname", "Akosua Nyarko-Updated", "email", "akosua.nyarko@uni.edu.gh",
                "phone", "0291234567", "institution", "UHAS", "graduated", true));

        mockMvc.perform(put("/api/instructor/learners/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullname").value("Akosua Nyarko-Updated"))
                .andExpect(jsonPath("$.data.graduated").value(true));

        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(log -> "UPDATE_LEARNER".equals(log.getAction()));
    }

    @Test
    @Order(7)
    @DisplayName("DELETE /api/instructor/learners/{id} — deletes learner")
    void deleteLearner_shouldReturn200() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "Fiifi Amoah", "email", "fiifi.amoah@uni.edu.gh",
                "phone", "0331234567", "institution", "UENR", "graduated", false));
        String response = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/instructor/learners/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/instructor/learners/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isNotFound());

        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(log -> "DELETE_LEARNER".equals(log.getAction()));
    }

    @Test
    @Order(8)
    @DisplayName("POST /api/instructor/learners — unauthenticated returns 401")
    void createLearner_unauthenticated_shouldReturn401() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullname", "No Auth", "email", "noauth@uni.edu.gh",
                "phone", "0241234568", "institution", "UG", "graduated", false));
        mockMvc.perform(post("/api/instructor/learners")
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }
}


