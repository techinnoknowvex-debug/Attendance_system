const express=require('express');
const Router=express.Router();
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE, ATTENDANCE_TABLE } = require("../models/supabaseModels");


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

    // Find existing attendance record for today
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

    const distance = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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

    const currentTime = timestamp ? new Date(timestamp) : new Date();

    
    if (existingAttendance) {
      if(existingAttendance.status=="Absent"){
        return res.status(400).json({
          message:"Already Absnet is marked for today"
        })
      }
      
      if (authType === "logout" && !existingAttendance.login_time) {
        return res.status(400).json({
          message: "Cannot logout: No login time recorded for today. Please login first.",
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
      }

      // Validation 2: Reject logout if already logged out today
      if (authType === "logout" && existingAttendance.logout_time) {
        return res.status(400).json({
          message: "Cannot logout: You have already logged out today.",
          existingLogoutTime: existingAttendance.logout_time,
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
      }

      // Validation 3: Reject login if already logged out today (same day)
      if (authType === "login" && existingAttendance.logout_time) {
        return res.status(400).json({
          message: "Cannot login: You have already logged out today. Please wait for a new day.",
          existingLogoutTime: existingAttendance.logout_time,
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
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

          return res.status(200).json({
            message: "Login time updated successfully (within correction window)",
            distance_km: Number((distance / 1000).toFixed(2))
          });
        } else {
          return res.status(400).json({
            message:"Cannot login: You have already logged in today.",
            existingLoginTime: existingAttendance.login_time,
            distance_m: Math.round(distance),
            distance_km: Number((distance / 1000).toFixed(2))
          });
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

        return res.status(200).json({
          message: "Logout time recorded successfully",
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
      }
      if(status=="Absent"){
        return res.status(200).json({
          message:"Already Marked the absent for today"
        })
      }
    } else {
      // No existing attendance record for today
      
      // Validation: Reject logout if no login exists (no record at all)
      if (authType === "logout") {
        return res.status(400).json({
          message: "Cannot logout: No login time recorded for today. Please login first.",
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
      }

      // Create new attendance record for login
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

        return res.status(201).json({
          message: "Login time recorded successfully",
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        });
      }else if(authType === "login" || authType==="logout" && status==="Absent"){
        return res.status(201).json({
          message: "Absent is marked for the day",
          distance_m: Math.round(distance),
          distance_km: Number((distance / 1000).toFixed(2))
        }); 
      }


      if(authType=="" || status=="Absent"){
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
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(201).json({
        message:"Absent is marked for the day",
        distance_m: Math.round(distance),
        distance_km: Number((distance / 1000).toFixed(2))
      });
      }
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

Router.post("/verify-pin", async(req,res)=>{
  
  const {pin, employeeId} = req.body;
  try{
    if(!pin || !employeeId){
      return res.status(400).json({success: false, message:"PIN and Employee ID are required"});
    }

    const {data: employee, error: empError} = await supabase
      .from(EMPLOYEES_TABLE)
      .select('pin')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if(empError){
      console.error("Error fetching employee:", empError);
      return res.status(500).json({success: false, message:"Error fetching employee data"});
    }

    if(!employee){
      return res.status(404).json({success: false, message:"Employee not found"});
    }

    // Convert both to string for comparison to handle type mismatches
    const storedPin = String(employee.pin);
    const providedPin = String(pin);

    if(storedPin === providedPin){
      return res.status(200).json({success: true, message:"Pin Verified Successfully"})
    } else {
      return res.status(401).json({success: false, message:"Invalid PIN"});
    }

  }catch(error){
     console.error("Verify PIN error:", error);
     return res.status(500).json({success: false, error: error.message });
  }
})

module.exports=Router;
