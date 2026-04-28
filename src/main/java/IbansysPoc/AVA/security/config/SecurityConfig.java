package IbansysPoc.AVA.security.config;

import IbansysPoc.AVA.security.filter.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration for AVA.
 *
 * - Stateless JWT session (no server-side session).
 * - CSRF disabled (REST API).
 * - Public routes: health, swagger, /auth/login, /auth/register proxy.
 * - All other routes require a valid Bearer token validated by SWF-Auth.
 * - @EnableMethodSecurity allows @PreAuthorize on service/controller methods.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private static final String[] PUBLIC_PATHS = {
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/actuator/health",
            "/swagger-ui/**",
            "/swagger-ui.html",
            // default springdoc paths (kept as fallback)
            "/v3/api-docs",
            "/v3/api-docs/**",
            // custom paths configured via springdoc.api-docs.path=/api-docs
            "/api-docs",
            "/api-docs/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
