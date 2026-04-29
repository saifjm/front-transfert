# Intégration Auth — Flow de login (AVA)

Résumé concis du flux d'authentification côté frontend et des données stockées après login.

## 1. Endpoints principaux
- POST `/auth/login` — authentifier l'utilisateur.
- GET `/auth/refresh-token` — rafraîchir l'access token (cookie refresh envoyé automatiquement).
- GET `/auth/logout` — terminer la session.

> En dev local avec Vite, ces chemins sont utilisés en relative (`/auth/...`) et sont proxied vers le backend (`http://localhost:8080`).

## 2. En-têtes envoyés par le frontend
- `Content-Type: application/json` (pour POST/PUT contenant JSON)
- `X-Session-Id: <uuid>` — généré côté client (persisté en `sessionStorage`) et réutilisé pour toute la session
- `Authorization: Bearer <accessToken>` — ajouté automatiquement pour les requêtes protégées si `accessToken` présent
- Cookies: le refresh token est transmis via cookie (backend `Set-Cookie`) — les requêtes utilisent `credentials: 'include'` pour l'envoyer/recevoir

## 3. Payload (login)
Request body (JSON):

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## 4. Réponse réussie (exposée au frontend)
Body JSON attendu:

```json
{
  "email": "user@example.com",
  "accessToken": "eyJhbGciOi...",
  "roles": ["USER"]
}
```

Le backend en plus renvoie le refresh token en cookie HTTP-only (header `Set-Cookie: <name>=<refresh>; HttpOnly; Secure; SameSite=None`). Ce cookie n'est pas lisible par JS.

## 5. Stockage côté client (implémentation actuelle)
- `sessionStorage['accessToken']` ← access token (JWT)
- `sessionStorage['X-Session-Id']` ← session id (UUID)
- `refresh token` ← stocké en cookie `HttpOnly` (backend), non accessible par JS

Remarque : l'application actuelle utilise `sessionStorage` (survit aux navigations dans l'onglet mais pas à la fermeture d'onglet). C'est un bon compromis vs `localStorage` pour réduire la surface XSS.

## 6. Flow étape par étape
1. Générer/assurer `X-Session-Id` côté client (`ensureSessionId()`), stocker en `sessionStorage`.
2. POST `/auth/login` avec `X-Session-Id`, body JSON et `credentials: 'include'`.
3. Backend répond 200 + JSON `{ accessToken, ... }` et set-cookie refresh token.
4. Frontend stocke `accessToken` en `sessionStorage`.
5. Pour appels protégés, wrapper `authenticatedFetch()` ajoute `Authorization: Bearer <accessToken>` et `X-Session-Id` et utilise `credentials: 'include'`.
6. Si une requête retourne `401` et qu'un `accessToken` était présent, `authenticatedFetch()` appelle `/auth/refresh-token` (GET) avec `X-Session-Id` et cookie refresh ; si nouveau `accessToken` reçu, il réessaye la requête.
7. Logout : appeler `/auth/logout` (GET) avec `X-Session-Id` + `credentials: 'include'`, puis nettoyer `sessionStorage`.

## 7. Erreurs communes & diagnostics rapides
- 401 Unauthorized: jeton invalide/expiré — vérifier `sessionStorage['accessToken']` et logique de refresh.
- 403 Forbidden: rôles manquants ou autorisations non satisfaites — vérifier le payload `roles` renvoyé au login et la logique serveur des ACL.
- 500 Internal Server Error (login): regarder logs backend — payload invalide ou erreur serveur.
- CORS / preflight: en dev, utiliser proxy Vite (`/auth` proxied) ou config CORS côté backend (`Access-Control-Allow-Origin` + `credentials`).

Debug checklist:
- Ouvrir Network tab → inspecter headers envoyés (`X-Session-Id`, `Authorization`) et body/response.
- Vérifier `sessionStorage.getItem('accessToken')` et `sessionStorage.getItem('X-Session-Id')` dans console.
- Vérifier que `credentials: 'include'` est présent pour endpoints auth.
- Vérifier logs backend pour 500/403.

## 8. Notes sécurité
- En production, toujours HTTPS.
- Ne jamais stocker le refresh token accessible par JS.
- Protéger contre XSS (CSP, sanitisation), limiter usage de `localStorage` pour tokens.

---
Fichier généré automatiquement depuis le code du frontend (utils/api.ts et LoginForm).