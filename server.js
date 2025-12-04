// FILE: server.js
// Render-ready Epic JWT signer with JWKS.
// Requires env vars: PRIVATE_KEY (RSA PEM), optional KID, CLIENT_ID, AUDIENCE. PORT is provided by Render.

import express from "express";
import { createPrivateKey, createPublicKey } from "crypto";
import { exportJWK, SignJWT, calculateJwkThumbprint } from "jose";

const app = express();
app.use(express.json({ limit: "64kb" }));

// --- Environment ---
const PRIVATE_KEY_PEM = process.env.PRIVATE_KEY;   // REQUIRED: full PEM with BEGIN/END lines
const KID = process.env.KID || "";                 // optional
const DEFAULT_CLIENT_ID = process.env.CLIENT_ID || ""; // optional default for iss/sub
const DEFAULT_AUDIENCE = process.env.AUDIENCE || "";   // optional default for aud
const PORT = process.env.PORT || 10000;

// --- Key bootstrap ---
if (!PRIVATE_KEY_PEM || !PRIVATE_KEY_PEM.includes("BEGIN")) {
  throw new Error("PRIVATE_KEY must contain a valid RSA PRIVATE KEY PEM (with BEGIN/END lines).");
}

let privateKey;
try {
  privateKey = createPrivateKey(PRIVATE_KEY_PEM);
} catch (e) {
  throw new Error(`Invalid PRIVATE_KEY PEM: ${e?.message || e}`);
}

const publicKey = createPublicKey(privateKey);
const publicJwk = await exportJWK(publicKey);
// Normalize for Epic
publicJwk.kty = "RSA";
publicJwk.use = "sig";
publicJwk.alg = "RS256";
publicJwk.kid = KID.trim() || await calculateJwkThumbprint(publicJwk, "SHA-256");

// --- Helpers ---
const jwksBody = { keys: [publicJwk] };
const bad = (res, msg) => res.status(400).json({ error: msg }); // why: clear misconfig

// --- Routes ---
// JWKS (GET + HEAD), support trailing slash
const sendJwks = (_req, res) => res.type("application/json").status(200).send(jwksBody);
app.get("/jwks", sendJwks);
app.get("/jwks/", sendJwks);
app.head("/jwks", (_req, res) => res.status(200).end());
app.head("/jwks/", (_req, res) => res.status(200).end());

// Health
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Sign client_assertion for Epic OAuth
app.post("/sign-jwt", async (req, res) => {
  const iss = req.body?.iss ?? DEFAULT_CLIENT_ID;
  const sub = req.body?.sub ?? DEFAULT_CLIENT_ID;
  const aud = req.body?.aud ?? DEFAULT_AUDIENCE;
  const expSeconds = Number(req.body?.expSeconds ?? 240);

  if (!iss || !sub || !aud) return bad(res, "iss, sub, aud required (or set CLIENT_ID/AUDIENCE envs).");
  if (!Number.isFinite(expSeconds) || expSeconds <= 0 || expSeconds > 600)
    return bad(res, "expSeconds must be 1..600.");

  try {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
      .setIssuer(iss)
      .setSubject(sub)
      .setAudience(aud)
      .setIssuedAt(now)
      .setExpirationTime(now + expSeconds)
      .sign(privateKey);

    res.status(200).json({ jwt });
  } catch (e) {
    res.status(500).json({ error: `signing_failed: ${e?.message || e}` });
  }
});

// Minimal request log (helps confirm Epic hits /jwks)
app.use((req, _res, next) => {
  if (req.path !== "/health") console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`JWT signer listening on :${PORT}`);
  console.log(`JWKS ready at /jwks (kid=${publicJwk.kid})`);
});
