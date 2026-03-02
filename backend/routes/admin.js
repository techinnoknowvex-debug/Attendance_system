const express = require("express");
const Router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {EMPLOYEES_TABLE}=require('../models/supabaseModels');
const supabase = require("../config/supabase");
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


Router.post("/TL",async (req,res)=>{

  const {emp_id,password}=req.body;
  try{
       if (!emp_id||!password) {
      return res.status(400).json({ message: "EmpID and password are required" });
    }

    const {data:employee,error:employeeerror}=await supabase
    .from(EMPLOYEES_TABLE)
    .select("id,tlpassword")
    .eq("employee_id",emp_id)
    .single();

    if (employeeerror || !employee) {
  return res.status(401).json({message: "Invalid credentials"});
}

    const isPasswordValid=await bcrypt.compare(
      password,
      employee.tlpassword
    )

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

   const token = jwt.sign(
      {TLid: employee.id, role: "Team Leader"},
      process.env.JSONSECRET,
      { expiresIn: "1h" }
    );
    return res.status(200).json({message:"TL access success",token})
  }catch(err){
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }

})

Router.post("/HR", async (req, res) => {
  const { emp_id, password } = req.body;
  try {
    if (!emp_id || !password) {
      return res.status(400).json({ message: "EmpID and password are required" });
    }

    if (emp_id !== process.env.HREMPID) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      process.env.HRPASSWORD
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { HRid: emp_id, role: "HR" },
      process.env.JSONSECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "HR access success",
      token
    });
  } catch (err) {
    console.error("HR login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = Router;
