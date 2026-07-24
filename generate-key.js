const forge = require('node-forge');
const fs = require('fs');

console.log('⏳ Generating RSA key pair...');
const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);

fs.writeFileSync('private_key.pem', privateKeyPem);
fs.writeFileSync('public_key.pem', publicKeyPem);

console.log('✅ Key berhasil di-generate!');
console.log('\n=== PUBLIC KEY (copy ke BRI Portal) ===');
console.log(publicKeyPem);