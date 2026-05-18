package IbansysPoc.AVA.security.controller;

import IbansysPoc.AVA.security.client.AuthFeignClient;
import IbansysPoc.AVA.security.dto.AuthRequest;
import IbansysPoc.AVA.security.dto.AuthResponse;
import IbansysPoc.AVA.security.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Thin proxy controller that forwards authentication requests from clients
 * to the SWF-Auth microservice.
 *
 * AVA does NOT store or validate credentials — it delegates entirely to SWF-Auth.
 *
 * Exposed endpoints (all public — see SecurityConfig):
 *   POST /auth/register  → SWF-Auth POST /auth/register
 *   POST /auth/login     → SWF-Auth POST /auth/authenticate
 *
 * The returned access token is then used by the client in
 * "Authorization: Bearer <token>" for all subsequent calls to AVA.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthProxyController {

    private final AuthFeignClient authFeignClient;

    /**
     * Register a new user account via SWF-Auth.
     * Returns the access token so the client can authenticate immediately.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest registerRequest
    ) {
        AuthResponse response = authFeignClient.register(registerRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Authenticate (login) via SWF-Auth.
     * Forwards credentials + X-Session-Id header and relays the token response.
     * The Set-Cookie (refresh token) from SWF-Auth is forwarded via the response header.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestHeader(value = "X-Session-Id", defaultValue = "default-session") String sessionId,
            @Valid @RequestBody AuthRequest authRequest,
            HttpServletResponse httpResponse
    ) {
        AuthResponse response = authFeignClient.authenticate(sessionId, authRequest);
        // Propagate X-Session-Id header so clients can use it for refresh/logout
        httpResponse.setHeader("X-Session-Id", sessionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Refresh the access token via SWF-Auth.
     * Client must provide the X-Session-Id and the refresh cookie (HttpOnly).
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestHeader("X-Session-Id") String sessionId,
            @RequestHeader(HttpHeaders.COOKIE) String cookie
    ) {
        AuthResponse response = authFeignClient.refreshToken(sessionId, cookie);
        return ResponseEntity.ok(response);
    }
}
