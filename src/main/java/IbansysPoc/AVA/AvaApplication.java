package IbansysPoc.AVA;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableFeignClients(basePackages = "IbansysPoc.AVA.security.client")
public class AvaApplication {

	public static void main(String[] args) {
		SpringApplication.run(AvaApplication.class, args);
	}

}
