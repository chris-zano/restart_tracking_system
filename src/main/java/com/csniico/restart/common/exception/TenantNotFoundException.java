package com.csniico.restart.common.exception;

public class TenantNotFoundException extends RuntimeException {
    public TenantNotFoundException(String schemaName) {
        super("Tenant " + schemaName + " not found");
    }
}
