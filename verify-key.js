/** @format */

require("dotenv").config();
const rs = require("jsrsasign");
const rsu = require("jsrsasign-util");

console.log("=== VERIFIKASI KEY PAIR ===\n");

const privatePem = rsu.readFile("private_key.pem");
const publicPem = rsu.readFile("public_key.pem");

console.log("Public Key (yang harus sama dengan di BRI Portal):");
console.log(publicPem);

const testStr = "test|2026-01-01T00:00:00.000+00:00";
const privateKey = rs.KEYUTIL.getKey(privatePem);
const sign = new rs.KJUR.crypto.Signature({ alg: "SHA256withRSA" });
sign.init(privateKey);
const hash = sign.signString(testStr);
const signature = rs.hextob64(hash);

const publicKey = rs.KEYUTIL.getKey(publicPem);
const verify = new rs.KJUR.crypto.Signature({ alg: "SHA256withRSA" });
verify.init(publicKey);
verify.updateString(testStr);
const isValid = verify.verify(rs.b64tohex(signature));

console.log(
  "\nKey pair valid?",
  isValid ? "✅ YA - COCOK!" : "❌ TIDAK COCOK!",
);
console.log("\n=== PUBLIC KEY UNTUK BRI PORTAL ===");
console.log(publicPem);
