const express = require("express");
const firebase = require("firebase/app");
const app = express();
const fs = require("fs");
const axios = require("axios");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const bodyParser = require("body-parser");
require("./scheduler");
require("dotenv").config();
require("firebase/auth");
require("firebase/database");
require("firebase/firestore");
// const scheduler = require("./scheduler");
const path = require("path");
const frontURl = process.env.FRONT_URL || "http://localhost:3000";
const cors = require("cors");

app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", `${frontURl}`);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Middleware for parsing JSON and URL-encoded request bodies
// Middleware for parsing JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

let userEmail;
const port = process.env.PORT || 5000;

// Initialize Firebase
const firebaseConfig = {
  // Your Firebase config object
  apiKey: "AIzaSyDPze9CSiP1l4AfUNFHHJBiGTiPUs_i5qI",
  authDomain: "calaisite.firebaseapp.com",
  projectId: "calaisite",
  storageBucket: "calaisite.appspot.com",
  messagingSenderId: "137219193547",
  appId: "1:137219193547:web:6961a289776640ea47794e",
  measurementId: "G-CY4YK6JNEX",
  databaseURL: "https://calaisite-default-rtdb.firebaseio.com/",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

//PAYPAL CREDENTIALS
const clientId = process.env.PAYPAL_CLIENT_ID_SANDBOX;
const clientSecret = process.env.PAYPAL_SECRET_KEY_SANDBOX;
const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

// NODEMAILER CONFIGURATION
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// SEND WELCOME EMAIL
async function sendWelcomeEmail() {
  try {
    // Create email message
    const mailOptions = {
      from: `Kristin Parker <kristin.p@calai.org>`, // Sender address
      to: "amanshankarsingh05@gmail.com", // Receiver address
      subject: "Welcome to Our App!", // Subject line
      html: "<p>Welcome to Our App!</p>", // HTML body (can be more complex)
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);

    return { success: true, message: "Welcome email sent successfully." };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, message: "Failed to send welcome email." };
  }
}

//WELCOME MAIL API
app.post("/send_welcome_email", async (req, res) => {
  const { email } = req.body;
  try {
    // Simulate user registration, then send welcome email
    await sendWelcomeEmail(email);
    res
      .status(200)
      .json({ success: true, message: "User registered successfully." });
  } catch (error) {
    console.error("Error sending email to user:", error);
    // Return error response
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

//GENERATING PDF
async function generatePdf(orderData, program) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on("error", (err) => {
      reject(err);
    });

    // Extract relevant data
    const payerName = `${orderData.payer.name.given_name} ${orderData.payer.name.surname}`;
    const payerAddress = `1 Main St, San Jose, CA 95131, US`; // Full address from the shipping details
    const description = `${program}`; // Assuming a fixed description as not provided in dummy data
    const rate = orderData.purchase_units[0].payments.captures[0].amount.value;
    const amount = rate;
    const total = rate;
    const datePaid =
      orderData.purchase_units[0].payments.captures[0].create_time.split(
        "T"
      )[0];

    // Add content to the PDF
    // Add header
    doc
      .fontSize(20)
      .fillColor("black") // Set default text color to black
      .text("California Artificial Intelligence Institute", 140, 70) // Adjusted position of text
      .moveDown();

    // Add invoice details
    doc.font("Helvetica-Bold").fontSize(13).text("Invoice", 50, 120);
    doc
      .fillColor("black")
      .fontSize(10)
      .text(`Invoice number: ${orderData.id}`, 50, 140);
    doc
      .fillColor("black")
      .fontSize(10)
      .text(
        `Transaction ID: ${orderData.purchase_units[0].payments.captures[0].id}`,
        50,
        155
      );
    doc
      .fillColor("black")
      .fontSize(10)
      .text(`Payment Date: ${datePaid}`, 50, 170);
    doc.fillColor("black").fontSize(10).text(`Payment method: PayPal`, 50, 185);

    // Add billing details
    doc.font("Helvetica-Bold").fontSize(13).text("Bill to", 400, 120);
    doc.fillColor("black").fontSize(10).text(payerName, 400, 140);
    doc.fillColor("black").fontSize(10).text(payerAddress, 400, 155);

    // Add table header
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("NO", 50, 250, { width: 50 });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("DESCRIPTION", 100, 250, { width: 200 });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("RATE", 300, 250, { width: 100 });
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("AMOUNT", 400, 250, { width: 100 });

    // Add table row
    doc.fontSize(10).text("1", 50, 270, { width: 50 });
    doc.fontSize(10).text(description, 100, 270, { width: 200 });
    doc.fontSize(10).text(`$ ${rate}`, 300, 270, { width: 100 });
    doc.fontSize(10).text(`$ ${amount}`, 400, 270, { width: 100 });

    // Add total
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Total", 300, 300, { width: 100 });
    doc.fontSize(10).text(`$ ${total}`, 400, 300, { width: 100 });

    doc.end();
  });
}

