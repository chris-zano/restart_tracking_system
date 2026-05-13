package com.csniico.restart.config;

import org.flywaydb.core.Flyway;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
public class FlyWayConfig {

    @Bean(initMethod = "migrate")
    public Flyway flyway(DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .schemas("public")
                .locations("classpath:db/migration/public")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();
    }
}