package IbansysPoc.AVA.config;

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

    @Value("${api.externe.base-url}")
    private String apiExterneBaseUrl;

    @Value("${api.ref.base-url}")
    private String apiRefBaseUrl;

    @Value("${api.securite.base-url}")
    private String apiSecBaseUrl;

    @Value("${api.swf-mail.base-url}")
    private String apiSwfBaseUrl;

    /**
     * RestClient pour l'API Declarations Fiscales (port 8085)
     */
    @Bean(name = "restClient")
    public RestClient restClient() {
        return RestClient.builder()
                .baseUrl(apiExterneBaseUrl)
                .build();
    }

    /**
     * RestClient pour l'API Referentiels (port 8443)
     */
    @Bean(name = "refRestClient")
    public RestClient refRestClient() {
        return RestClient.builder()
                .baseUrl(apiRefBaseUrl)
                .build();
    }

    /**
     * RestClient pour l'API Securite (port 8082)
     */
    @Bean(name = "secRestClient")
    public RestClient secRestClient() {
        return RestClient.builder()
                .baseUrl(apiSecBaseUrl)
                .build();
    }


    /**
     * RestClient pour l'API SWF-MAIL (port 8097)
     */
    @Bean(name = "swfRestClient")
    public RestClient SwfRestClient() {
        return RestClient.builder()
                .baseUrl(apiSwfBaseUrl)
                .build();
    }
}

