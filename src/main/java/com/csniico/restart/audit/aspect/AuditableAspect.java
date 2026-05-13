package com.csniico.restart.audit.aspect;

import com.csniico.restart.audit.annotation.Auditable;
import com.csniico.restart.audit.context.AuditContext;
import com.csniico.restart.audit.context.AuditEntry;
import com.csniico.restart.multitenancy.TenantContext;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.lang.reflect.Parameter;

@Aspect
@Component
public class AuditableAspect {

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint pjp, Auditable auditable) throws Throwable {
        AuditEntry entry = new AuditEntry();
        entry.setAction(auditable.action());
        entry.setResourceType(auditable.resourceType());

        // For instructor requests TenantContext is already set by JwtAuthenticationFilter
        String tenantId = TenantContext.getTenant();

        // For admin requests operating on a tenant, find schemaName in method params
        if (tenantId == null) {
            tenantId = extractSchemaNameFromArgs(pjp);
        }
        entry.setTenantId(tenantId);
        AuditContext.set(entry);

        try {
            Object result = pjp.proceed();
            // Try to extract the resource ID from ResponseEntity<ApiResponse<T>>
            if (result instanceof ResponseEntity<?> responseEntity) {
                Object body = responseEntity.getBody();
                if (body != null) {
                    try {
                        Object data = body.getClass().getMethod("getData").invoke(body);
                        if (data != null) {
                            try {
                                Long id = (Long) data.getClass().getMethod("getId").invoke(data);
                                entry.setResourceId(id);
                            } catch (Exception ignored) {
                                // data may not have getId() (e.g. List) — that's fine
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
            return result;
        } catch (Throwable t) {
            AuditContext.clear();
            throw t;
        }
    }

    private String extractSchemaNameFromArgs(ProceedingJoinPoint pjp) {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        Parameter[] parameters = sig.getMethod().getParameters();
        Object[] args = pjp.getArgs();
        for (int i = 0; i < parameters.length; i++) {
            String name = parameters[i].getName();
            if (("schemaName".equals(name) || "tenantId".equals(name)) && args[i] instanceof String s) {
                return s;
            }
        }
        return null;
    }
}

