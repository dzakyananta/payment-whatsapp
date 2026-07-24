const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

// ============================================================
// PENTING: BRI SNAP butuh timestamp UTC (bukan +07:00)
// ============================================================
function getTimestamp() {
  return new Date().toISOString().replace('Z', '+00:00');
}

function generateAsymmetricSignature(clientId, timestamp) {
  const privateKeyPem = fs.readFileSync('private_key.pem', 'utf8');
  const stringToSign = `${clientId}|${timestamp}`;
  const sign = crypto.createSign('SHA256');
  sign.update(stringToSign, 'utf8');
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

function generateSymmetricSignature(method, path, token, body, timestamp, clientSecret) {
  const minifiedBody = (body && Object.keys(body).length > 0)
    ? JSON.stringify(body)
    : '';

  const bodyHash = crypto
    .createHash('sha256')
    .update(minifiedBody, 'utf8')
    .digest('hex')
    .toLowerCase();

  const stringToSign = `${method}:${path}:${token}:${bodyHash}:${timestamp}`;
  console.log('🔐 StringToSign:', stringToSign.substring(0, 100) + '...');

  return crypto
    .createHmac('sha512', clientSecret)
    .update(stringToSign, 'utf8')
    .digest('base64');
}

async function getBRIToken() {
  const clientId = process.env.BRI_CLIENT_ID;
  const timestamp = getTimestamp();
  const signature = generateAsymmetricSignature(clientId, timestamp);

  console.log('⏰ Timestamp (UTC):', timestamp);

  const response = await axios.post(
    `${process.env.BRI_BASE_URL}/snap/v1.0/access-token/b2b`,
    { grantType: 'client_credentials' },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CLIENT-KEY': clientId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
      },
    }
  );

  const token = response.data.accessToken;
  console.log('✅ Token OK:', token.substring(0, 30) + '...');
  return { token, timestamp };
}

async function generateQRIS({ orderId, amount }) {
  const { token, timestamp } = await getBRIToken();

  const clientSecret = process.env.BRI_CLIENT_SECRET;
  const path = '/snap/v1.0/qr/qr-mpm-generate';

  const body = {
    partnerReferenceNo: orderId,
    amount: {
      value: `${parseInt(amount)}.00`,
      currency: 'IDR',
    },
    merchantId: process.env.BRI_MERCHANT_ID,
    terminalId: process.env.BRI_TERMINAL_ID,
  };

  const signature = generateSymmetricSignature(
    'POST',
    path,
    token,
    body,
    timestamp,
    clientSecret
  );

  console.log('📤 Body:', JSON.stringify(body));

  const response = await axios.post(
    `${process.env.BRI_BASE_URL}${path}`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': process.env.BRI_PARTNER_ID,
        'X-EXTERNAL-ID': orderId,
        'CHANNEL-ID': process.env.BRI_CHANNEL_ID,
      },
    }
  );

  console.log('✅ QRIS:', response.data);
  return response.data;
}

module.exports = { getBRIToken, generateQRIS };