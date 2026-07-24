const rs = require('jsrsasign');
const fs = require('fs');

// Generate RSA 2048 bit key menggunakan jsrsasign (sama seperti contoh BRI)
const kp = rs.KEYUTIL.generateKeypair('RSA', 2048);

const privatePem = rs.KEYUTIL.getPEM(kp.prvKeyObj, 'PKCS8PRV');
const publicPem = rs.KEYUTIL.getPEM(kp.pubKeyObj);

fs.writeFileSync('private_key.pem', privatePem);
fs.writeFileSync('public_key.pem', publicPem);

console.log('✅ Key baru berhasil di-generate!\n');
console.log('=== PUBLIC KEY (upload ke BRI Portal) ===');
console.log(publicPem);
console.log('\n=== PRIVATE KEY (jangan dibagikan) ===');
console.log(privatePem.substring(0, 50) + '...');