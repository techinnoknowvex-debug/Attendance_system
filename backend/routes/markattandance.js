const express=require('express');
const Router=express.Router();
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE, ATTENDANCE_TABLE, OTP_Table, Leave_Table} = require("../models/supabaseModels");
const sendEmail =require("../config/email");

 Router.post("/markattandance", async (req, res) => {
  try {
    const { employeeId, status, timestamp, latitude, longitude, authType } = req.body;

    const { data: employee, error: empError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

   
    const { data: existingAttendanceData, error: attError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
      .eq('employee_id', employee.id)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    let existingAttendance = existingAttendanceData || null;

    let distance = null;

    if (status !== "Work From Home" && status!=="Absent") {
      const officeLat = parseFloat(employee.office_latitude);
      const officeLng = parseFloat(employee.office_longitude);

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        isNaN(lat) || isNaN(lng) ||
        lat < -90 || lat > 90 ||
        lng < -180 || lng > 180
      ) {
        return res.status(400).json({
          error: "Invalid latitude or longitude sent from client",
          received: { latitude, longitude }
        });
      }

      const R = 6371000; 
      const toRad = (v) => (v * Math.PI) / 180;

      const dLat = toRad(lat - officeLat);
      const dLon = toRad(lng - officeLng);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(officeLat)) *
          Math.cos(toRad(lat)) *
          Math.sin(dLon / 2) ** 2;

      distance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      console.log({
        officeLat,
        officeLng,
        userLat: lat,
        userLng: lng,
        distance_m: Math.round(distance),
      });

      if (distance >= 350 && status=="Present") {
        return res.status(403).json({
          message: "You are not near the office location",
          distance_m: Math.round(distance),
        });
      }
    }

    const currentTime = timestamp ? new Date(timestamp) : new Date();

    
    if (existingAttendance) {
      if(existingAttendance.status=="Absent"){
        return res.status(400).json({
          message:"Already Absent is marked for today"
        })
      }
   
      if (status !== "Present") {
        if(status=="Absent" || status=="Work From Home"){
          return res.status(200).json({
            message: status === "Work From Home" ? "Already marked Work From Home for today" : "Already Marked Absent for today"
          })
        }
      }
      
      if (authType === "logout" && !existingAttendance.login_time) {
        const response = {
          message: "Cannot logout: No login time recorded for today. Please login first."
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(400).json(response);
      }

      // Validation 2: Reject logout if already logged out today
      if (authType === "logout" && existingAttendance.logout_time) {
        const response = {
          message: "Cannot logout: You have already logged out today.",
          existingLogoutTime: existingAttendance.logout_time
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(400).json(response);
      }

      // Validation 3: Reject login if already logged out today (same day)
      if (authType === "login" && existingAttendance.logout_time) {
        const response = {
          message: "Cannot login: You have already logged out today. Please wait for a new day.",
          existingLogoutTime: existingAttendance.logout_time
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(400).json(response);
      }

      // Validation 4: Reject login if already logged in today (unless within 5 minutes - allow correction)
      if (authType === "login" && existingAttendance.login_time) {
        const existingLoginTime = new Date(existingAttendance.login_time);
        const timeDifference = Math.abs(currentTime - existingLoginTime);
        const minutesDifference = timeDifference / (1000 * 60);
        
        // Allow update only if within 5 minutes (for corrections)
        if (minutesDifference <= 5) {
          const { error: updateError } = await supabase
            .from(ATTENDANCE_TABLE)
            .update({ login_time: currentTime.toISOString() })
            .eq('id', existingAttendance.id);

          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }

          const response = {
            message: "Login time updated successfully (within correction window)"
          };
          if (distance !== null) {
            response.distance_km = Number((distance / 1000).toFixed(2));
          }
          return res.status(200).json(response);
        } else {
          const response = {
            message:"Cannot login: You have already logged in today.",
            existingLoginTime: existingAttendance.login_time
          };
          if (distance !== null) {
            response.distance_m = Math.round(distance);
            response.distance_km = Number((distance / 1000).toFixed(2));
          }
          return res.status(400).json(response);
        }
      }

      // If logout and all validations passed, update logout time
      if (authType === "logout") {
        const { error: updateError } = await supabase
          .from(ATTENDANCE_TABLE)
          .update({ logout_time: currentTime.toISOString() })
          .eq('id', existingAttendance.id);

        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }

        const response = {
          message: "Logout time recorded successfully"
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(200).json(response);
      }

      if(status=="Absent" || status=="Work From Home"){
        return res.status(200).json({
          message: status === "Work From Home" ? "Already marked Work From Home for today" : "Already Marked Absent for today"
        })
      }
    } else {
      // No existing attendance record for today
      // Skip authType validation for non-Present statuses
      if (status !== "Present") {
        if (status === "Work From Home") {
          const { error: insertError } = await supabase
          .from(ATTENDANCE_TABLE)
          .insert({
            employee_id: employee.id,
            status: status,
            timestamp: currentTime.toISOString(),
            login_time: currentTime.toISOString(),
            logout_time: null,
          });

          if (insertError) {
            console.error("Work From Home insert error:", insertError);
            return res.status(500).json({ error: insertError.message });
          }

          return res.status(201).json({
            message:"Work From Home marked for the day"
          });
        }

        if(status=="Absent"){
          const { error: insertError } = await supabase
          .from(ATTENDANCE_TABLE)
          .insert({
            employee_id: employee.id,
            status: status,
            timestamp: currentTime.toISOString(),
            login_time: null,
            logout_time: null,
          });

          if (insertError) {
            console.error("Absent insert error:", insertError);
            return res.status(500).json({ error: insertError.message });
          }

          return res.status(201).json({
            message:"Absent is marked for the day"
          });
        }
      }
      
   
      if (authType === "logout") {
        const response = {
          message: "Cannot logout: No login time recorded for today. Please login first."
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(400).json(response);
      }


      if (authType === "login" && status==="Present") {
        const { error: insertError } = await supabase
          .from(ATTENDANCE_TABLE)
          .insert({
            employee_id: employee.id,
            status: status,
            timestamp: currentTime.toISOString(),
            login_time: currentTime.toISOString(),
            logout_time: null,
          });

        if (insertError) {
          return res.status(500).json({ error: insertError.message });
        }

        const response = {
          message: "Login time recorded successfully"
        };
        if (distance !== null) {
          response.distance_m = Math.round(distance);
          response.distance_km = Number((distance / 1000).toFixed(2));
        }
        return res.status(201).json(response);
      }

   
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

Router.post("/generateOTP", async (req, res) => {
  const { employee_id, type, refid } = req.body;
  // normalize the incoming type to a proper value used by our table
  const normalizeType = (t) => {
    if (typeof t !== "string") return "";
    const lower = t.toLowerCase();
    if (lower === "attendance") return "Attendance";
    if (lower === "leave") return "Leave";
    return t;
  };
  const otpType = normalizeType(type);

  if (!employee_id) {
    return res.status(400).json({ error: "Employee ID is required" });
  }

  try {
  
    const { data: employee, error: empError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("id,name,email")
      .eq("employee_id", employee_id)
      .single();
      

    if (empError || !employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const { data: existingOTP } = await supabase
      .from(OTP_Table)
      .select("created_at")
      .eq("employee_id", employee.id)
      // case‑insensitive check in case older rows used different casing
      .ilike("otp_type", otpType)
      .eq("reference_id", refid || null)
      .single();

    if (existingOTP) {
      const createdTime = new Date(existingOTP.created_at);
      const timeDiff = Date.now() - createdTime.getTime();

      if (timeDiff < 60000) {
        return res
          .status(429)
          .json({ error: "Please wait before requesting another OTP" });
      }


      await supabase
        .from(OTP_Table)
        .delete()
        .eq("employee_id", employee.id)
        .ilike("otp_type", otpType)
        .eq("reference_id", refid || null);
    }

    const OTP = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    const { error: insertError } = await supabase
      .from(OTP_Table)
      .insert({
        employee_id: employee.id,
        otp: OTP,
        expires_at: expiresAt,
        attempts: 0,
        otp_type: otpType,
        reference_id: refid || null
      });

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }
let emailSent = "";

// use normalized type for subject and body
if (otpType === "Attendance") {
  emailSent = await sendEmail(
    employee.email,
    "Your Attendance OTP",
    `<h2>Your OTP Code</h2>
     <p>Your attendance OTP is:</p>
     <h1>${OTP}</h1>
     <p>This OTP is valid for 3 minutes.</p>`
  );
} else {
  emailSent = await sendEmail(
    employee.email,
    "Your Leave Request OTP",
    `<h2>Your OTP Code</h2>
     <p>Your OTP is:</p>
     <h1>${OTP}</h1>
     <p>This OTP is valid for 3 minutes.</p>`
  );
}

if (!emailSent) {
  return res.status(500).json({ error: "Failed to send email" });
}
    return res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


Router.post("/verify-otp", async (req, res) => {
  const { employee_id, otp, type, refid } = req.body;
  const otpValue = otp && String(otp).trim();
  const normalizeType = (t) => {
    if (typeof t !== "string") return "";
    const lower = t.toLowerCase();
    if (lower === "attendance") return "Attendance";
    if (lower === "leave") return "Leave";
    return t;
  };
  const otpType = normalizeType(type);

  if (!employee_id || !otpValue || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: employee, error: empError } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("id, employee_id, name, email")
      .eq("employee_id", employee_id)
      .single();

    if (empError || !employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const { data: validOTP, error: otpError } = await supabase
      .from(OTP_Table)
      .select("*")
      .eq("employee_id", employee.id)
      .eq("otp", otpValue)
      .ilike("otp_type", otpType)
      .eq("reference_id", refid || null)
      .single();

    if (otpError || !validOTP) {
      // log details for debugging
      console.log("OTP verification failed", {
        employee: employee.employee_id,
        providedOtp: otpValue,
        otpType,
        refid,
        otpError,
        validOTP,
      });
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > new Date(validOTP.expires_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    if (otpType === "Leave") {
      const {data:leave_data}=await supabase
        .from(Leave_Table)
        .update({ is_verified: true })
        .eq("id", refid)
        .select()
        .single();

        const {data:TL}=await supabase
        .from(EMPLOYEES_TABLE)
        .select("email,name")
        .eq("id",leave_data.team_leader_id) 
        .single();
        
        await sendEmail(TL.email,
  "Leave Request",
  `<h3>Leave Application</h3>
   <p><strong>Employee ID:</strong> ${employee.employee_id}</p>
  <p><strong>Employee Name:</strong> ${employee.name}</p>
  <p><strong>Reason:</strong> ${leave_data.reason}</p>
  <p><strong>From:</strong> ${leave_data.start_date}</p>
  <p><strong>To:</strong> ${leave_data.end_date}</p>
  <p><strong>Total Days:</strong> ${leave_data.total_days}</p>
  `
);
     await sendEmail("hr@innoknowvex.in",
  "Leave Request",
  `<h3>Leave Application</h3>
   <p><strong>Employee ID:</strong> ${employee.employee_id}</p>
  <p><strong>Employee Name:</strong> ${employee.name}</p>
  <p><strong>Reason:</strong> ${leave_data.reason}</p>
  <p><strong>From:</strong> ${leave_data.start_date}</p>
  <p><strong>To:</strong> ${leave_data.end_date}</p>
  <p><strong>Total Days:</strong> ${leave_data.total_days}</p>
  `
);
    }
    await supabase
      .from(OTP_Table)
      .delete()
      .eq("id", validOTP.id);

    return res.status(200).json({ message: "OTP Verified Successfully" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = Router;