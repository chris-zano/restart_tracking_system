package com.csniico.restart.config;

import com.csniico.restart.audit.interceptor.AuditHandlerInterceptor;
import com.csniico.restart.audit.service.AuditLogService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuditLogService auditLogService;

    public WebMvcConfig(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuditHandlerInterceptor(auditLogService));
    }
}

