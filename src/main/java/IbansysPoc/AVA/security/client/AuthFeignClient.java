package IbansysPoc.AVA.security.client;

import IbansysPoc.AVA.security.dto.AuthRequest;
import IbansysPoc.AVA.security.dto.AuthResponse;
import IbansysPoc.AVA.security.dto.RegisterRequest;
import IbansysPoc.AVA.security.dto.UserValidationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * Feign client that delegates all auth operations to the SWF-Auth microservice.
 *
 * - validateToken  : calls GET /auth/users/me — SWF-Auth checks the JWT against DB
 *                    and returns user info; AVA uses it to set the SecurityContext.
 * - authenticate   : forwards login credentials to SWF-Auth and returns the token pair.
 * - register       : forwards registration payload to SWF-Auth.
 * - refreshToken   : forwards the session + refresh cookie to SWF-Auth.
 *
 * Base URL is configurable via auth.base-url (default: http://localhost:8081).
 */
@FeignClient(name = "swf-auth", url = "${auth.base-url:http://localhost:8081}")
public interface AuthFeignClient {

    /**
     * Validates the Bearer token by calling SWF-Auth.
     * Returns user info (email, roles, enabled flag) if the token is valid.
     * Throws FeignException (4xx/5xx) if the token is invalid or expired.
     * SWF-Auth requires both Authorization and X-Session-Id headers on all requests.
     */
    @GetMapping("/auth/users/me")
    UserValidationResponse validateToken(
            @RequestHeader("Authorization") String bearerToken,
            @RequestHeader("X-Session-Id") String sessionId
    );

    /**
     * Authenticates the user and returns access token + roles.
     */
    @PostMapping("/auth/authenticate")
    AuthResponse authenticate(
            @RequestHeader("X-Session-Id") String sessionId,
            @RequestBody AuthRequest authRequest
    );

    /**
     * Registers a new user account in SWF-Auth.
     */
    @PostMapping("/auth/register")
    AuthResponse register(@RequestBody RegisterRequest registerRequest);

    /**
     * Refreshes the access token using the session ID and the HTTP-only refresh cookie.
     */
    @GetMapping("/auth/refresh-token")
    AuthResponse refreshToken(
            @RequestHeader("X-Session-Id") String sessionId,
            @RequestHeader("Cookie") String cookie
    );
}
