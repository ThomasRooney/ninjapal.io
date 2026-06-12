import { SignJWT, jwtVerify } from 'file:///Users/thomasrooney/Code/ninjapal.io/node_modules/jose/dist/webapi/index.js';

function getSecret() {
  const secret = process.env.ZERO_AUTH_SECRET;
  if (!secret) {
    throw new Error("ZERO_AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}
async function signZeroToken(user) {
  return await new SignJWT({ email: user.email, name: user.name }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("24h").sign(getSecret());
}
async function verifyZeroToken(token) {
  var _a;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"]
    });
    return (_a = payload.sub) != null ? _a : null;
  } catch {
    return null;
  }
}

export { signZeroToken, verifyZeroToken };
//# sourceMappingURL=zero-jwt-Cxo4ZZOj.mjs.map
