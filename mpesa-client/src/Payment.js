import { useState } from "react";
import axios from "axios";

const Payment = () => {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [merchantRequestID, setMerchantRequestID] = useState("");
  const [status, setStatus] = useState("");

  const handlePayment = async () => {
    try {
      const response = await axios.post("http://localhost:5000/stk-push", {
        phone: phone,
        amount: amount,
      });

      setMerchantRequestID(response.data.MerchantRequestID);
      alert("Request sent. Please enter M-Pesa PIN.");

      // Poll for status
      checkTransactionStatus(response.data.MerchantRequestID);
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Payment failed");
    }
  };

  const checkTransactionStatus = async (merchantRequestID) => {
    let interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:5000/transaction-status/${merchantRequestID}`);
        setStatus(res.data.status);

        if (res.data.status === "Success") {
          clearInterval(interval);
          alert("Payment Successful!");
        } else if (res.data.status === "Failed") {
          clearInterval(interval);
          alert("Payment Failed!");
        }
      } catch (error) {
        console.error("Status Check Error:", error);
      }
    }, 5000);
  };

  return (
    <div className="flex justify-center items-center h-screen bg-blue-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold text-blue-600 mb-4 text-center">M-Pesa Payment</h2>
        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-2 border border-blue-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-blue-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handlePayment}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Pay
        </button>
        {status && (
          <p className="text-center mt-4 text-blue-700 font-medium">Transaction Status: {status}</p>
        )}
      </div>
    </div>
  );
};

export default Payment;
