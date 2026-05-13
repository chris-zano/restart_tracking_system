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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminTenantAttendanceControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;
    @Autowired private AuditLogRepository auditLogRepository;

    private static final String ADMIN_USERNAME = "admin_attend_ctrl_test";
    private static final String ADMIN_PASSWORD = "adminPass456";
    private static final String INSTR_NAME     = "Admin Attendance Test Instructor";
    private static final String SCHEMA_NAME    = "admin_attendance_test_instructor"; // SchemaUtil.toSchemaName(INSTR_NAME)
    private static final String INSTR_USERNAME = "admin_attend_instr";
    private static final String INSTR_PASSWORD = "instrPass456";

    private String adminToken;
    private String instructorToken;
    private Long cohortId;
    private Long learner1Id;

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
                .contentType(MediaType.APPLICATION_JSON).content(provBody));

        instructorToken = getTenantToken(SCHEMA_NAME, INSTR_USERNAME, INSTR_PASSWORD);

        // Create cohort
        String cohortResp = mockMvc.perform(post("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Admin Test Cohort"))))
                .andReturn().getResponse().getContentAsString();
        cohortId = objectMapper.readTree(cohortResp).path("data").path("id").asLong();

        // Create learner
        String learnerResp = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullname", "Admin Test Learner", "email", "admin.test.learner@uni.edu.gh",
                                "phone", "0241000010", "institution", "UG", "graduated", false, "cohortId", cohortId))))
                .andReturn().getResponse().getContentAsString();
        learner1Id = objectMapper.readTree(learnerResp).path("data").path("id").asLong();

        // Create an attendance record via instructor endpoint
        mockMvc.perform(post("/api/instructor/attendance")
                .header("Authorization", "Bearer " + instructorToken)
                .header("X-Tenant-ID", SCHEMA_NAME)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "cohortId", cohortId,
                        "sessionDate", LocalDate.now().toString(),
                        "duration", 120,
                        "participants", List.of(Map.of("learnerId", learner1Id, "duration", 120))
                ))));
    }

    @AfterEach
    void cleanup() {
        tenantRepository.findBySchemaName(SCHEMA_NAME).ifPresent(tenantRepository::delete);
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + SCHEMA_NAME + " CASCADE");
        } catch (Exception ignored) {}
        adminUserRepository.findByUsername(ADMIN_USERNAME).ifPresent(adminUserRepository::delete);
        auditLogRepository.deleteAll(auditLogRepository.findByActorUsername(ADMIN_USERNAME));
    }

    @Test
    @Order(1)
    @DisplayName("GET /api/admin/tenants/{schemaName}/attendance — lists all attendance records")
    void adminGetAllAttendance_shouldReturnList() throws Exception {
        mockMvc.perform(get("/api/admin/tenants/{schema}/attendance", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].participants").isArray());

        assertThat(auditLogRepository.findByActorUsername(ADMIN_USERNAME))
                .anyMatch(l -> "ADMIN_LIST_ATTENDANCE".equals(l.getAction())
                        && SCHEMA_NAME.equals(l.getTenantId()));
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/admin/tenants/{schemaName}/attendance/cohort/{cohortId} — filters by cohort")
    void adminGetAttendanceByCohort_shouldReturnFiltered() throws Exception {
        mockMvc.perform(get("/api/admin/tenants/{schema}/attendance/cohort/{cohortId}", SCHEMA_NAME, cohortId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].cohortId", everyItem(is(cohortId.intValue()))));
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/admin/tenants/{schemaName}/attendance/{id} — returns single record")
    void adminGetAttendanceById_shouldReturnRecord() throws Exception {
        String listResp = mockMvc.perform(get("/api/admin/tenants/{schema}/attendance", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(listResp).path("data").get(0).path("id").asLong();

        mockMvc.perform(get("/api/admin/tenants/{schema}/attendance/{id}", SCHEMA_NAME, id)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.duration").value(120));
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/admin/tenants/{schemaName}/attendance — unknown tenant returns 404")
    void adminGetAttendance_unknownTenant_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/admin/tenants/{schema}/attendance", "nonexistent_schema")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(5)
    @DisplayName("Admin cannot POST attendance — 405 not allowed")
    void adminCannotCreateAttendance_shouldReturn405() throws Exception {
        mockMvc.perform(post("/api/admin/tenants/{schema}/attendance", SCHEMA_NAME)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }
}

