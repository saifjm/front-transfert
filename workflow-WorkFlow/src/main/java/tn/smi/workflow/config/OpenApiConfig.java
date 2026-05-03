package tn.smi.workflow.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MS-WF — Workflow Microservice API")
                        .version("1.0.0")
                        .description("Backend Workflow Microservice based on Spring Boot + Flowable embedded. " +
                                "Provides workflow runtime, task management, routing, SoD, and admin APIs.")
                        .contact(new Contact()
                                .name("SMI - IBANSYS")
                                .email("support@smi.tn")));
    }
}

