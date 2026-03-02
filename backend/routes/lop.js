const express = require('express');
const Router = express.Router();
const supabase = require("../config/supabase");
const { LOP_TABLE, EMPLOYEES_TABLE } = require("../models/supabaseModels");
const {verifyToken} = require("../middleware/admincheck");

Router.post("/marklop", verifyToken, async (req, res) => {
  const { employeeId, reason, markingDate } = req.body;

  try {
  
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!employeeId || !reason || !markingDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const dateObj = new Date(markingDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Invalid marking date" });
    }

    const formattedDate = dateObj.toISOString().split("T")[0];

    const { data: employee, error: empError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("id")
      .eq("employee_id", employeeId)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { data: existingLOP } = await supabase
      .from(LOP_TABLE)
      .select("id")
      .eq("employee_id", employee.id)
      .eq("marking_date", formattedDate)
      .maybeSingle();

    if (existingLOP) {
      return res.status(409).json({
        message: "LOP already marked for this employee on this date"
      });
    }

    const { error: insertError } = await supabase
      .from(LOP_TABLE)
      .insert({
        employee_id: employee.id,
        reason,
        marking_date: formattedDate
      });

    if (insertError) {
      console.error("LOP insert error:", insertError);
      return res.status(500).json({ message: "Failed to mark LOP" });
    }

    return res.status(201).json({
      success: true,
      message: "LOP marked successfully"
    });

  } catch (error) {
    console.error("Mark LOP error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = Router;
