package com.csniico.restart.tenant.controller;

import com.csniico.restart.BaseIntegrationTest;
import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
import com.csniico.restart.tenant.repository.TenantRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TenantControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DataSource dataSource;

    private static final String INSTRUCTOR_NAME = "Test Instructor";
    private static final String SCHEMA_NAME     = "test_instructor";

    private static final String ADMIN_USERNAME = "test_admin";
    private static final String ADMIN_PASSWORD = "admin_pass_123";

    private String adminToken;

    @BeforeEach
    void seedAdminAndToken() throws Exception {
        if (!adminUserRepository.existsByUsername(ADMIN_USERNAME)) {
            AdminUser admin = new AdminUser();
            admin.setUsername(ADMIN_USERNAME);
            admin.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD));
            adminUserRepository.save(admin);
        }
        adminToken = getAdminToken(ADMIN_USERNAME, ADMIN_PASSWORD);
    }

    @AfterEach
    void cleanup() {
        tenantRepository.findBySchemaName(SCHEMA_NAME)
                .ifPresent(tenantRepository::delete);
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + SCHEMA_NAME + " CASCADE");
        } catch (Exception ignored) {}
        adminUserRepository.findByUsername(ADMIN_USERNAME)
                .ifPresent(adminUserRepository::delete);
    }

    // ─────────────────────────────────────────────
    // POST /api/tenants
    // ─────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /api/tenants — creates tenant and returns 201")
    void createTenant_shouldReturn201AndPersistToDb() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("instructorName", INSTRUCTOR_NAME));

        mockMvc.perform(post("/api/tenants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemaName").value(SCHEMA_NAME))
                .andExpect(jsonPath("$.data.instructorName").value(INSTRUCTOR_NAME))
                .andExpect(jsonPath("$.data.id").isNumber());

        // Verify it actually exists in the DB
        assertTrue(tenantRepository.existsBySchemaName(SCHEMA_NAME));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/tenants — duplicate tenant returns 400")
    void createTenant_duplicate_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("instructorName", INSTRUCTOR_NAME));

        // Create first time
        mockMvc.perform(post("/api/tenants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        // Try to create again
        mockMvc.perform(post("/api/tenants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("already exists")));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/tenants — blank name returns 400")
    void createTenant_blankName_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("instructorName", ""));

        mockMvc.perform(post("/api/tenants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────
    // GET /api/tenants
    // ─────────────────────────────────────────────

    @Test
    @Order(4)
    @DisplayName("GET /api/tenants — returns list including created tenant")
    void getAllTenants_shouldReturnList() throws Exception {
        // Seed a tenant first
        String body = objectMapper.writeValueAsString(Map.of("instructorName", INSTRUCTOR_NAME));
        mockMvc.perform(post("/api/tenants")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/tenants")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].schemaName", hasItem(SCHEMA_NAME)));
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/tenants/{schemaName} — returns correct tenant")
    void getTenantBySchema_shouldReturnTenant() throws Exception {
        // Seed first
        String body = objectMapper.writeValueAsString(Map.of("instructorName", INSTRUCTOR_NAME));
        mockMvc.perform(post("/api/tenants")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/tenants/{schemaName}", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.schemaName").value(SCHEMA_NAME))
                .andExpect(jsonPath("$.data.instructorName").value(INSTRUCTOR_NAME))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty());
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/tenants/{schemaName} — unknown schema returns 404")
    void getTenantBySchema_notFound_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/tenants/{schemaName}", "nonexistent_schema")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("nonexistent_schema")));
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/tenants — no token returns 401")
    void getAllTenants_noToken_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isUnauthorized());
    }
}