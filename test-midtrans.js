/** @format */

require("dotenv").config();
const midtransClient = require("midtrans-client");

console.log("Server Key:", process.env.MIDTRANS_SERVER_KEY);
console.log("Client Key:", process.env.MIDTRANS_CLIENT_KEY);

const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function test() {
  try {
    const parameter = {
      payment_type: "qris",
      transaction_details: {
        order_id: `TEST-${Date.now()}`,
        gross_amount: 10000,
      },
      qris: {
        acquirer: "gopay",
      },
    };

    const response = await coreApi.charge(parameter);
    console.log("✅ Berhasil!", response);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

test();
