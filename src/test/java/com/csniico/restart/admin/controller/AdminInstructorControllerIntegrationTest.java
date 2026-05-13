package com.csniico.restart.admin.controller;

import com.csniico.restart.BaseIntegrationTest;
import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminInstructorControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;

    private static final String ADMIN_USERNAME = "instr_admin_test";
    private static final String ADMIN_PASSWORD = "adminPass123";
    private static final String SCHEMA_NAME    = "instr_ctrl_test";
    private static final String INSTR_NAME     = "Instr Ctrl Test";
    private static final String INSTR_USERNAME = "john_doe";
    private static final String INSTR_PASSWORD = "johnPass123";

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
    }

    // ──────────────────────────────────────────────────────
    // POST /api/admin/instructors
    // ──────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /api/admin/instructors — provisions instructor and returns 201")
    void createInstructor_shouldReturn201() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME,
                "username",   INSTR_USERNAME,
                "password",   INSTR_PASSWORD));

        mockMvc.perform(post("/api/admin/instructors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value(INSTR_USERNAME))
                .andExpect(jsonPath("$.data.schemaName").value(SCHEMA_NAME))
                .andExpect(jsonPath("$.data.role").value("INSTRUCTOR"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.id").isNumber());
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/admin/instructors — duplicate username in same tenant returns 400")
    void createInstructor_duplicate_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME,
                "username",   INSTR_USERNAME,
                "password",   INSTR_PASSWORD));

        mockMvc.perform(post("/api/admin/instructors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/instructors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("already exists")));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/admin/instructors — unknown tenant returns 404")
    void createInstructor_unknownTenant_shouldReturn404() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", "nonexistent_schema",
                "username",   INSTR_USERNAME,
                "password",   INSTR_PASSWORD));

        mockMvc.perform(post("/api/admin/instructors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(4)
    @DisplayName("POST /api/admin/instructors — short password returns 400")
    void createInstructor_shortPassword_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME,
                "username",   INSTR_USERNAME,
                "password",   "short"));

        mockMvc.perform(post("/api/admin/instructors")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ──────────────────────────────────────────────────────
    // GET /api/admin/instructors/{schemaName}
    // ──────────────────────────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("GET /api/admin/instructors/{schemaName} — returns instructor list")
    void getInstructors_shouldReturnList() throws Exception {
        // Provision first
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME, "username", INSTR_USERNAME, "password", INSTR_PASSWORD));
        mockMvc.perform(post("/api/admin/instructors")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/admin/instructors/{schemaName}", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].username", hasItem(INSTR_USERNAME)));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/admin/instructors/{schemaName} — unknown tenant returns 404")
    void getInstructors_unknownTenant_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/admin/instructors/{schemaName}", "nonexistent_schema")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    // ──────────────────────────────────────────────────────
    // DELETE /api/admin/instructors/{schemaName}/{username}
    // ──────────────────────────────────────────────────────

    @Test
    @Order(7)
    @DisplayName("DELETE /api/admin/instructors/{schemaName}/{username} — removes instructor")
    void deleteInstructor_shouldReturn200() throws Exception {
        // Provision first
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME, "username", INSTR_USERNAME, "password", INSTR_PASSWORD));
        mockMvc.perform(post("/api/admin/instructors")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(delete("/api/admin/instructors/{schemaName}/{username}", SCHEMA_NAME, INSTR_USERNAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify gone from list
        mockMvc.perform(get("/api/admin/instructors/{schemaName}", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @Order(8)
    @DisplayName("DELETE /api/admin/instructors/{schemaName}/{username} — unknown instructor returns 404")
    void deleteInstructor_notFound_shouldReturn404() throws Exception {
        mockMvc.perform(delete("/api/admin/instructors/{schemaName}/{username}", SCHEMA_NAME, "nobody")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(9)
    @DisplayName("POST /api/admin/instructors — instructor can login after provisioning")
    void provisionedInstructor_canLogin() throws Exception {
        // Provision
        String body = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME, "username", INSTR_USERNAME, "password", INSTR_PASSWORD));
        mockMvc.perform(post("/api/admin/instructors")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated());

        // Login as instructor
        String token = getTenantToken(SCHEMA_NAME, INSTR_USERNAME, INSTR_PASSWORD);
        Assertions.assertFalse(token.isBlank(), "Instructor JWT should not be blank");
    }
}

