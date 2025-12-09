# Epic JWT Signer (Render-ready)

A tiny service that signs **private_key_jwt** assertions for Epic OAuth2 (SMART v2, FHIR R4) and exposes a **JWKS** endpoint for key distribution.

- Runtime: Node.js (ESM)
- Crypto: `jose`
- Host: Render.com (or any Node host)

---

## Requirements

- **RSA private key (PKCS#8 PEM)** for RS256  
- Epic App (Non-Production) using **private_key_jwt**  
- Node 18+ locally (Render provides Node in production)

---

## Environment Variables (Render → *Environment*)

| Name          | Required | Description |
|---------------|---------:|-------------|
| `PRIVATE_KEY` | ✅       | RSA **PKCS#8** private key PEM (include the `-----BEGIN/END PRIVATE KEY-----` lines) |
| `KID`         | ✅/auto  | Key ID used in JWT header & JWKS. If not set, the service derives a thumbprint. |
| `CLIENT_ID`   | ❌       | Optional default `iss`/`sub` for `/sign-jwt` |
| `AUDIENCE`    | ❌       | Optional default `aud` (Epic token URL) |
| `PORT`        | ❌       | Render sets this; defaults to `3000` locally |

> In Epic App Registration, set **Non-Production JWK Set URL** to:  
> `https://<your-service>.onrender.com/jwks`

---

## Endpoints

### `GET /jwks`
Returns your public JWK Set:
```json
{ "keys": [ { "kty": "RSA", "n": "...", "e": "AQAB", "use": "sig", "alg": "RS256", "kid": "narwol-key-1" } ] }
