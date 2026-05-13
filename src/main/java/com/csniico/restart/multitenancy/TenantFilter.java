package com.csniico.restart.multitenancy;

import com.csniico.restart.common.util.SchemaUtil;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class TenantFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;
        String tenantHeader = req.getHeader("X-Tenant-ID");

        if (tenantHeader != null && !tenantHeader.isBlank()) {
            if (!SchemaUtil.isValid(tenantHeader)) {
                ((HttpServletResponse) response).sendError(400, "Invalid X-Tenant-ID header");
                return;
            }
            TenantContext.setTenant(tenantHeader);
        }

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clearTenant();
        }
    }
}