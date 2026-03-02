const axios = require("axios");

const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "HR System",
          email: "narendrachakka33@gmail.com",
        },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
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

module.exports = sendEmail;