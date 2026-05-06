package com.example.pocmigration;

import org.hibernate.validator.constraints.br.CPF;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(
    basePackages = {
        "com.example.pocmigration.excel_generator.repository",
        "com.example.pocmigration.domiciliation.repository",
        "com.example.pocmigration.securite.repository"
    },
    excludeFilters = {
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.example\\.pocmigration\\.ref\\.repository\\..*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.example\\.pocmigration\\.auth\\.repository\\..*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.example\\.pocmigration\\.domi_domiciliation_22_agc\\.repository\\..*")
    },
    entityManagerFactoryRef = "entityManagerFactory",
    transactionManagerRef = "transactionManager"
)
public class PocMigrationApplication {

    public static void main(String[] args) {
        SpringApplication.run(PocMigrationApplication.class, args);
    }
}
