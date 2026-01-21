package com.example.securiteservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.example.securiteservice.repository")
public class SecuriteJpaConfig {
}
