package com.example.avagen.service;

import com.example.avagen.dto.TraitementAvaDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@Slf4j
public class ApiExterneService {
    private final RestClient avarestClient;
    private final String avarestBaseUrl;

    public ApiExterneService(@Qualifier("AvarestClient") RestClient avarestClient,
                             @Value("${avarest.base-url:http://localhost:8080}") String avarestBaseUrl) {
        this.avarestClient = avarestClient;
        this.avarestBaseUrl = avarestBaseUrl;
    }

    public void consommerTraiterDeclarationFiscale(TraitementAvaDTO dto) {
        String uri = "/api/traitement-ava";
        String url = avarestBaseUrl + uri;

        try {
            // Utilisation de l'API fluente RestClient (similaire à ApiExterneServiceImpl)
            avarestClient
                    .post()
                    .uri(uri)
                    .body(dto)
                    .retrieve()
                    .body(Void.class);

            log.info("Consommation réussie de l'API externe: {}", url);

        } catch (Exception e) {
            log.error("Erreur lors de l'appel à l'API externe {}: {} - {}", url, e.getClass().getName(), e.getMessage(), e);
            throw e;
        }
    }
}
