package com.csniico.restart.audit.context;

public class AuditContext {

    private static final ThreadLocal<AuditEntry> CURRENT = new ThreadLocal<>();

    private AuditContext() {}

    public static void set(AuditEntry entry) {
        CURRENT.set(entry);
    }

    public static AuditEntry get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}