//SEND PDF WITH EMAIL
async function sendEmailWithPdf(email, pdfBuffer) {
  const mailOptions = {
    from: "Kristin Parker <kristin.p@calai.org>",
    to: "amanshankarsingh05@gmail.com",
    subject: "Your Order Receipt",
    text: "Thank you for your purchase. Please find your order receipt attached.",
    attachments: [
      {
        filename: "receipt.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(info);
  console.log("Email sent: " + info.response);
}

//GENERATE TOKEN
const generateToken = async () => {
  try {
    const tokenResponse = await axios.post(
      "https://api.sandbox.paypal.com/v1/oauth2/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(tokenResponse.data.access_token);
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error.message);
  }
};

//CREATING ORDER
app.post("/create-order", async (req, res) => {
  const url = "https://api.sandbox.paypal.com/v2/checkout/orders";
  const { amount, program, email } = req.body;
  console.log(amount);
  const queryParams = new URLSearchParams({
    certification: program,
    email: email,
  });
  const data = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: amount,
        },
      },
    ],
    application_context: {
      brand_name: "CalAI",
      locale: "en-US",
      return_url: `${frontURl}/success?${queryParams}`, // This is the returnUrl
      cancel_url: `${frontURl}/cancel`, // Your cancel URL
    },
  };
  const accessToken = await generateToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await axios.post(url, data, { headers });
    console.log("Order Created:", response.data);
    const { links } = response.data;
    const paypalRedirect = links.find((link) => link.rel === "approve");
    console.log(paypalRedirect.href);
    if (paypalRedirect) {
      res.json({ orderId: response.id, approvalUrl: paypalRedirect.href });
    } else {
      res.status(500).json({ error: "Failed to get PayPal redirect URL" });
    }
  } catch (error) {
    console.log(error.message);
  }
});

//CAPTURING ORDER
app.post("/capture-order", async (req, res) => {
  try {
    const { orderId, program } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const url = `https://api.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`;
    const data = {
      note_to_payer: "Thank you for your purchase!",
    };

    const accessToken = await generateToken(); // Ensure this function generates the access token correctly
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    // Check if the order is already captured before capturing it
    const orderDetailsUrl = `https://api.sandbox.paypal.com/v2/checkout/orders/${orderId}`;
    const orderDetailsResponse = await axios.get(orderDetailsUrl, { headers });
    const orderDetails = orderDetailsResponse.data;
    console.log("order details:", orderDetails.status);
    if (orderDetails.status === "COMPLETED") {
      return res.status(400).json({ error: "Order already captured" });
    }

    const response = await axios.post(url, data, { headers });
    // console.log("Order Captured:", response.data);

    // Generate PDF
    const orderData = response.data;
    const pdfBuffer = await generatePdf(orderData, program);
    // Send PDF via email
    await sendEmailWithPdf(orderData.payer.email_address, pdfBuffer);
    // Send a success response
    return res.json({
      message: "Order captured successfully",
      transactionId: orderData.id,
      transactionData: orderData,
    });
  } catch (error) {
    console.error("Error capturing order:", error.message);

    // Ensure error.response and error.response.data are safely accessed
    const status = error.response ? error.response.status : 500;
    const errorDetails = error.response ? error.response.data : "Unknown error";

    res
      .status(status)
      .json({ error: "Failed to capture order", details: errorDetails });
  }
});

//CANCELING ORDER
app.post("/order-cancel", async (req, res) => {
  const { token } = req.body;
  const cancelData = {
    tokenId: token,
    timestamp: new Date(),
    message: "Order Canceled",
  };
  try {
    const cancelRef = db
      .collection("after_transaction")
      .doc(userEmail)
      .collection("canceledPayments")
      .doc(token);
    await cancelRef.set(cancelData);
    console.log("payment canceled");
  } catch (error) {
    console.log("Error in canceling order", error);
  }
});

//GETTING COURSE DETAILS
// app.post("/getCourseDetails", async (req, res) => {
//   const { certificationId } = req.body;

//   try {
//     // Retrieve course details from Firestore based on certification ID
//     const courseRef = db.collection("courses").doc(certificationId);
//     const doc = await courseRef.get();

//     if (!doc.exists) {
//       console.log("No such document!");
//       res.status(404).json({ error: "Course not found" });
//     } else {
//       console.log(doc.data());
//       const courseData = doc.data();
//       res.json({
//         certName: courseData.course_name,
//         courseFee: courseData.course_fees,
//         registrationFee: courseData.registration_fees,
//       });
//     }
//   } catch (error) {
//     console.error("Error getting document:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

//DISCOUNT VALIDATION
app.post("/validate-coupon", async (req, res) => {
  const { scholarshipCode } = req.body;

  try {
    const courseRef = db.collection("coupons").doc(scholarshipCode);
    const doc = await courseRef.get();
    if (!doc.exists) {
      console.log("Invalid Coupon!");
      res.status(404).json({ error: "Invalid Coupon" });
    } else {
      console.log(doc.data());
      const coupon = doc.data();
      res.json({
        discount: coupon.discount,
        expiresIn: coupon.expire,
      });
    }
  } catch (error) {
    console.log(error.messgae);
  }
});

// Function to get the current time in IST
function getCurrentIST() {
  const now = new Date();
  const istOffset = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // 5 hours and 30 minutes in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  const istTimeString = istTime.toISOString().slice(0, 19).replace("T", " ");
  return istTimeString;
}

//REGISTRATION ROUTE
app.post("/register", async (req, res) => {
  const {
    name,
    email,
    contact,
    country,
    courseFee,
    registrationFee,
    certification,
    couponCode,
  } = req.body;

  try {
    const userEmail = email;

    console.log("User email:", userEmail);

    // Create a reference to the Firestore collection for the user's data
    const userCollectionRef = db
      .collection("before_transaction")
      .doc(userEmail)
      .collection("registrationData");

    // Set data in the Firestore document
    await userCollectionRef.add({
      name: name,
      email: email,
      contact: contact,
      country: country,
      courseFee: courseFee,
      registrationFee: registrationFee,
      certification: certification,
      couponCode: couponCode,
      createdAt: getCurrentIST(), // Add timestamp
    });

    // Log a success message
    console.log("Registration successful for user:", userEmail);

    // Send a success response to the client
    res.status(200).send("Registration successful");
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Registration failed");
  }
});

//SERVER CHECK
app.get("/", async (req, res) => {
  res.send("Hello!! World i am done");
  sendWelcomeEmail();
});
// START SERVER
app.listen(port, () => {
  console.log(`Server is running on port:${port}`);
});
