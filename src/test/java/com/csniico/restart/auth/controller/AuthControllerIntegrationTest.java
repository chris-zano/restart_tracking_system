package com.csniico.restart.auth.controller;

import com.csniico.restart.BaseIntegrationTest;
import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthControllerIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String USERNAME = "auth_test_admin";
    private static final String PASSWORD = "secure_pass_456";

    @BeforeEach
    void seedAdmin() {
        if (!adminUserRepository.existsByUsername(USERNAME)) {
            AdminUser admin = new AdminUser();
            admin.setUsername(USERNAME);
            admin.setPasswordHash(passwordEncoder.encode(PASSWORD));
            adminUserRepository.save(admin);
        }
    }

    @AfterEach
    void cleanup() {
        adminUserRepository.findByUsername(USERNAME).ifPresent(adminUserRepository::delete);
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/auth/admin/login — valid credentials return 200 + token")
    void adminLogin_validCredentials_shouldReturn200AndToken() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", USERNAME, "password", PASSWORD));

        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.tenantId").doesNotExist());
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/auth/admin/login — wrong password returns 401")
    void adminLogin_wrongPassword_shouldReturn401() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", USERNAME, "password", "wrong_password"));

        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/auth/admin/login — unknown user returns 401")
    void adminLogin_unknownUser_shouldReturn401() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", "nobody", "password", PASSWORD));

        mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(4)
    @DisplayName("POST /api/auth/login — missing X-Tenant-ID returns 400")
    void instructorLogin_noTenantHeader_shouldReturn400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("username", USERNAME, "password", PASSWORD));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

