package com.csniico.restart.instructor.repository;

import com.csniico.restart.instructor.entity.PasswordMeta;
import com.csniico.restart.instructor.entity.TenantUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordMetaRepository extends JpaRepository<PasswordMeta, Long> {
    Optional<PasswordMeta> findByUser(TenantUser user);
}
