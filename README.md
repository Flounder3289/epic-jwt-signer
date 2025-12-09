# Epic JWT Signer (Render-ready)

A tiny service that signs **private_key_jwt** assertions for Epic OAuth2 (SMART v2, FHIR R4) and exposes a **JWKS** endpoint for key distribution.

- Runtime: Node.js (ESM)
- Crypto: `jose`
- Host: Render.com (or any Node host)

---

## Requirements

- **RSA private key (PKCS#8 PEM)** for RS256
- Epic App (Non-Production) with **private_key_jwt** auth
- Node 18+ (local) or Render Web Service

---

## Environment Variables (Render → *Environment*)

| Name             | Required | Description |
|------------------|----------|-------------|
| `PRIVATE_KEY`    | ✅       | RSA **PKCS#8** private key PEM (include `-----BEGIN PRIVATE KEY-----`/`END`) |
| `KID`            | ✅/auto  | Key ID shown in JWT header & JWKS. If not set, service derives a thumbprint. |
| `CLIENT_ID`      | ❌       | Optional default `iss`/`sub` for `/sign-jwt` requests |
| `AUDIENCE`       | ❌       | Optional default `aud` (Epic token URL) |
| `PORT`           | ❌       | Provided by Render; defaults to `3000` locally |

> Tip: In Epic App Registration, set **Non-Production JWK Set URL** to  
> `https://<your-service>.onrender.com/jwks`

---

## Endpoints

### `GET /jwks`
Returns your public JWK Set:
```json
{ "keys": [ { "kty": "RSA", "n": "...", "e": "AQAB", "use": "sig", "alg": "RS256", "kid": "narwol-key-1" } ] }
