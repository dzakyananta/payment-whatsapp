require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const rs = require('jsrsasign');
const rsu = require('jsrsasign-util');

const CLIENT_ID = process.env.BRI_CLIENT_ID;
const CLIENT_SECRET = process.env.BRI_CLIENT_SECRET;
const BASE_URL = process.env.BRI_BASE_URL;

function getTimestamp() {
  return new Date().toISOString().replace('Z', '+00:00');
}

function signAsymmetric(clientId, timestamp) {
  const pem = rsu.readFile('private_key.pem');
  const privateKey = rs.KEYUTIL.getKey(pem);
  const str = `${clientId}|${timestamp}`;
  const sign = new rs.KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
  sign.init(privateKey);
  const hash = sign.signString(str);
  return rs.hextob64(hash);
}

function signSymmetric(method, path, token, body, timestamp, secret) {
  const bodyStr = (body && Object.keys(body).length > 0) ? JSON.stringify(body) : '';
  const hash = crypto.createHash('sha256').update(bodyStr, 'utf8').digest('hex').toLowerCase();
  const str = `${method}:${path}:${token}:${hash}:${timestamp}`;
  console.log('\n📋 StringToSign:\n', str);
  return crypto.createHmac('sha512', secret).update(str, 'utf8').digest('base64');
}

async function run() {
  // ── STEP 1: GET TOKEN ──────────────────────────────────
  const ts1 = getTimestamp();
  const sig1 = signAsymmetric(CLIENT_ID, ts1);

  console.log('\n=== STEP 1: GET TOKEN ===');
  console.log('Client ID:', CLIENT_ID);
  console.log('Timestamp:', ts1);
  console.log('Signature:', sig1.substring(0, 50) + '...');

  let token;
  try {
    const r = await axios.post(
      `${BASE_URL}/snap/v1.0/access-token/b2b`,
      { grantType: 'client_credentials' },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CLIENT-KEY': CLIENT_ID,
          'X-TIMESTAMP': ts1,
          'X-SIGNATURE': sig1,
        }
      }
    );
    token = r.data.accessToken;
    console.log('✅ Token LENGTH:', token.length);
    console.log('✅ Token FULL:', token);
    console.log('Full response:', JSON.stringify(r.data, null, 2));
  } catch (e) {
    console.error('❌ Token Error:', e.response?.data || e.message);
    return;
  }

  // ── STEP 2: CEK APAKAH TOKEN BISA DIPAKAI ─────────────
  console.log('\n=== STEP 2: CEK TOKEN ===');
  console.log('Token length normal seharusnya > 100 karakter');
  console.log('Token length sekarang:', token.length);
  if (token.length < 50) {
    console.log('⚠️ WARNING: Token terlalu pendek! Kemungkinan Public Key belum sinkron di BRI.');
    console.log('⚠️ Solusi: Upload ulang Public Key ke BRI Portal dan tunggu 10-15 menit.');
  }

  // ── STEP 3: GENERATE QRIS v1.0 ────────────────────────
  console.log('\n=== STEP 3: GENERATE QRIS v1.0 ===');
  await testGenerateQRIS(token, '/snap/v1.0/qr/qr-mpm-generate');

  // ── STEP 4: GENERATE QRIS v1.1 ────────────────────────
  console.log('\n=== STEP 4: GENERATE QRIS v1.1 ===');
  await testGenerateQRIS(token, '/snap/v1.1/qr/qr-mpm-generate');
}

async function testGenerateQRIS(token, path) {
  const ts = getTimestamp();
  const orderId = `TEST${Date.now()}`;

  const body = {
    partnerReferenceNo: orderId,
    amount: { value: '10000.00', currency: 'IDR' },
    merchantId: process.env.BRI_MERCHANT_ID,
    terminalId: process.env.BRI_TERMINAL_ID,
  };

  const sig = signSymmetric('POST', path, token, body, ts, CLIENT_SECRET);

  console.log('Path:', path);
  console.log('Timestamp:', ts);
  console.log('Order ID:', orderId);
  console.log('Partner ID:', process.env.BRI_PARTNER_ID);
  console.log('Channel ID:', process.env.BRI_CHANNEL_ID);

  try {
    const r = await axios.post(
      `${process.env.BRI_BASE_URL}${path}`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-TIMESTAMP': ts,
          'X-SIGNATURE': sig,
          'X-PARTNER-ID': process.env.BRI_PARTNER_ID,
          'X-EXTERNAL-ID': orderId,
          'CHANNEL-ID': process.env.BRI_CHANNEL_ID,
        }
      }
    );
    console.log('\n🎉 QRIS BERHASIL!');
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) {
    console.error(`❌ Error ${path}:`, e.response?.data || e.message);
    console.error('❌ Status:', e.response?.status);
  }
}

run();