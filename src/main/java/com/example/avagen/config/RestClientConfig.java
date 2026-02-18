package com.example.avagen.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

/**
 * Configuration pour les appels vers des APIs externes.
 * - api.externe.base-url : API Declarations Fiscales (port 8085)
 * - api.ref.base-url : API Referentiels (port 8443)
 */
@Configuration
public class RestClientConfig {

    @Value("${api.ava.base-url}")
    private String apiAVABaseUrl;


    /**
     * RestClient pour l'API Declarations Fiscales (port 8080)
     */
    @Bean(name = "AvarestClient")
    public RestClient restClient() {
        return RestClient.builder()
                .baseUrl(apiAVABaseUrl)
                .build();
    }

}

