# AVA ↔ SWF-Auth Integration — Status Report

> Generated: April 27, 2026  
> AVA version: `0.0.1-SNAPSHOT` · Spring Boot `3.2.5` · Port `8080`  
> SWF-Auth: `http://localhost:8081`

---

## 1. What is implemented

AVA does **not** contain any authentication logic. All identity concerns are fully delegated to the **SWF-Auth** microservice. The integration consists of 9 Java files added under `src/main/java/IbansysPoc/AVA/security/` plus configuration changes.

```
security/
├── client/
│   └── AuthFeignClient.java          ← calls SWF-Auth over HTTP (Feign)
├── config/
│   └── SecurityConfig.java           ← Spring Security rules
├── controller/
│   └── AuthProxyController.java      ← public proxy endpoints
├── dto/
│   ├── AuthRequest.java
│   ├── AuthResponse.java
│   ├── RegisterRequest.java
│   └── UserValidationResponse.java
├── exception/
│   └── FeignAuthErrorDecoder.java    ← maps SWF-Auth 4xx → proper HTTP errors
└── filter/
    └── JwtAuthenticationFilter.java  ← guards every protected request
```

---

## 2. How each piece works

### 2.1 `AuthFeignClient` — the bridge to SWF-Auth

Declared with `@FeignClient(name = "swf-auth", url = "${auth.base-url:http://localhost:8081}")`.

| Method | HTTP | SWF-Auth endpoint | Used by |
|--------|------|-------------------|---------|
| `validateToken(bearerToken)` | `GET` | `/auth/users/me` | `JwtAuthenticationFilter` on every request |
| `authenticate(sessionId, body)` | `POST` | `/auth/authenticate` | `AuthProxyController.login` |
| `register(body)` | `POST` | `/auth/register` | `AuthProxyController.register` |
| `refreshToken(sessionId, cookie)` | `GET` | `/auth/refresh-token` | `AuthProxyController.refresh` |

### 2.2 `JwtAuthenticationFilter` — token guard

Runs **before** every request (`OncePerRequestFilter`, inserted before `UsernamePasswordAuthenticationFilter`).

```
Incoming request
    │
    ├── No "Authorization: Bearer ..." header?
    │       └── pass through (public endpoints handled by SecurityConfig)
    │
    └── Has Bearer token
            │
            ▼
        authFeignClient.validateToken(bearerToken)
            │  ─── GET /auth/users/me ──► SWF-Auth ──► DB
            │  ◄── UserValidationResponse(id, email, roles, isEnabled)
            │
            ├── isEnabled = false  → SecurityContext stays empty → 401
            │
            └── isEnabled = true
                    │
                    ▼
                Build UsernamePasswordAuthenticationToken
                    - principal  : user email
                    - authorities: ["ROLE_ADMIN_METIER", "ROLE_USER", ...]
                    │
                    ▼
                SecurityContextHolder.setAuthentication(...)
                    │
                    ▼
                Request continues to controller
```

### 2.3 `SecurityConfig` — access rules

Session policy: **STATELESS** — no server-side HTTP session, no cookies on AVA side.  
CSRF: **disabled** (pure REST API).

**Public paths (no token required):**

| Path pattern | Purpose |
|---|---|
| `/auth/login` | Login proxy |
| `/auth/register` | Registration proxy |
| `/auth/refresh` | Token refresh proxy |
| `/actuator/health` | Health check |
| `/swagger-ui/**`, `/swagger-ui.html` | Swagger UI assets |
| `/v3/api-docs`, `/v3/api-docs/**` | Default springdoc paths (fallback) |
| `/api-docs`, `/api-docs/**` | Actual configured paths (`springdoc.api-docs.path=/api-docs`) |

**All other routes** → `.authenticated()` → token required → validated via Feign.

`@EnableMethodSecurity` is active, so service/controller methods can use `@PreAuthorize`.

### 2.4 `AuthProxyController` — public proxy endpoints

All three endpoints are **public** (listed in `PUBLIC_PATHS`). They forward client requests to SWF-Auth and relay the response:

```
POST /auth/register
    Body : { firstName, lastName, email, password, sessionId, roles[] }
    → SWF-Auth POST /auth/register
    ← 200 { email, accessToken, roles[] }

POST /auth/login
    Header: X-Session-Id: <session>
    Body  : { email, password }
    → SWF-Auth POST /auth/authenticate
    ← 200 { email, accessToken, roles[] }
       + X-Session-Id header forwarded to client

POST /auth/refresh
    Header: X-Session-Id: <session>
    Header: Cookie: <refresh-token-cookie>
    → SWF-Auth GET /auth/refresh-token
    ← 200 { email, accessToken, roles[] }
```

### 2.5 `FeignAuthErrorDecoder` — error translation

Prevents SWF-Auth HTTP errors from appearing as `500 Internal Server Error` in AVA:

| SWF-Auth response | AVA response to client |
|---|---|
| `401 Unauthorized` | `401 Unauthorized` — "Invalid or expired token" |
| `403 Forbidden` | `403 Forbidden` — "Access denied" |
| `404 Not Found` | `404 Not Found` — "Auth resource not found" |
| Other | Default Feign error (propagated as-is) |

---

## 3. DTOs exchanged

### `AuthRequest` (AVA → SWF-Auth)
```json
{ "email": "user@example.com", "password": "secret" }
```

