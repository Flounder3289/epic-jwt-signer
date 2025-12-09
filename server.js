// FILE: server.js
// Render-ready Epic JWT signer with JWKS (adds jti + nbf(now), clamps exp)

import express from "express";
import { createPrivateKey, createPublicKey, randomUUID } from "crypto";
import { exportJWK, SignJWT, calculateJwkThumbprint } from "jose";

const app = express();
app.use(express.json({ limit: "64kb" }));

// --- Environment ---
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY;        // REQUIRED: PKCS#8 PEM including BEGIN/END lines
const KID_ENV = process.env.KID || "";                  // optional override
const DEFAULT_CLIENT_ID = process.env.CLIENT_ID || "";  // optional default for iss/sub
const DEFAULT_AUDIENCE = process.env.AUDIENCE || "";    // optional default for aud
const PORT = process.env.PORT || 3000;                  // Render sets PORT; default 3000

// --- Key bootstrap ---
if (!PRIVATE_KEY_PEM || !PRIVATE_KEY_PEM.includes("BEGIN")) {
  throw new Error("PRIVATE_KEY must contain a valid PKCS#8 PRIVATE KEY PEM (with BEGIN/END lines).");
}
let privateKey;
try {
  privateKey = createPrivateKey(PRIVATE_KEY_PEM);
} catch (e) {
  throw new Error(`Invalid PRIVATE_KEY PEM: ${e?.message || e}`);
}
const publicKey = createPublicKey(privateKey);
const publicJwk = await exportJWK(publicKey);
publicJwk.kty = "RSA";
publicJwk.use = "sig";
publicJwk.alg = "RS256";
publicJwk.kid = KID_ENV.trim() || (await calculateJwkThumbprint(publicJwk, "SHA-256"));

// --- Utils ---
const jwksBody = { keys: [publicJwk] };
const bad = (res, msg) => res.status(400).json({ error: "bad_request", error_description: msg });
const clampExpSeconds = (v) => Math.min(300, Math.max(60, Number.isFinite(+v) ? Math.floor(+v) : 180));

// --- Routes ---
app.get("/jwks", (_req, res) => res.status(200).json(jwksBody));
app.get("/jwks/", (_req, res) => res.status(200).json(jwksBody));
app.head("/jwks", (_req, res) => res.status(200).end());
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.post("/sign-jwt", async (req, res) => {
  const iss = req.body?.iss ?? DEFAULT_CLIENT_ID;
  const sub = req.body?.sub ?? DEFAULT_CLIENT_ID;
  const aud = req.body?.aud ?? DEFAULT_AUDIENCE;
  const expSeconds = clampExpSeconds(req.body?.expSeconds);

  if (!iss || !sub || !aud) return bad(res, "iss, sub, aud required (or set CLIENT_ID/AUDIENCE envs).");

  try {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
      .setIssuer(String(iss))
      .setSubject(String(sub))
      .setAudience(String(aud))
      .setJti(randomUUID())   // unique assertion id (Epic expects this)
      .setNotBefore(now)      // FIXED: use current time, not epoch 0
      .setIssuedAt(now)
      .setExpirationTime(now + expSeconds) // ≤ 300s
      .sign(privateKey);

    res.status(200).json({ jwt });
  } catch (e) {
    res.status(500).json({ error: `signing_failed: ${e?.message || e}` });
  }
});

// Minimal request log
app.use((req, _res, next) => {
  if (req.path !== "/health") console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.listen(PORT, () => {
  console.log(`JWT signer listening on :${PORT}`);
  console.log(`JWKS ready at /jwks (kid=${publicJwk.kid})`);
});
