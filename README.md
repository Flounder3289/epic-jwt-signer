# JWT Signer for Epic OAuth

This service signs JWT tokens for Epic OAuth2 using RS384. Deploy on Render.com and use in n8n.

## Environment Variables (set these in Render):
- `PRIVATE_KEY`: Your RSA private key (single-line, escape newlines with \n)
- `CLIENT_ID`: Your Epic App's Client ID
- `KID`: The key ID you registered with Epic

## Endpoint:
GET /sign-jwt → `{ "signed_jwt": "..." }`
