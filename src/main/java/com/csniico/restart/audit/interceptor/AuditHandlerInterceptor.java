package com.csniico.restart.audit.interceptor;

import com.csniico.restart.audit.context.AuditContext;
import com.csniico.restart.audit.context.AuditEntry;
import com.csniico.restart.audit.entity.AuditLog;
import com.csniico.restart.audit.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;

public class AuditHandlerInterceptor implements HandlerInterceptor {

    private final AuditLogService auditLogService;

    public AuditHandlerInterceptor(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        AuditEntry entry = AuditContext.get();
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String actorUsername = "anonymous";
            String actorRole = null;

            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                actorUsername = auth.getName();
                actorRole = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                        .findFirst()
                        .orElse(null);
            }

            AuditLog log = new AuditLog();
            log.setActorUsername(actorUsername);
            log.setActorRole(actorRole);
            log.setTenantId(entry != null ? entry.getTenantId() : null);
            log.setAction(entry != null ? entry.getAction() : null);
            log.setResourceType(entry != null ? entry.getResourceType() : null);
            log.setResourceId(entry != null ? entry.getResourceId() : null);
            log.setHttpMethod(request.getMethod());
            log.setEndpointPath(request.getRequestURI());
            log.setHttpStatus((short) response.getStatus());
            log.setIpAddress(getClientIp(request));

            auditLogService.record(log);
        } catch (Exception ignored) {
            // Never let audit failure break the response
        } finally {
            AuditContext.clear();
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

