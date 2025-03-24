const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Store transaction statuses (use a database for production)
let transactionStatus = {};

// Generate OAuth Token
const getOAuthToken = async () => {
  const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString("base64");
  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    
    if (response.data.access_token) {
      console.log("✅ Token retrieved:", response.data.access_token);
      return response.data.access_token;
    } else {
      throw new Error("Token not received");
    }
  } catch (error) {
    console.error("OAuth Error:", error.response?.data || error.message);
    return null;
  }
};

// Lipa Na M-Pesa Online Payment (STK Push)
app.post("/stk-push", async (req, res) => {
  const token = await getOAuthToken();
  if (!token) return res.status(500).json({ message: "Failed to obtain OAuth token" });

  const timestamp = new Date().toISOString().replace(/[-:.T]/g, "").slice(0, 14);
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");

  const { phone, amount } = req.body;
  
  const data = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${process.env.CALLBACK_URL}/callback`,
    AccountReference: "Test",
    TransactionDesc: "Payment"
  };

  try {
    const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.MerchantRequestID) {
      // Initialize transaction status as "Pending"
      transactionStatus[response.data.MerchantRequestID] = "Pending";
    }

    res.json(response.data);
  } catch (error) {
    console.error("❌ STK Push Error:", error.response?.data || error.message);
    res.status(500).json(error.response?.data || { message: "Unknown STK push error" });
  }
});

// Handle M-Pesa Callback
app.post("/callback", (req, res) => {
    console.log("🛎️ Callback Received:", JSON.stringify(req.body, null, 2));
    
    const callbackData = req.body.Body.stkCallback;

    if (!callbackData) {
        console.error("⚠️ Invalid callback received.");
        return res.status(400).json({ message: "Invalid callback data" });
    }

    const { MerchantRequestID, ResultCode } = callbackData;

    if (ResultCode === 0) {
        // Successful transaction
        transactionStatus[MerchantRequestID] = "Success";
        console.log(`✅ Payment Successful for MerchantRequestID: ${MerchantRequestID}`);
    } else {
        // Failed transaction
        transactionStatus[MerchantRequestID] = "Failed";
        console.log(`❌ Payment Failed for MerchantRequestID: ${MerchantRequestID}`);
    }

    res.status(200).json({ message: "Callback processed successfully" });
});

// Endpoint to Check Transaction Status
app.get("/transaction-status/:merchantRequestID", (req, res) => {
    const status = transactionStatus[req.params.merchantRequestID] || "Pending";
    res.json({ status });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
