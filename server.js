const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n"); // Render secrets are single-line strings

app.get("/sign-jwt", (req, res) => {
  const payload = {
    iss: process.env.CLIENT_ID,
    sub: process.env.CLIENT_ID,
    aud: "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: "RS384",
    header: {
      kid: process.env.KID
    },
  });

  res.json({ signed_jwt: token });
});

app.listen(PORT, () => {
  console.log(`✅ JWT signer running at http://localhost:${PORT}/sign-jwt`);
});
