package com.csniico.restart.common.util;

public class SchemaUtil {
    private SchemaUtil() {
    }

    /**
     * Sanitizes a raw string into a safe PostgreSQL schema name
     * eg "My Company!" -> "my_company"
     *
     * @param raw input string
     * @return PostgreSQL compatible schema name
     */
    public static String toSchemaName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Schema name cannot be blank");
        }
        return raw.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_") // Replace unsafe characters with underscores
                .replaceAll("^_+|_+$", "") // Remove leading/trailing underscores
                .replaceAll("_+", "_"); // Replace multiple underscores with single underscore
    }

    /**
     * Validates that a schema name is safe to use in raw SQL (SET search_path).
     */
    public static boolean isValid(String schemaName) {
        return schemaName != null && schemaName.matches("^[a-z0-9_]+$");
    }
}
