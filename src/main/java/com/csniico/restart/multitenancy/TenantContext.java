package com.csniico.restart.multitenancy;

public class TenantContext {
    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static String getTenant() {
        return CURRENT_TENANT.get();
    }
    public static void setTenant(String tenant) {
        CURRENT_TENANT.set(tenant);
    }
    public static void clearTenant() {
        CURRENT_TENANT.remove();
    }
}
