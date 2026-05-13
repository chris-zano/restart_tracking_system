package com.csniico.restart.config;

import com.csniico.restart.multitenancy.SchemaMultiTenantConnectionProvider;
import com.csniico.restart.multitenancy.TenantIdentifierResolver;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class HibernateConfig {

    @Bean
    @DependsOn("flyway")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            DataSource dataSource,
            TenantIdentifierResolver tenantResolver,
            SchemaMultiTenantConnectionProvider connectionProvider) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.csniico.restart");

        em.setJpaVendorAdapter(new HibernateJpaVendorAdapter());

        Map<String, Object> props = new HashMap<>();
        props.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
        props.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantResolver);
        props.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");

        em.setJpaPropertyMap(props);
        return em;
    }
}