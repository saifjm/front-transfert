# Auth Integration Guide — AVA ? SWF-Auth

## Purpose

This document describes how **AVA** delegates authentication and session management to the **SWF-Auth** microservice (`http://localhost:8081`). It covers the full architecture, Mermaid diagrams, implementation details, and the Copilot prompt to regenerate the integration code.

---

## High-Level Goals

- Keep the microservices architecture — **do not** recreate auth logic inside AVA.
- All login / registration / refresh / logout flows execute inside **SWF-Auth**.
- AVA acts as a **protected resource** that validates tokens by calling SWF-Auth via Feign.
- Secrets and base URLs are stored in `application.properties` / env vars.

---

## Component Responsibilities

| Component | Role |
|-----------|------|
| **SWF-Auth** | Issues JWTs, stores users + roles in Oracle DB, optionally authenticates via LDAP |
| **AVA** | Protected resource; forwards credentials to SWF-Auth; validates tokens via Feign before serving requests |
| **Client App** | Calls AVA (or SWF-Auth directly) to authenticate, then uses Bearer token for all AVA API calls |

---

## Architecture Overview (SWF-Auth internals)

```mermaid
flowchart LR
    subgraph SWF["SWF Auth Microservice"]
        direction TB
        Controllers --> Services
        Configurations --> Services
        Utils --> Services
        Services --> Repositories
        Services --> Strategies
    end
    Client["Client Application"] --> GW["API Gateway"]
    GW --> SWF
    SWF --> OracleDB[("Oracle Database")]
    SWF --> LDAP["LDAP Server"]
```

---

## Local Auth Strategy Flow (inside SWF-Auth)

```mermaid
flowchart TD
    A[User Login] --> B[LocalAuthStrategy.authenticateUser]
    B --> C[Spring Security AuthenticationManager]
    C --> D[DaoAuthenticationProvider]
    D --> E[UserDetailsService]
    E --> F[UserRepository.findByEmail]
    F --> G[(Database)]
    G --> H{Valid Credentials?}
    H -->|Yes| I[Return UserDTO]
    H -->|No| J[Throw BadCredentialsException]
```

---

## LDAP Auth Strategy Flow (inside SWF-Auth)

```mermaid
flowchart TD
    A[User Login] --> B[LdapAuthStrategy.authenticateUser]
    B --> C[LdapAuthenticationService.authenticateAgainstLdap]
    C --> D[LDAP Server]
    D --> E{Authentication Success?}
    E -->|Yes| F[Return UserDTO with LDAP data]
    E -->|No| G[Throw AuthenticationException]
```

---

## AVA + SWF-Auth Login Sequence

```mermaid
sequenceDiagram
    participant Client
    participant AVA
    participant SWFAuth as SWF-Auth

    Client->>AVA: POST /auth/login (email, password) + X-Session-Id
    Note over AVA: AuthProxyController forwards to SWF-Auth
    AVA->>SWFAuth: POST /auth/authenticate (credentials + X-Session-Id)
    SWFAuth-->>AVA: 200 {accessToken, email, roles} + Set-Cookie (refresh token)
    AVA-->>Client: 200 {accessToken, roles} + Set-Cookie

    Note over Client,AVA: Client stores accessToken and uses it for all AVA requests

    Client->>AVA: GET /api/resource (Authorization: Bearer accessToken)
    AVA->>AVA: JwtAuthenticationFilter intercepts
    AVA->>SWFAuth: GET /auth/users/me (Authorization: Bearer accessToken)
    SWFAuth-->>AVA: 200 {id, email, roles, isEnabled}
    AVA->>AVA: Set SecurityContext with user principal + roles
    AVA-->>Client: 200 Protected Resource

    alt Token invalid or expired
        AVA-->>Client: 401 Unauthorized
    end
```

---

## JWT Validation via Feign (AVA token guard)

