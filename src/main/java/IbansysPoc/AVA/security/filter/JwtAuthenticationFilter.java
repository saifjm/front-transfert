package IbansysPoc.AVA.security.filter;

import IbansysPoc.AVA.security.client.AuthFeignClient;
import IbansysPoc.AVA.security.dto.UserValidationResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JWT Authentication Filter for the AVA microservice.
 *
 * Intercepts every request, extracts the Bearer token from the
 * Authorization header, and delegates validation to the SWF-Auth
 * microservice via Feign (GET /auth/users/me).
 *
 * Flow (matches the Feign diagram):
 *   Client ──► AVA (this filter)
 *                 │  validates token via Feign
 *                 ▼
 *             SWF-Auth ──► DB (check token validity)
 *                 │  returns user info (email, roles)
 *                 ▼
 *             Set SecurityContext
 *                 │
 *                 ▼
 *             Protected resource returned to Client
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final AuthFeignClient authFeignClient;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        // Pass through if no Bearer token is present (public endpoints handled by SecurityConfig)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract X-Session-Id forwarded by the client — required by SWF-Auth's JwtTokenFilter
        final String sessionId = request.getHeader("X-Session-Id");

        try {
            // Delegate token validation to SWF-Auth via Feign
            UserValidationResponse userInfo = authFeignClient.validateToken(authHeader, sessionId != null ? sessionId : "");

            if (userInfo != null
                    && Boolean.TRUE.equals(userInfo.getIsEnabled())
                    && SecurityContextHolder.getContext().getAuthentication() == null) {

                List<SimpleGrantedAuthority> authorities = userInfo.getRoles()
                        .stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .collect(Collectors.toList());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userInfo.getEmail(),
                                null,
                                authorities
                        );
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                // Set SecurityContext — request proceeds to the controller
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

        } catch (Exception ex) {
            // Invalid / expired token — SecurityContext stays empty;
            // SecurityConfig will return 401 for protected routes.
            log.warn("Token validation failed for [{}]: {}", request.getRequestURI(), ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
