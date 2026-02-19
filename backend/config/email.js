const axios = require("axios");


const sendEmail = async (toEmail, otp) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "AttendanceOTP",
          email: "narendrachakka33@gmail.com", 
        },
        to: [
          {
            email: toEmail,
          },
        ],
        subject: "Your Attendance OTP",
        htmlContent: `
          <h2>Your OTP Code</h2>
          <p>Your attendance OTP is:</p>
          <h1>${otp}</h1>
          <p>This OTP is valid for 3 minutes.</p>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return true;
  } catch (error) {
    console.error("Brevo Error:", error.response?.data || error.message);
    return false;
  }
};

module.exports=sendEmail;
