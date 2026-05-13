package com.csniico.restart.instructor.cohort.controller;

import com.csniico.restart.BaseIntegrationTest;
import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import com.csniico.restart.multitenancy.TenantContext;
import com.csniico.restart.tenant.service.TenantService;
import com.csniico.restart.tenant.dto.TenantRequestDto;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CohortControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TenantService tenantService;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private TenantUserRepository tenantUserRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DataSource dataSource;

    private static final String SCHEMA_NAME       = "cohort_test_instructor";
    private static final String INSTRUCTOR_NAME   = "Cohort Test Instructor";
    private static final String INSTR_USERNAME    = "instr_cohort_user";
    private static final String INSTR_PASSWORD    = "instr_pass_789";
    private static final String ADMIN_USERNAME    = "cohort_test_admin";
    private static final String ADMIN_PASSWORD    = "admin_cohort_pass";

    private String instructorToken;

    @BeforeEach
    void setup() throws Exception {
        // Create admin for tenant provisioning
        if (!adminUserRepository.existsByUsername(ADMIN_USERNAME)) {
            AdminUser admin = new AdminUser();
            admin.setUsername(ADMIN_USERNAME);
            admin.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD));
            adminUserRepository.save(admin);
        }

        // Create tenant (also runs per-tenant Flyway → creates users + cohorts tables)
        if (!tenantRepository.existsBySchemaName(SCHEMA_NAME)) {
            TenantRequestDto req = new TenantRequestDto();
            req.setInstructorName(INSTRUCTOR_NAME);
            tenantService.createTenant(req);
        }

        // Seed instructor user in the tenant schema
        TenantContext.setTenant(SCHEMA_NAME);
        try {
            if (tenantUserRepository.findByUsername(INSTR_USERNAME).isEmpty()) {
                TenantUser user = new TenantUser();
                user.setUsername(INSTR_USERNAME);
                user.setPasswordHash(passwordEncoder.encode(INSTR_PASSWORD));
                tenantUserRepository.save(user);
            }
        } finally {
            TenantContext.clearTenant();
        }

        // Get instructor JWT
        instructorToken = getTenantToken(SCHEMA_NAME, INSTR_USERNAME, INSTR_PASSWORD);
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
    // POST /api/instructor/cohorts
    // ─────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /api/instructor/cohorts — creates cohort and returns 201")
    void createCohort_shouldReturn201() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("name", "Spring 2026", "description", "First cohort"));

        mockMvc.perform(post("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Spring 2026"))
                .andExpect(jsonPath("$.data.description").value("First cohort"))
                .andExpect(jsonPath("$.data.id").isNumber());
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/instructor/cohorts — returns cohorts list")
    void getAllCohorts_shouldReturnList() throws Exception {
        // Seed a cohort
        String body = objectMapper.writeValueAsString(Map.of("name", "Autumn 2026"));
        mockMvc.perform(post("/api/instructor/cohorts")
                .header("Authorization", "Bearer " + instructorToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[*].name", hasItem("Autumn 2026")));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/instructor/cohorts — blank name returns 400")
    void createCohort_blankName_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("name", ""));

        mockMvc.perform(post("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/instructor/cohorts — no token returns 401")
    void getCohorts_noToken_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/instructor/cohorts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/instructor/cohorts — admin token returns 403")
    void getCohorts_adminToken_shouldReturn403() throws Exception {
        String adminToken = getAdminToken(ADMIN_USERNAME, ADMIN_PASSWORD);
        mockMvc.perform(get("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }
}

