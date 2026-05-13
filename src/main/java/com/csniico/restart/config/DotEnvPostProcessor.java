package com.csniico.restart.config;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Loads a .env file from the working directory (project root) and adds its
 * key=value pairs as a low-priority property source so that real OS environment
 * variables always take precedence.
 */
public class DotEnvPostProcessor implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final String PROPERTY_SOURCE_NAME = "dotenv";

    @Override
    @SuppressWarnings("NullableProblems")
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        Path dotEnv = Paths.get(System.getProperty("user.dir"), ".env");
        if (!Files.exists(dotEnv)) {
            return;
        }

        ConfigurableEnvironment environment = event.getEnvironment();
        // Skip if already loaded (context refresh can fire this twice)
        if (environment.getPropertySources().contains(PROPERTY_SOURCE_NAME)) {
            return;
        }

        Map<String, Object> props = new LinkedHashMap<>();
        try {
            for (String line : Files.readAllLines(dotEnv)) {
                line = line.strip();
                // skip blank lines and comments
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.indexOf('=');
                if (eq < 1) continue;
                String key   = line.substring(0, eq).strip();
                String value = line.substring(eq + 1).strip();
                // strip optional surrounding quotes
                if (value.length() >= 2 &&
                        ((value.startsWith("\"") && value.endsWith("\"")) ||
                         (value.startsWith("'")  && value.endsWith("'")))) {
                    value = value.substring(1, value.length() - 1);
                }
                props.put(key, value);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to read .env file at " + dotEnv, e);
        }

        // Add as last source so actual OS env vars still win
        environment.getPropertySources().addLast(new MapPropertySource(PROPERTY_SOURCE_NAME, props));
    }
}




