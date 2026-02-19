const express = require("express");
const Router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

Router.post("/admin", async (req, res) => {
  const { empid, password } = req.body;

  try {
    if (!empid||!password) {
      return res.status(400).json({ message: "EmpID and password are required" });
    }

    if (empid !== process.env.ADMINEMPID) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      process.env.ADMINPASSWORD
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      {adminId: empid, role: "admin"},
      process.env.JSONSECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Admin access success",
      token,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = Router;