```mermaid
sequenceDiagram
    participant Client
    participant AVA
    participant AuthService as SWF-Auth
    participant DB

    Client->>AVA: Request with JWT (Authorization: Bearer token)
    AVA->>AVA: JwtAuthenticationFilter — extract token from header
    AVA->>AuthService: GET /auth/users/me (via Feign — validate token)
    AuthService->>DB: Check token validity + load user
    DB-->>AuthService: Token data + user info
    AuthService-->>AVA: Validation result + user info (email, roles)
    AVA->>AVA: Set SecurityContext (UsernamePasswordAuthenticationToken)
    AVA-->>Client: Protected resource
```

---

## Microservice Integration Pattern (AVA side)

```mermaid
flowchart TD
    CA["Client App"] --> GW["API Gateway"]
    GW --> AVAM["AVA Microservice"]
    AVAM --> JVF["JWT Validation Filter"]
    JVF --> TV{Token Valid?}
    TV -->|Yes| PR["Process Request\n(Controller ? Service)"]
    TV -->|No| R401["Return 401 Unauthorized"]
    PR --> FC["AuthFeignClient"]
    FC --> SWFA["SWF-Auth Microservice"]
    SWFA --> DBB[("Database")]
```

---

## Full SWF-Auth Authentication Sequence (internal detail)

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant AuthStrategy
    participant UserService
    participant JwtService
    participant DB
    participant LDAP
    participant SpringSecurity

    Client->>AuthController: POST /auth/authenticate
    AuthController->>AuthService: authenticate(request)
    AuthService->>AuthStrategy: authenticate(request)
    AuthStrategy->>UserService: getUserDtoByEmail(email)
    UserService->>DB: find user
    DB-->>UserService: user data
    UserService-->>AuthStrategy: userDTO
    AuthStrategy->>AuthStrategy: authenticateUser(user, password)

    alt LDAP enabled
        AuthStrategy->>LDAP: authenticate
        LDAP-->>AuthStrategy: success/failure
    else Local auth
        AuthStrategy->>SpringSecurity: authenticate
        SpringSecurity-->>AuthStrategy: verify password / result
    end

    AuthStrategy-->>AuthService: authenticated user
    AuthService->>JwtService: generate tokens
    JwtService-->>AuthService: tokens
    AuthService-->>AuthController: response
    AuthController-->>Client: access_token + refresh_cookie
```

---

## Sample cURL Calls

### Register

```bash
curl -X POST "http://localhost:8081/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "sessionId": "session-123",
    "roles": []
  }'
```

### Authenticate via SWF-Auth (direct)

```bash
curl -v -X POST "http://localhost:8081/auth/authenticate" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: session-123" \
  -d '{"email":"john.doe@example.com","password":"password123"}'
```

### Authenticate via AVA proxy (recommended)

```bash
curl -X POST "http://localhost:8080/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: session-123" \
  -d '{"email":"john.doe@example.com","password":"password123"}'
```

### Call a protected AVA endpoint with the token

```bash
curl -X GET "http://localhost:8080/api/dossiers" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Refresh token

```bash
curl -X POST "http://localhost:8080/auth/refresh" \
  -H "X-Session-Id: session-123" \
  -H "Cookie: <HASHED_SESSION_ID>=<REFRESH_TOKEN>"
```

---

## Implemented Files (AVA1)

| File | Purpose |
|------|---------|
| `security/client/AuthFeignClient.java` | Feign interface — calls SWF-Auth for validation, login, register, refresh |
| `security/filter/JwtAuthenticationFilter.java` | `OncePerRequestFilter` — validates Bearer token via Feign, sets SecurityContext |
| `security/config/SecurityConfig.java` | Spring Security config — stateless, public paths, adds JWT filter |
| `security/controller/AuthProxyController.java` | Thin proxy — `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh` |
| `security/dto/AuthRequest.java` | Login request DTO (email, password) |
| `security/dto/AuthResponse.java` | Auth response DTO (email, accessToken, roles) |
| `security/dto/RegisterRequest.java` | Registration request DTO |
| `security/dto/UserValidationResponse.java` | User info returned by SWF-Auth `/auth/users/me` |
| `security/exception/FeignAuthErrorDecoder.java` | Maps Feign 401/403 from SWF-Auth to proper Spring `ResponseStatusException` |

---

## Configuration (application.properties)

