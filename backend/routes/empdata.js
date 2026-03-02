const express=require('express');
const Router=express.Router();
const XLSX=require('xlsx')
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE, ATTENDANCE_TABLE, LOP_TABLE } = require("../models/supabaseModels");
const {verifyToken}=require("../middleware/admincheck")

  Router.post("/empdata", verifyToken,async (req, res) => {
    const { year, month } = req.body;
  
    try {
        if(req.user.role!=="admin"){
            return res.status(403).json({message:"Access Denied for printing EMPLOYEE data"})
          }
      // Convert month name to number if it's a string
      const monthNames = {
        'Jan': 1, 'January': 1,
        'Feb': 2, 'February': 2,
        'Mar': 3, 'March': 3,
        'Apr': 4, 'April': 4,
        'May': 5,
        'Jun': 6, 'June': 6,
        'Jul': 7, 'July': 7,
        'Aug': 8, 'August': 8,
        'Sep': 9, 'September': 9,
        'Oct': 10, 'October': 10,
        'Nov': 11, 'November': 11,
        'Dec': 12, 'December': 12
      };
  
      
      const yearNum = parseInt(year, 10);
      
      let monthNum;
      if (typeof month === 'string') {
        monthNum = monthNames[month] || parseInt(month, 10);
      } else {
        monthNum = parseInt(month, 10);
      }
  
      const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0));

      console.log("Query date range:", { startDate, endDate, year: yearNum, month: monthNum });

      // Get all attendance records for the month with Present status
      const { data: attendanceRecords, error: attError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString())
        .eq('status', 'Present');

      if (attError) {
        return res.status(500).json({ message: attError.message });
      }

      // Get all employees to map IDs
      const { data: allEmployeesForMapping, error: empMapError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('id, employee_id, name, employee_type');

      if (empMapError) {
        return res.status(500).json({ message: empMapError.message });
      }

      const employeeMapById = new Map(allEmployeesForMapping.map(emp => [emp.id, emp]));

      // Get all attendance records for the month (not just Present)
      const { data: allAttendanceForCalc, error: allAttError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString());

      if (allAttError) {
        return res.status(500).json({ message: allAttError.message });
      }

      // Group attendance by employee and calculate metrics
      const employeeMap = new Map();

      // Initialize all employees in the map
      allEmployeesForMapping.forEach(employee => {
        employeeMap.set(employee.id, {
          employee: employee,
          presentRecords: [],
          presentDays: 0,
          absentDays: 0,
          lopDays: 0
        });
      });

      // Count present days
      attendanceRecords.forEach(record => {
        const empId = record.employee_id;
        if (employeeMap.has(empId)) {
          const empData = employeeMap.get(empId);
          empData.presentRecords.push(record);
          empData.presentDays++;
        }
      });

      // Get all LOP records for the month
      const { data: allLOP, error: lopError } = await supabase
        .from(LOP_TABLE)
        .select('*')
        .gte('marking_date', startDate.toISOString().split('T')[0])
        .lt('marking_date', endDate.toISOString().split('T')[0]);

      if (lopError) {
        return res.status(500).json({ message: lopError.message });
      }

      // Count LOP days per employee
      allLOP.forEach(lop => {
        if (employeeMap.has(lop.employee_id)) {
          employeeMap.get(lop.employee_id).lopDays++;
        }
      });

      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      // Calculate total working days (excluding Sundays)
      let totalWorkingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(yearNum, monthNum - 1, day));
        const dayOfWeek = currentDate.getUTCDay();
        if (dayOfWeek !== 0) {
           totalWorkingDays++;
          }
        }
        employeeMap.forEach(empData => {
          empData.absentDays =totalWorkingDays - empData.presentDays - empData.lopDays;
        });

      // Calculate daysLessThan9Hours for each employee
      const data = Array.from(employeeMap.values()).map(empData => {
        const daysLessThan9Hours = empData.presentRecords.filter(record => {
          if (!record.login_time || !record.logout_time) return false;
          
          const loginTime = new Date(record.login_time);
          const logoutTime = new Date(record.logout_time);
          const hoursWorked = (logoutTime - loginTime) / (1000 * 60 * 60);
          
          return hoursWorked < 9;
        }).length;

        return {
          'Employee ID': empData.employee.employee_id,
          'Name': empData.employee.name,
          'Employee Type': empData.employee.employee_type || 'N/A',
          'Present Days': empData.presentDays,
          'Absent Days': empData.absentDays,
          'LOP Days': empData.lopDays,
          'Days <9hrs': daysLessThan9Hours
        };
      });

      console.log("Query result count:", data.length);

      // Get all employees for daily data sheet
      const { data: allEmployees, error: empError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*');

      if (empError) {
        return res.status(500).json({ message: empError.message });
      }
      
      // Create daily data sheet
      const dailyData = [];

      for (const employee of allEmployees) {
        const row = {
          'Employee ID': employee.employee_id,
          'Name': employee.name,
          'Employee Type': employee.employee_type || 'N/A'
        };

        // Initialize all days as "Absent"
        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(Date.UTC(yearNum, monthNum - 1, day));
          const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday
          if (dayOfWeek === 0) {
            row[`Day ${day}`] = 'Holiday';
          } else {
            row[`Day ${day}`] = 'Absent';
          }
        }

        // Mark Present days
        allAttendanceForCalc.forEach(att => {
          if (att.employee_id === employee.id && att.status === 'Present') {
            const attDate = new Date(att.timestamp);
            const attDay = attDate.getUTCDate();
            if (attDay >= 1 && attDay <= daysInMonth) {
              row[`Day ${attDay}`] = 'Present';
            }
          }
        });

        // Mark LOP days (LOP takes priority over Present)
        allLOP.forEach(lop => {
          if (lop.employee_id === employee.id) {
            const lopDate = new Date(lop.marking_date);
            const lopDay = lopDate.getUTCDate();
            if (lopDay >= 1 && lopDay <= daysInMonth) {
              row[`Day ${lopDay}`] = 'LOP';
            }
          }
        });

        dailyData.push(row);
      }

      // Create worksheets
      const summaryWorksheet = XLSX.utils.json_to_sheet(data.length > 0 ? data : []);
      const dailyWorksheet = XLSX.utils.json_to_sheet(dailyData.length > 0 ? dailyData : []);

      // Create workbook with both sheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, dailyWorksheet, "Daily Data");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=attendance.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });



  Router.post("/dailyattandacetable", verifyToken, async (req, res) => {
    const { date } = req.body;
  
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Access Denied for viewing daily sheet"
        });
      }
  
      if (!date) {
        return res.status(400).json({ message: "Please provide a date" });
      }
  
      const selectedDate = new Date(date);
      const startOfDay = new Date(Date.UTC(
        selectedDate.getUTCFullYear(),
        selectedDate.getUTCMonth(),
        selectedDate.getUTCDate(),
        0, 0, 0, 0
      ));
  
      const endOfDay = new Date(Date.UTC(
        selectedDate.getUTCFullYear(),
        selectedDate.getUTCMonth(),
        selectedDate.getUTCDate(),
        23, 59, 59, 999
      ));
  
   
      const { data: allEmployees, error: empError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .order('department', { ascending: true })
        .order('employee_id', { ascending: true });
  
      if (empError) {
        return res.status(500).json({ message: empError.message });
      }
  
    
      const { data: allAttendance, error: attError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());
  
      if (attError) {
        return res.status(500).json({ message: attError.message });
      }
  
      const dailyData = [];
  
      for (const employee of allEmployees) {
  
        const attendance = allAttendance.find(
          att => att.employee_id === employee.id
        );
  
        let status = "Not Logged In";
        let loginTime = null;
        let logoutTime = null;
  
        if (attendance) {
          if (attendance.status === "Present") {
            status = "Logged In";
            loginTime = attendance.login_time;
            logoutTime = attendance.logout_time;
          } else if (attendance.status === "Absent") {
            status = "Absent";
          } else if (attendance.status === "Work From Home") {
            status = "Work From Home";
            loginTime = attendance.login_time;
            logoutTime = attendance.logout_time;
          }
        }
  
        dailyData.push({
          employeeId: employee.employee_id,
          name: employee.name,
          department: employee.department || "N/A",
          status: status,
          loginTime: loginTime,
          logoutTime: logoutTime
        });
      }
  
      res.status(200).json({
        date: selectedDate.toISOString().split('T')[0],
        totalEmployees: dailyData.length,
        data: dailyData
      });
  
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  module.exports=Router;
