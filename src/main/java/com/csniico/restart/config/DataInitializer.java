package com.csniico.restart.config;

import com.csniico.restart.admin.entity.AdminUser;
import com.csniico.restart.admin.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Value("${ADMIN_USERNAME}")
    private String adminUsername;

    @Value("${ADMIN_PASSWORD}")
    private String adminPassword;

    @Bean
    public CommandLineRunner initializeData(AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Check if admin user already exists
            if (adminUserRepository.findByUsername(adminUsername).isEmpty()) {
                AdminUser adminUser = new AdminUser();
                adminUser.setUsername(adminUsername);
                adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
                adminUserRepository.save(adminUser);
                System.out.println("✓ Default admin user created: username=" + adminUsername);
                System.out.println("⚠️  IMPORTANT: Change the default password in production!");
            }
        };
    }
}
