package IbansysPoc.AVA.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        Server server = new Server();
        server.setUrl("http://localhost:8080");
        server.setDescription("AVA Application Server");

        Contact contact = new Contact();
        contact.setEmail("support@ava.com");
        contact.setName("AVA Support Team");

        License license = new License()
                .name("Apache 2.0")
                .url("https://www.apache.org/licenses/LICENSE-2.0.html");

        Info info = new Info()
                .title("AVA - API de gestion des opérations déléguées")
                .version("1.0.0")
                .contact(contact)
                .description("API REST pour la gestion des opérations déléguées AVA (Avoirs en devises)")
                .termsOfService("https://www.ava.com/terms")
                .license(license);

        return new OpenAPI()
                .info(info)
                .servers(List.of(server));
    }
}

