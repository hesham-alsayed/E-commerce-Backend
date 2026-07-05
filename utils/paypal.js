import axios from "axios";

const PAYPAL_CLIENT_ID =
  "AXGeu-Ml8_mvP_J7WO0y5A8gqzNFvYc93PFvWqWiEt2ZuzJ2Ih0orRMG37IAe9z4hAwrbYksW36j0NAo";
const PAYPAL_CLIENT_SECRET =
  "EG0Z1fSDMkOwZbMPxI7UpaDSwuMgjdNEVul6YBEp9N-zNam5SfLNqFdNyP7EOS2c3IIeAEE-RiJK3cLO";

const BASE_URL = "https://api-m.sandbox.paypal.com";

// ======================================================
// GET ACCESS TOKEN
// ======================================================

export const getAccessToken = async () => {
  try {
    const res = await axios({
      url: `${BASE_URL}/v1/oauth2/token`,
      method: "POST",

      auth: {
        username: PAYPAL_CLIENT_ID,
        password: PAYPAL_CLIENT_SECRET,
      },

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      data: "grant_type=client_credentials",
    });

    return res.data.access_token;
  } catch (error) {
    console.log(
      "PAYPAL ACCESS TOKEN ERROR:",
      error.response?.data || error.message,
    );

    throw new AppError(
      error.response?.data?.error_description ||
        "Failed to authenticate with PayPal",
      error.response?.status || 500,
    );
  }
};

// ======================================================
// CREATE PAYPAL ORDER
// ======================================================

export const createPaypalOrder = async (amount, orderData) => {
  try {
    const accessToken = await getAccessToken();

    const payload = {
      intent: "CAPTURE",

      purchase_units: [
        {
          reference_id: orderData?._id?.toString() || "ORDER_REF",

          custom_id: orderData?.user?._id?.toString(),

          invoice_id: `${orderData?._id}-${Date.now()}`,

          amount: {
            currency_code: "USD",
            value: Number(amount).toFixed(2),
          },
        },
      ],

      application_context: {
        return_url: `${process.env.USER_FRONTEND_URL}/payment/success`,

        cancel_url: `${process.env.USER_FRONTEND_URL}/payment/cancel`,

        brand_name: "Mens Club",

        landing_page: "BILLING",

        user_action: "PAY_NOW",

        shipping_preference: "NO_SHIPPING",
      },
    };
    const response = await axios.post(
      `${BASE_URL}/v2/checkout/orders`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const approvalUrl = response.data.links.find(
      (link) => link.rel === "approve",
    )?.href;

    if (!approvalUrl) {
      throw new AppError("Approval URL not found", 400);
    }

    return {
      paypalOrderId: response.data.id,
      approvalUrl,
    };
  } catch (error) {
    throw new AppError(
      error.response?.data?.message ||
        error.response?.data?.details?.[0]?.description ||
        "Failed to create PayPal order",
      error.response?.status || 500,
    );
  }
};

// ======================================================
// CAPTURE PAYPAL ORDER
// ======================================================

export const capturePayPalOrder = async (paypalOrderId) => {
  try {
    if (!paypalOrderId) {
      throw new AppError("PayPal Order ID is required", 400);
    }

    const token = await getAccessToken();

    const res = await axios.post(
      `${BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return res.data;
  } catch (error) {
    console.log("CAPTURE PAYPAL ERROR:", error.response?.data || error.message);

    throw new AppError(
      error.response?.data?.message ||
        error.response?.data?.details?.[0]?.description ||
        "Failed to capture PayPal payment",
      error.response?.status || 500,
    );
  }
};
