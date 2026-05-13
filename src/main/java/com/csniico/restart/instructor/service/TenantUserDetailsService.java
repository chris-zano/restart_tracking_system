
package com.csniico.restart.instructor.service;

import com.csniico.restart.instructor.entity.TenantUser;
import com.csniico.restart.instructor.repository.TenantUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TenantUserDetailsService implements UserDetailsService {

    private final TenantUserRepository tenantUserRepository;

    public TenantUserDetailsService(TenantUserRepository tenantUserRepository) {
        this.tenantUserRepository = tenantUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        TenantUser user = tenantUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Instructor not found: " + username));
        return new User(
                user.getUsername(),
                user.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}