```properties
# SWF-Auth microservice base URL
api.swf-auth.base-url=http://localhost:8081
auth.base-url=${api.swf-auth.base-url}
```

---

## Security Checklist

- [x] AVA does NOT validate JWT secrets locally — delegates to SWF-Auth (single source of truth)
- [x] Stateless session (no server-side HTTP session)
- [x] CSRF disabled (REST API)
- [x] Refresh tokens are HTTP-only cookies managed exclusively by SWF-Auth
- [x] Token validation failure logs the error but does NOT expose token details
- [ ] Switch to HTTPS between services in production
- [ ] Use a service registry (Eureka) so `auth.base-url` resolves dynamically
- [ ] Rate-limit `/auth/login` and `/auth/register` proxy endpoints

---

## Copilot Prompt — Regenerate AVA Integration Code

Paste the following prompt into GitHub Copilot Chat to regenerate the integration code from scratch:

> You are an experienced Spring Boot 3.2 developer. The **AVA** microservice (package `IbansysPoc.AVA`, port 8080) must delegate all authentication to an existing **SWF-Auth** microservice at `${auth.base-url}` (default `http://localhost:8081`).
>
> **Do NOT recreate auth logic inside AVA.** Implement the following:
>
> 1. **`AuthFeignClient`** (`security/client/`) — Feign interface that calls:
>    - `GET /auth/users/me` with `Authorization: Bearer <token>` ? returns `UserValidationResponse`
>    - `POST /auth/authenticate` with `X-Session-Id` header ? returns `AuthResponse`
>    - `POST /auth/register` ? returns `AuthResponse`
>    - `GET /auth/refresh-token` with `X-Session-Id` + `Cookie` ? returns `AuthResponse`
>
> 2. **`JwtAuthenticationFilter`** (`security/filter/`) — `OncePerRequestFilter` that:
>    - Extracts `Authorization: Bearer <token>` header
>    - Calls `AuthFeignClient.validateToken(bearerToken)` to validate via SWF-Auth
>    - On success: creates `UsernamePasswordAuthenticationToken` with `ROLE_<role>` authorities and sets `SecurityContextHolder`
>    - On failure: logs warning, does not set authentication (SecurityConfig returns 401)
>
> 3. **`SecurityConfig`** (`security/config/`) — Spring Security config:
>    - Stateless (`STATELESS` session policy), CSRF disabled
>    - Public: `/auth/login`, `/auth/register`, `/auth/refresh`, `/actuator/health`, `/swagger-ui/**`, `/v3/api-docs/**`
>    - All other routes: `.authenticated()`
>    - Adds `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`
>    - Enables `@PreAuthorize` with `@EnableMethodSecurity`
>
> 4. **`AuthProxyController`** (`security/controller/`) — thin proxy:
>    - `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
>
> 5. **`FeignAuthErrorDecoder`** — maps SWF-Auth 401 ? `UNAUTHORIZED`, 403 ? `FORBIDDEN`
>
> 6. **DTOs** with Lombok `@Data`: `AuthRequest`, `AuthResponse`, `RegisterRequest`, `UserValidationResponse`
>
> **pom.xml**: add `spring-boot-starter-security` + `spring-cloud-starter-openfeign` with Spring Cloud BOM `2023.0.1` in `<dependencyManagement>`
>
> **`AvaApplication.java`**: add `@EnableFeignClients(basePackages = "IbansysPoc.AVA.security.client")`
>
> **`application.properties`**: add `auth.base-url=${api.swf-auth.base-url}`

---

## Next Steps

1. **Build** — `cd AVA1 && mvn clean install` to verify compilation.
2. **Start both services** — SWF-Auth on `:8081`, AVA on `:8080`.
3. **Register**: `POST http://localhost:8080/auth/register`
4. **Login**: `POST http://localhost:8080/auth/login` ? copy `accessToken`
5. **Call protected AVA endpoint**: `GET http://localhost:8080/api/...` with `Authorization: Bearer <token>`
6. **Add `@PreAuthorize`** on AVA service methods that require specific roles:
   ```java
   @PreAuthorize("hasRole('ADMIN_METIER')")
   public DossierDTO createDossier(...) { ... }
   ```
