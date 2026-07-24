/** @format */

const midtransClient = require("midtrans-client");

const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

async function generateQRIS({ orderId, amount, customerName }) {
  const parameter = {
    payment_type: "qris",
    transaction_details: {
      order_id: orderId,
      gross_amount: parseInt(amount),
    },
    customer_details: {
      first_name: customerName || "Customer",
    },
    qris: {
      acquirer: "gopay",
    },
  };

  const response = await coreApi.charge(parameter);
  console.log("✅ Midtrans Response:", JSON.stringify(response, null, 2));

  // Ambil URL QR code dari actions Midtrans
  const qrAction = response.actions?.find((a) => a.name === "generate-qr-code");
  const qrUrl = qrAction?.url;

  return {
    qrString: response.qr_string,
    qrUrl,
    transactionId: response.transaction_id,
    orderId: response.order_id,
    expiryTime: response.expiry_time,
  };
}

async function checkStatus(orderId) {
  const response = await coreApi.transaction.status(orderId);
  return response;
}

module.exports = { generateQRIS, checkStatus };