### `AuthResponse` (SWF-Auth → AVA → Client)
```json
{ "email": "user@example.com", "accessToken": "<JWT>", "roles": ["ADMIN_METIER"] }
```

### `RegisterRequest` (AVA → SWF-Auth)
```json
{
  "firstName": "John", "lastName": "Doe",
  "email": "john@example.com", "password": "secret",
  "sessionId": "session-123", "roles": []
}
```

### `UserValidationResponse` (SWF-Auth → AVA filter, internal only)
```json
{ "id": 1, "firstName": "John", "lastName": "Doe",
  "email": "john@example.com", "isEnabled": true, "roles": ["ADMIN_METIER"] }
```

---

## 4. Configuration

### `application.properties` (relevant lines)
```properties
# SWF-Auth base URL
api.swf-auth.base-url=http://localhost:8081
# Feign client picks this up
auth.base-url=${api.swf-auth.base-url}

# Swagger paths (must match PUBLIC_PATHS in SecurityConfig)
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.swagger-ui.enabled=true
springdoc.api-docs.enabled=true
```

### `pom.xml` additions
```xml
<!-- Spring Cloud BOM (manages OpenFeign version) -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-dependencies</artifactId>
      <version>2023.0.1</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<!-- New runtime dependencies -->
<dependency>spring-boot-starter-security</dependency>
<dependency>spring-cloud-starter-openfeign</dependency>

<!-- commons-logging excluded from jasperreports to avoid spring-jcl conflict -->
<exclusion>commons-logging:commons-logging from net.sf.jasperreports:jasperreports</exclusion>

<!-- Test scope -->
<dependency>spring-security-test</dependency>
```

### `AvaApplication.java`
```java
@EnableFeignClients(basePackages = "IbansysPoc.AVA.security.client")
```

---

## 5. Complete request lifecycle

### Login flow
```
Client
  │  POST /auth/login  { email, password }  + X-Session-Id
  ▼
AVA : AuthProxyController.login()
  │  Feign: POST http://localhost:8081/auth/authenticate
  ▼
SWF-Auth : AuthController → AuthService → Strategy (Local or LDAP)
           generates JWT (15 min) + refresh token (1 hr, HttpOnly cookie)
  │  200 { accessToken, email, roles }
  ▼
AVA : relays response + X-Session-Id header
  │
  ▼
Client : stores accessToken for subsequent requests
```

### Protected resource flow
```
Client
  │  GET /api/dossiers  + Authorization: Bearer <accessToken>
  ▼
AVA : JwtAuthenticationFilter
  │  Feign: GET http://localhost:8081/auth/users/me
  │         Authorization: Bearer <accessToken>
  ▼
SWF-Auth : validates token against DB → returns UserValidationResponse
  ▼
AVA : builds SecurityContext  { principal: email, roles: [ROLE_ADMIN_METIER] }
  ▼
AVA : DossierController → DossierService (SecurityContext available)
  │  @PreAuthorize("hasRole('ADMIN_METIER')") enforced here
  ▼
Client : 200 response
```

### Token refresh flow
```
Client
  │  POST /auth/refresh  + X-Session-Id + Cookie: <refresh>
  ▼
AVA : AuthProxyController.refresh()
  │  Feign: GET http://localhost:8081/auth/refresh-token
  ▼
SWF-Auth : validates refresh token → issues new accessToken
  ▼
Client : new accessToken
```

---

## 6. Security checklist

| Item | Status |
|------|--------|
| AVA does NOT validate JWT locally | ✅ — fully delegated to SWF-Auth |
| No credentials stored in AVA | ✅ |
| Stateless session (no `HttpSession`) | ✅ |
| CSRF disabled (REST API) | ✅ |
| Refresh token is HttpOnly cookie (SWF-Auth side) | ✅ |
| Token failure does not expose token details in logs | ✅ — only logs warning |
| `@EnableMethodSecurity` active for `@PreAuthorize` | ✅ |
| `commons-logging` conflict resolved | ✅ — excluded from jasperreports |
| Swagger UI publicly accessible | ✅ — `/api-docs/**` permitted |
| HTTPS between services in production | ⚠️ pending — change `auth.base-url` to `https://` |
| Rate-limiting on `/auth/login` and `/auth/register` | ⚠️ pending |
| Service registry (Eureka) for dynamic URL resolution | ⚠️ optional — currently hardcoded |

---

## 7. How to use `@PreAuthorize` on AVA endpoints

Once the client has a valid token, roles are available in the `SecurityContext`. Annotate any AVA service or controller method:

```java
@PreAuthorize("hasRole('ADMIN_METIER')")
public DossierDTO createDossier(DossierRequest request) { ... }

@PreAuthorize("hasAnyRole('ADMIN_METIER', 'SUPERVISEUR')")
public List<DossierDTO> listDossiers() { ... }

@PreAuthorize("isAuthenticated()")
public DossierDTO getDossier(Long id) { ... }
```

---

## 8. Quick test (cURL)

```bash
# 1 — Register
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@smi.tn","password":"pass123","sessionId":"s1","roles":[]}'

# 2 — Login → copy accessToken from response
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: s1" \
  -d '{"email":"john@smi.tn","password":"pass123"}'

# 3 — Call protected endpoint
curl http://localhost:8080/api/dossiers \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# 4 — Refresh
curl -X POST http://localhost:8080/auth/refresh \
  -H "X-Session-Id: s1" \
  -H "Cookie: <refresh-cookie-from-login>"
```
