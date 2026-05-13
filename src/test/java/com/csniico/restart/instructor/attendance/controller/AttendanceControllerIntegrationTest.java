package com.csniico.restart.instructor.attendance.controller;

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
class AttendanceControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired private AdminUserRepository adminUserRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private TenantService tenantService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private DataSource dataSource;
    @Autowired private AuditLogRepository auditLogRepository;

    private static final String ADMIN_USERNAME = "attend_admin_test";
    private static final String ADMIN_PASSWORD = "adminPass123";
    private static final String INSTR_NAME     = "Attendance Test Instructor";
    private static final String SCHEMA_NAME    = "attendance_test_instructor"; // SchemaUtil.toSchemaName(INSTR_NAME)
    private static final String INSTR_USERNAME = "attend_instr_user";
    private static final String INSTR_PASSWORD = "instrPass123";

    private String adminToken;
    private String instructorToken;
    private Long cohortId;
    private Long learner1Id;
    private Long learner2Id;

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

        // Provision instructor
        String provBody = objectMapper.writeValueAsString(Map.of(
                "schemaName", SCHEMA_NAME, "username", INSTR_USERNAME, "password", INSTR_PASSWORD));
        mockMvc.perform(post("/api/admin/instructors")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(provBody));

        instructorToken = getTenantToken(SCHEMA_NAME, INSTR_USERNAME, INSTR_PASSWORD);

        // Create a cohort
        String cohortBody = objectMapper.writeValueAsString(Map.of("name", "Test Cohort"));
        String cohortResp = mockMvc.perform(post("/api/instructor/cohorts")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(cohortBody))
                .andReturn().getResponse().getContentAsString();
        cohortId = objectMapper.readTree(cohortResp).path("data").path("id").asLong();

        // Create two learners
        String l1 = objectMapper.writeValueAsString(Map.of(
                "fullname", "Learner One", "email", "learner.one@uni.edu.gh",
                "phone", "0241000001", "institution", "UG", "graduated", false, "cohortId", cohortId));
        String l1Resp = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(l1))
                .andReturn().getResponse().getContentAsString();
        learner1Id = objectMapper.readTree(l1Resp).path("data").path("id").asLong();

        String l2 = objectMapper.writeValueAsString(Map.of(
                "fullname", "Learner Two", "email", "learner.two@uni.edu.gh",
                "phone", "0241000002", "institution", "UG", "graduated", false, "cohortId", cohortId));
        String l2Resp = mockMvc.perform(post("/api/instructor/learners")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON).content(l2))
                .andReturn().getResponse().getContentAsString();
        learner2Id = objectMapper.readTree(l2Resp).path("data").path("id").asLong();
    }

    @AfterEach
    void cleanup() {
        tenantRepository.findBySchemaName(SCHEMA_NAME).ifPresent(tenantRepository::delete);
        try (Connection conn = dataSource.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("DROP SCHEMA IF EXISTS " + SCHEMA_NAME + " CASCADE");
        } catch (Exception ignored) {}
        adminUserRepository.findByUsername(ADMIN_USERNAME).ifPresent(adminUserRepository::delete);
        auditLogRepository.deleteAll(auditLogRepository.findByTenantId(SCHEMA_NAME));
    }

    private Map<String, Object> attendancePayload() {
        return Map.of(
                "cohortId", cohortId,
                "sessionDate", LocalDate.now().toString(),
                "duration", 120,
                "participants", List.of(
                        Map.of("learnerId", learner1Id, "duration", 120),
                        Map.of("learnerId", learner2Id, "duration", 90)
                )
        );
    }

    // ── CREATE ───────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("POST /api/instructor/attendance — records attendance and returns 201")
    void createAttendance_shouldReturn201() throws Exception {
        mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendancePayload())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.cohortId").value(cohortId))
                .andExpect(jsonPath("$.data.duration").value(120))
                .andExpect(jsonPath("$.data.participants", hasSize(2)));

        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(l -> "CREATE_ATTENDANCE".equals(l.getAction()) && "ATTENDANCE".equals(l.getResourceType()));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/instructor/attendance — invalid learner ID returns 404")
    void createAttendance_invalidLearnerId_shouldReturn404() throws Exception {
        Map<String, Object> payload = Map.of(
                "cohortId", cohortId,
                "sessionDate", LocalDate.now().toString(),
                "duration", 120,
                "participants", List.of(Map.of("learnerId", 99999L, "duration", 90))
        );

        mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/instructor/attendance — invalid cohort ID returns 404")
    void createAttendance_invalidCohortId_shouldReturn404() throws Exception {
        Map<String, Object> payload = Map.of(
                "cohortId", 99999L,
                "sessionDate", LocalDate.now().toString(),
                "duration", 60,
                "participants", List.of(Map.of("learnerId", learner1Id, "duration", 60))
        );

        mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(4)
    @DisplayName("POST /api/instructor/attendance — empty participants returns 400")
    void createAttendance_emptyParticipants_shouldReturn400() throws Exception {
        Map<String, Object> payload = Map.of(
                "cohortId", cohortId,
                "sessionDate", LocalDate.now().toString(),
                "duration", 120,
                "participants", List.of()
        );

        mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest());
    }

    // ── READ ─────────────────────────────────────────────────

    @Test
    @Order(5)
    @DisplayName("GET /api/instructor/attendance — lists all attendance records")
    void getAllAttendance_shouldReturnList() throws Exception {
        mockMvc.perform(post("/api/instructor/attendance")
                .header("Authorization", "Bearer " + instructorToken)
                .header("X-Tenant-ID", SCHEMA_NAME)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(attendancePayload())));

        mockMvc.perform(get("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/instructor/attendance/cohort/{cohortId} — filters by cohort")
    void getAttendanceByCohort_shouldReturnFiltered() throws Exception {
        mockMvc.perform(post("/api/instructor/attendance")
                .header("Authorization", "Bearer " + instructorToken)
                .header("X-Tenant-ID", SCHEMA_NAME)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(attendancePayload())));

        mockMvc.perform(get("/api/instructor/attendance/cohort/{cohortId}", cohortId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].cohortId", everyItem(is(cohortId.intValue()))));
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/instructor/attendance/{id} — returns single record")
    void getAttendanceById_shouldReturnRecord() throws Exception {
        String response = mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendancePayload())))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        mockMvc.perform(get("/api/instructor/attendance/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.participants", hasSize(2)));
    }

    // ── UPDATE ───────────────────────────────────────────────

    @Test
    @Order(8)
    @DisplayName("PUT /api/instructor/attendance/{id} — updates attendance record")
    void updateAttendance_shouldReturn200() throws Exception {
        String response = mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendancePayload())))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        Map<String, Object> update = Map.of(
                "cohortId", cohortId,
                "sessionDate", LocalDate.now().toString(),
                "duration", 90,
                "participants", List.of(Map.of("learnerId", learner1Id, "duration", 90))
        );

        mockMvc.perform(put("/api/instructor/attendance/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.duration").value(90))
                .andExpect(jsonPath("$.data.participants", hasSize(1)));

        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(l -> "UPDATE_ATTENDANCE".equals(l.getAction()));
    }

    // ── DELETE ───────────────────────────────────────────────

    @Test
    @Order(9)
    @DisplayName("DELETE /api/instructor/attendance/{id} — deletes attendance record")
    void deleteAttendance_shouldReturn200() throws Exception {
        String response = mockMvc.perform(post("/api/instructor/attendance")
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendancePayload())))
                .andReturn().getResponse().getContentAsString();
        Long id = objectMapper.readTree(response).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/instructor/attendance/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/instructor/attendance/{id}", id)
                        .header("Authorization", "Bearer " + instructorToken)
                        .header("X-Tenant-ID", SCHEMA_NAME))
                .andExpect(status().isNotFound());

        assertThat(auditLogRepository.findByTenantId(SCHEMA_NAME))
                .anyMatch(l -> "DELETE_ATTENDANCE".equals(l.getAction()));
    }

    @Test
    @Order(10)
    @DisplayName("POST /api/instructor/attendance — unauthenticated returns 401")
    void createAttendance_unauthenticated_shouldReturn401() throws Exception {
        mockMvc.perform(post("/api/instructor/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(attendancePayload())))
                .andExpect(status().isUnauthorized());
    }
}

