const express = require('express');
const Router = express.Router();
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE, Leave_Table, LOP_TABLE } = require("../models/supabaseModels");
const sendemail = require("../config/email");
const {verifyToken}=require("../middleware/admincheck")

/**
 * createLopRecordsForLeave - Calculates and creates LOP (Loss of Pay) records for approved leaves
 * 
 * LOP POLICY LOGIC:
 * - INTERNS: All days in leave become LOP (no paid leaves)
 * - FULL-TIME: Get 2 paid days per calendar month (Sick Leave & Casual Leave only)
 *   - Paid leave types: Sick Leave, Casual Leave
 *   - Unpaid leave types: Other leaves automatically marked as LOP
 *   - Paid days are deducted from the 2-day monthly quota
 *   - Once 2 paid days used in a month, remaining leave days = LOP
 * - OTHERS: Get 0 paid days per month (all leaves = LOP)
 * 
 * ALGORITHM:
 * 1. Get employee type to determine paid leave quota
 * 2. If Intern: Mark all days as LOP
 * 3. If Full-Time/Other: 
 *    a. Map out all calendar months covered by the leave
 *    b. For each month: Count paid days already used by OTHER approved leaves
 *    c. Calculate remaining quota for this month (2 - already_used)
 *    d. Process each day of current leave:
 *       - If paid leave type AND quota available: Use up 1 quota day (not marked as LOP)
 *       - Otherwise: Mark as LOP
 * 
 * @param {Object} leave - Leave record with employee_id, start_date, end_date, leave_type, reason
 */
