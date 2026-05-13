package com.csniico.restart.instructor.repository;

import com.csniico.restart.instructor.entity.TenantUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantUserRepository extends JpaRepository<TenantUser, Long> {
    Optional<TenantUser> findByUsername(String username);
    boolean existsByUsername(String username);
}