async function createLopRecordsForLeave(leave) {
  try {
    // Fetch employee type to determine LOP calculation strategy
    const { data: emp } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("employee_type")
      .eq("id", leave.employee_id)
      .single();

    if (!emp) return;

    const empType = emp.employee_type;
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    const lopRecords = [];

    // ============ INTERN LOGIC ============
    // Interns have no paid leave allowance - ALL days become LOP
    if (empType === "Intern") {
      let cur = new Date(startDate);
      while (cur <= endDate) {
        lopRecords.push({
          employee_id: leave.employee_id,
          reason: `LOP from approved leave: ${leave.reason}`,
          marking_date: cur.toISOString().split("T")[0]
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // ============ FULL-TIME & OTHER EMPLOYEE LOGIC ============
      // Determine monthly paid leave quota: Full-Time = 2 days/month, Others = 0 days/month
      const paidLimit = empType === "Full Time" ? 2 : 0;

      // STEP 1: Build a map of all calendar months covered by this leave period
      // This allows us to track paid day usage per month independently
      const monthMap = {}; // Format: key (YYYY-M) -> {monthStart, monthEnd, usedPaid, remainingPaid}
      let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (cursor <= lastMonth) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // Last day of month
        const key = `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`;
        
        monthMap[key] = { 
          monthStart, 
          monthEnd, 
          usedPaid: 0,  // Will be updated after checking existing leaves
          remainingPaid: paidLimit  // Start with full quota
        };
        
        cursor.setMonth(cursor.getMonth() + 1);
      }

      // STEP 2: For each month, fetch OTHER already-approved leaves to calculate used paid days
      // This ensures we don't exceed the monthly quota when combined with other approved leaves
      const monthKeys = Object.keys(monthMap);
      for (const key of monthKeys) {
        const { monthStart, monthEnd } = monthMap[key];
        const startStr = monthStart.toISOString().split("T")[0];
        const endStr = monthEnd.toISOString().split("T")[0];

        // Fetch all approved leaves (from other leave applications) that overlap this month
        const { data: leaves = [] } = await supabase
          .from(Leave_Table)
          .select("*")
          .eq("employee_id", leave.employee_id)
          .neq("id", leave.id)                // exclude the current leave itself
          .eq("tl_status", "Approved")        // Approved by Team Lead
          .eq("hr_status", "Approved")        // Approved by HR
          .lte("start_date", endStr)          // Leave starts before or on month end
          .gte("end_date", startStr);         // Leave ends after or on month start

        let usedPaid = 0;

        // Helper function: Calculate overlapping days between two date ranges
        const overlapDays = (startA, endA, startB, endB) => {
          const s = new Date(Math.max(startA.getTime(), startB.getTime()));
          const e = new Date(Math.min(endA.getTime(), endB.getTime()));
          if (e < s) return 0;  // No overlap
          // Calculate how many complete days are between these dates
          return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
        };

        // Count used paid days from all other approved leaves in this month
        // NOTE: count all approved leave days (regardless of leave_type) so
        // that full-time employees consume the monthly paid quota for any
        // leave they take (first-come basis). This prevents double-counting
        // the current leave because we excluded it above.
        leaves.forEach((otherLeave) => {
          const otherStart = new Date(otherLeave.start_date);
          const otherEnd = new Date(otherLeave.end_date);

          // Get overlap days between this other leave and current month
          const daysInMonth = overlapDays(otherStart, otherEnd, monthStart, monthEnd);

          if (!daysInMonth) return; // No overlap with this month

          // Count all overlapping days toward usedPaid
          usedPaid += daysInMonth;
        });

        // Store usage and calculate remaining quota for this month
        monthMap[key].usedPaid = usedPaid;
        monthMap[key].remainingPaid = Math.max(0, paidLimit - usedPaid);
      }

      // STEP 3: Process each day of the current leave
      // Decide whether each day is marked as LOP or consumed from paid quota
      let curDate = new Date(startDate);
      while (curDate <= endDate) {
        const key = `${curDate.getFullYear()}-${curDate.getMonth() + 1}`;
        const monthInfo = monthMap[key];
        
        // For full-time employees, consume monthly paid quota on a first-come
        // basis regardless of the leave_type. If quota remains for the month,
        // do not mark the day as LOP; otherwise mark it as LOP.
        if (monthInfo && monthInfo.remainingPaid > 0) {
          monthInfo.remainingPaid -= 1; // consume one paid day from quota
          // This day is covered by paid quota (not added to lopRecords)
        } else {
          // Mark this day as LOP (quota exhausted or no quota for this employee type)
          lopRecords.push({
            employee_id: leave.employee_id,
            reason: `LOP from approved leave: ${leave.reason}`,
            marking_date: curDate.toISOString().split("T")[0]
          });
        }
        
        curDate.setDate(curDate.getDate() + 1);
      }
    }

    // STEP 4: Insert all LOP records into database
    if (lopRecords.length > 0) {
      const { error: lopError } = await supabase
        .from(LOP_TABLE)
        .insert(lopRecords);
      
      if (lopError) {
        console.error("Error inserting LOP records:", lopError);
      }
    }
  } catch (err) {
    console.error("createLopRecordsForLeave error:", err);
  }
}

Router.post("/applyLeave", async (req, res) => {
  try {
    const { empid, tlID, reason, leave_type, st_date, end_date } = req.body;

    const { data: employee, error: empError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("*")
      .eq("employee_id", empid)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const start=new Date(st_date);
    const end=new Date(end_date);
    const { data: leave,error: insertError } = await supabase
      .from(Leave_Table)
      .insert({
        employee_id: employee.id,  
        team_leader_id: tlID,
        reason,
        leave_type,
        start_date: st_date,
        end_date: end_date,
        is_verified:false
      }).select().single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
    
    return res.status(200).json({
      success: true,
      message: "Leave created",
      leave_id:leave.id
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



Router.post("/leave-action",verifyToken, async (req, res) => {
   const { leave_id, action } = req.body;

  try {
    if(req.user.role!=="Team Leader"){
         return res.status(403).json({message:"Access Denied"})
      }

    if (!leave_id || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["Approved", "Rejected"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const { data: leaveData, error: leaveError } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    if (leaveError || !leaveData) {
      return res.status(404).json({ error: "Leave not found" });
    }

    if (leaveData.team_leader_id !== req.user.TLid){
      return res.status(401).json({message:"Error with TL"})

    }

    if (leaveData.tl_status !== "Pending") {
      return res.status(403).json({
    message: "This leave has already been reviewed by Team Leader"
  });
    }

    // If TL rejects, also reject at HR level immediately
    const updateData = { 
      tl_status: action,
      approved_at: new Date()
    };
    
    if (action === "Rejected") {
      updateData.hr_status = "Rejected";
    }

    const { error: updateError } = await supabase
      .from(Leave_Table)
      .update(updateData)
      .eq("id", leave_id);

    if (updateError) {
      return res.status(500).json({ error: "Leave update failed" });
    }
    
    // Fetch updated leave data
    const { data: updatedLeave } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    // After TL approval, if HR already approved too, compute and create LOPs per rules
    if (action === "Approved" && updatedLeave.hr_status === "Approved") {
      try {
        await createLopRecordsForLeave(updatedLeave);
      } catch (err) {
        console.error("Error in LOP creation logic:", err);
      }
    }

    const { data: employee } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("email, name")
      .eq("id", leaveData.employee_id)
      .single();

    // If TL rejected, send rejection email immediately
    if (action === "Rejected") {
      await sendemail(
        employee.email,
        `Your Leave Request Has Been Rejected`,
        `
        <h3>Leave Rejected</h3>

        <p>Hi ${employee.name},</p>

        <p>Your leave request from <strong>${leaveData.start_date}</strong> 
        to <strong>${leaveData.end_date}</strong> has been 
        <strong>Rejected</strong> by your Team Leader.</p>
        <p>Thank you.</p>
        `
      );
      return res.status(200).json({
        message: `Leave Rejected by Team Leader. Rejection email sent to employee.`
      });
    }

    // If TL approved, wait for HR review
    return res.status(200).json({
      message: `Leave Approved by Team Leader. Awaiting HR review.`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


Router.get("/all_Leaves", verifyToken, async (req, res) => {

  try {

    if (req.user.role !== "Team Leader") {
      return res.status(403).json({
        message: "Access Denied"
      });
    }

    const tlid = req.user.TLid;

    const { data: leavedata, error } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("team_leader_id", tlid);

    if (error) {
      return res.status(500).json({
        message: "Leave Data Extracting failed"
      });
    }

    return res.status(200).json({
      message: "Leave data displaying",
      data: leavedata,
    });

  } catch (err) {
    console.error("Leave fetch error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


//Leave summary
Router.get("/calculatedLeave/:leave_id", verifyToken, async (req, res) => {
  try {
    const { leave_id } = req.params;

    const { data: currentLeave, error: leaveError } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    if (leaveError || !currentLeave) {
      return res.status(404).json({
        message: "Leave not found"
      });
    }

    if (currentLeave.team_leader_id !== req.user.TLid) {
      return res.status(403).json({
        message: "Not authorized to view this leave"
      });
    }

    const { data: employee, error: employeeError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("id, employee_id, name, employee_type")
      .eq("id", currentLeave.employee_id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    const toDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const overlapDays = (startA, endA, startB, endB) => {
      const s = toDateOnly(new Date(Math.max(startA.getTime(), startB.getTime())));
      const e = toDateOnly(new Date(Math.min(endA.getTime(), endB.getTime())));
      if (e < s) return 0;
      return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    };

    const fmtDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    let paidLimit = 0;
    if (employee.employee_type === "Full Time") {
      paidLimit = 2;
    } else if (employee.employee_type === "Intern") {
      paidLimit = 0;
    }
    const computeMonthSummary = async (monthStart, monthEnd) => {
      const startStr = fmtDate(monthStart);
      const endStr = fmtDate(monthEnd);
      const { data: leaves = [], error } = await supabase
        .from(Leave_Table)
        .select("*")
        .eq("employee_id", employee.id)
        .eq("tl_status", "Approved")
        .eq("hr_status", "Approved")
        .lte("start_date", endStr)
        .gte("end_date", startStr);

      if (error) {
        console.error("monthly summary query failed", error);
        throw new Error("Failed to fetch monthly leave data");
      }

      let usedPaid = 0;
      let usedExplicitLop = 0;
      let total = 0;

      leaves.forEach((l) => {
        const lStart = new Date(l.start_date);
        const lEnd = new Date(l.end_date);
        const days = overlapDays(lStart, lEnd, monthStart, monthEnd);
        if (!days) return;
        total += days;
        if (l.leave_type === "Sick Leave" || l.leave_type === "Casual Leave") {
          usedPaid += days;
        } else if (l.leave_type === "other") {
          usedExplicitLop += days;
        }
      });

      const lopFromOver = Math.max(0, total - paidLimit);
      return {
        paidUsed: usedPaid,
        totalLeaves: total,
        totalLops: usedExplicitLop + lopFromOver,
      };
    };

    const leaveStartDate = new Date(currentLeave.start_date);
    const reqMonthStart = new Date(leaveStartDate.getFullYear(), leaveStartDate.getMonth(), 1);
    const reqMonthEnd = new Date(leaveStartDate.getFullYear(), leaveStartDate.getMonth() + 1, 0);
    const reqMonthSummary = await computeMonthSummary(reqMonthStart, reqMonthEnd);

    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const curMonthSummary = await computeMonthSummary(curMonthStart, curMonthEnd);

    
    const reqStart = new Date(currentLeave.start_date);
    const reqEnd = new Date(currentLeave.end_date);
    const currentRequestDays = Math.ceil((reqEnd - reqStart) / (1000 * 60 * 60 * 24)) + 1;
    const currentRequestDaysInMonth = overlapDays(reqStart, reqEnd, reqMonthStart, reqMonthEnd);
    let paidRemainingForRequest = paidLimit - reqMonthSummary.paidUsed;
    if (paidRemainingForRequest < 0) paidRemainingForRequest = 0;
    const paidCoveredForCurrent = Math.min(paidRemainingForRequest, currentRequestDays);
    const lopDaysIfApproved = currentRequestDays - paidCoveredForCurrent;

    let paidRemaining = paidLimit - reqMonthSummary.paidUsed;
    if (paidRemaining < 0) paidRemaining = 0;
    const suggestion =
      paidRemaining === 0
        ? "Paid leaves exhausted. New leave will be LOP."
        : `Remaining paid leave balance: ${paidRemaining}`;

    return res.status(200).json({
      employee: {
        empId: employee.employee_id,
        name: employee.name,
        type: employee.employee_type,
      },
      requestMonth: {
        paidLimit,
        paidUsed: reqMonthSummary.paidUsed,
        totalLeaves: reqMonthSummary.totalLeaves,
        totalLops: reqMonthSummary.totalLops,
        remainingPaidLeaves: paidRemaining,
        suggestion,
      },
      currentMonth: {
        paidLimit,
        paidUsed: curMonthSummary.paidUsed,
        totalLeaves: curMonthSummary.totalLeaves,
        totalLops: curMonthSummary.totalLops,
        remainingPaidLeaves: Math.max(0, paidLimit - curMonthSummary.paidUsed),
      },
      currentRequest: {
        startDate: currentLeave.start_date,
        endDate: currentLeave.end_date,
        reason: currentLeave.reason,
        totalDays: currentRequestDays,
        daysInThisMonth: currentRequestDaysInMonth,
        paidDaysIfApproved: paidCoveredForCurrent,
        lopDaysIfApproved: lopDaysIfApproved,
      },
    });

  } catch (err) {
    console.error("Leave summary error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


// HR Leave Action Endpoint
Router.post("/hr-leave-action", verifyToken, async (req, res) => {
  const { leave_id, action } = req.body;

  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({ message: "Access Denied" });
    }

    if (!leave_id || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["Approved", "Rejected"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const { data: leaveData, error: leaveError } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    if (leaveError || !leaveData) {
      return res.status(404).json({ error: "Leave not found" });
    }

    if (leaveData.tl_status !== "Approved") {
      return res.status(403).json({
        message: "HR can only review leaves that have been approved by Team Leader"
      });
    }

    if (leaveData.hr_status !== "Pending") {
      return res.status(403).json({
        message: "This leave has already been reviewed by HR"
      });
    }

    const { error: updateError } = await supabase
      .from(Leave_Table)
      .update({
        hr_status: action
      })
      .eq("id", leave_id);

    if (updateError) {
      return res.status(500).json({ error: "Leave update failed" });
    }

    // Fetch updated leave data
    const { data: updatedLeave } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    // After HR approval, if TL already approved too, compute and create LOPs
    if (action === "Approved" && updatedLeave.tl_status === "Approved") {
      try {
        await createLopRecordsForLeave(updatedLeave);
      } catch (err) {
        console.error("Error in LOP creation logic:", err);
      }
    }

    const { data: employee } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("email, name")
      .eq("id", leaveData.employee_id)
      .single();

    // Send email to employee based on final decision
    // HR approval = Approved (TL already approved)
    // HR rejection = Rejected (even though TL approved)
    const finalStatus = action === "Approved" ? "Approved" : "Rejected";
    
    await sendemail(
      employee.email,
      `Your Leave Request Has Been ${finalStatus}`,
      `
      <h3>Leave ${finalStatus}</h3>

      <p>Hi ${employee.name},</p>

      <p>Your leave request from <strong>${leaveData.start_date}</strong> 
      to <strong>${leaveData.end_date}</strong> has been 
      <strong>${finalStatus}</strong>.</p>
      <p>Thank you.</p>
      `
    );

    return res.status(200).json({
      message: `Leave ${action} by HR. Email sent to employee.`
    });

  } catch (err) {
    console.error("HR leave action error:", err);
    return res.status(500).json({ error: err.message });
  }
});



Router.get("/hr-leave-summary/:leave_id", verifyToken, async (req, res) => {
  try {
    const { leave_id } = req.params;

    if (req.user.role !== "HR") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const { data: currentLeave, error: leaveError } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("id", leave_id)
      .single();

    if (leaveError || !currentLeave) {
      return res.status(404).json({
        message: "Leave not found"
      });
    }

    const { data: employee, error: employeeError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("id, employee_id, name, employee_type")
      .eq("id", currentLeave.employee_id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    const toDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const overlapDays = (startA, endA, startB, endB) => {
      const s = toDateOnly(new Date(Math.max(startA.getTime(), startB.getTime())));
      const e = toDateOnly(new Date(Math.min(endA.getTime(), endB.getTime())));
      if (e < s) return 0;
      return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    };

    const fmtDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };

    let paidLimit = 0;
    if (employee.employee_type === "Full Time") {
      paidLimit = 2;
    } else if (employee.employee_type === "Intern") {
      paidLimit = 0;
    }

    const computeMonthSummary = async (monthStart, monthEnd) => {
      const startStr = fmtDate(monthStart);
      const endStr = fmtDate(monthEnd);
      const { data: leaves = [], error } = await supabase
        .from(Leave_Table)
        .select("*")
        .eq("employee_id", employee.id)
        .eq("tl_status", "Approved")
        .eq("hr_status", "Approved")
        .lte("start_date", endStr)
        .gte("end_date", startStr);

      if (error) {
        console.error("HR leave summary query failed", error);
        throw new Error("Failed to fetch monthly leave data");
      }

      let usedPaid = 0;
      let usedExplicitLop = 0;
      let total = 0;

      leaves.forEach((l) => {
        const lStart = new Date(l.start_date);
        const lEnd = new Date(l.end_date);
        const days = overlapDays(lStart, lEnd, monthStart, monthEnd);
        if (!days) return;
        total += days;
        if (l.leave_type === "Sick Leave" || l.leave_type === "Casual Leave") {
          usedPaid += days;
        } else if (l.leave_type === "other") {
          usedExplicitLop += days;
        }
      });

      const lopFromOver = Math.max(0, total - paidLimit);
      return {
        paidUsed: usedPaid,
        totalLeaves: total,
        totalLops: usedExplicitLop + lopFromOver,
      };
    };

    const leaveStartDate = new Date(currentLeave.start_date);
    const reqMonthStart = new Date(leaveStartDate.getFullYear(), leaveStartDate.getMonth(), 1);
    const reqMonthEnd = new Date(leaveStartDate.getFullYear(), leaveStartDate.getMonth() + 1, 0);
    const reqMonthSummary = await computeMonthSummary(reqMonthStart, reqMonthEnd);

    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const curMonthSummary = await computeMonthSummary(curMonthStart, curMonthEnd);

    const reqStart = new Date(currentLeave.start_date);
    const reqEnd = new Date(currentLeave.end_date);
    const currentRequestDays = Math.ceil((reqEnd - reqStart) / (1000 * 60 * 60 * 24)) + 1;
    const currentRequestDaysInMonth = overlapDays(reqStart, reqEnd, reqMonthStart, reqMonthEnd);
    let paidRemainingForRequest = paidLimit - reqMonthSummary.paidUsed;
    if (paidRemainingForRequest < 0) paidRemainingForRequest = 0;
    const paidCoveredForCurrent = Math.min(paidRemainingForRequest, currentRequestDays);
    const lopDaysIfApproved = currentRequestDays - paidCoveredForCurrent;

    let paidRemaining = paidLimit - reqMonthSummary.paidUsed;
    if (paidRemaining < 0) paidRemaining = 0;
    const suggestion =
      paidRemaining === 0
        ? "Paid leaves exhausted. New leave will be LOP."
        : `Remaining paid leave balance: ${paidRemaining}`;

    return res.status(200).json({
      employee: {
        empId: employee.employee_id,
        name: employee.name,
        type: employee.employee_type,
      },
      requestMonth: {
        paidLimit,
        paidUsed: reqMonthSummary.paidUsed,
        totalLeaves: reqMonthSummary.totalLeaves,
        totalLops: reqMonthSummary.totalLops,
        remainingPaidLeaves: paidRemaining,
        suggestion,
      },
      currentMonth: {
        paidLimit,
        paidUsed: curMonthSummary.paidUsed,
        totalLeaves: curMonthSummary.totalLeaves,
        totalLops: curMonthSummary.totalLops,
        remainingPaidLeaves: Math.max(0, paidLimit - curMonthSummary.paidUsed),
      },
      currentRequest: {
        startDate: currentLeave.start_date,
        endDate: currentLeave.end_date,
        reason: currentLeave.reason,
        totalDays: currentRequestDays,
        daysInThisMonth: currentRequestDaysInMonth,
        paidDaysIfApproved: paidCoveredForCurrent,
        lopDaysIfApproved: lopDaysIfApproved,
      },
    });

  } catch (err) {
    console.error("HR leave summary error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

// HR get all pending leaves for review
Router.get("/hr-all-leaves", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({
        message: "Access Denied"
      });
    }

    const { data: leavedata, error } = await supabase
      .from(Leave_Table)
      .select("*")
      .eq("tl_status", "Approved")
      .eq("hr_status", "Pending");

    if (error) {
      return res.status(500).json({
        message: "Leave data fetching failed"
      });
    }

    return res.status(200).json({
      message: "Leave data retrieved",
      data: leavedata || []
    });

  } catch (err) {
    console.error("HR leave fetch error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

module.exports=Router;