const express=require('express');
const Router=express.Router();
const XLSX=require('xlsx')
const supabase = require("../config/supabase");
const { EMPLOYEES_TABLE, ATTENDANCE_TABLE, LOP_TABLE } = require("../models/supabaseModels");
const verifyToken=require("../middleware/admincheck")

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

      // Get all employees for mapping FIRST
      const { data: allEmployeesForMapping, error: empMapError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*');

      if (empMapError) {
        return res.status(500).json({ message: empMapError.message });
      }

      const employeeMapById = new Map(allEmployeesForMapping.map(emp => [emp.id, emp]));

      // Get all attendance records for the month
      const { data: attendanceRecords, error: attError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString());

      if (attError) {
        return res.status(500).json({ message: attError.message });
      }

      console.log("Total attendance records found:", attendanceRecords.length);
      console.log("Present records:", attendanceRecords.filter(r => r.status === 'Present').length);

      // Group attendance by employee and calculate metrics
      const employeeMap = new Map();

      // Initialize all employees in the map
      allEmployeesForMapping.forEach(emp => {
        employeeMap.set(emp.id, {
          employee: emp,
          attendanceRecords: [],
          presentDays: 0
        });
      });

      // Add attendance records
      attendanceRecords.forEach(record => {
        if (record.status !== 'Present') return; // Only count Present records
        
        const empId = record.employee_id;
        
        if (!employeeMap.has(empId)) {
          console.log("Warning: attendance record for unknown employee ID:", empId);
          return;
        }

        const empData = employeeMap.get(empId);
        empData.attendanceRecords.push(record);
        empData.presentDays++;
      });

      // Calculate daysLessThan9Hours for each employee
      const data = Array.from(employeeMap.values()).map(empData => {
        const daysLessThan9Hours = empData.attendanceRecords.filter(record => {
          if (!record.login_time || !record.logout_time) return false;
          
          const loginTime = new Date(record.login_time);
          const logoutTime = new Date(record.logout_time);
          const hoursWorked = (logoutTime - loginTime) / (1000 * 60 * 60);
          
          return hoursWorked < 9;
        }).length;

        return {
          empId: empData.employee.employee_id,
          name: empData.employee.name,
          presentDays: empData.presentDays,
          daysLessThan9Hours: daysLessThan9Hours
        };
      });

      console.log("Summary sheet data count:", data.length);
      console.log("Sample data:", data.slice(0, 3));

      // Use allEmployeesForMapping for daily data sheet (already fetched)
      
      // Get all attendance records for the month (already have this above)
      // Just reuse attendanceRecords but get all statuses

      // Get all LOP records for the month
      const { data: allLOP, error: lopError } = await supabase
        .from(LOP_TABLE)
        .select('*')
        .gte('marking_date', startDate.toISOString().split('T')[0])
        .lt('marking_date', endDate.toISOString().split('T')[0]);

      if (lopError) {
        return res.status(500).json({ message: lopError.message });
      }

      // Create daily data sheet
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const dailyData = [];

      for (const employee of allEmployeesForMapping) {
        const row = {
          'Employee ID': employee.employee_id,
          'Name': employee.name
        };

        // Initialize all days as "Absent"
        for (let day = 1; day <= daysInMonth; day++) {
          row[`Day ${day}`] = 'Absent';
        }

        // Mark Present days
        attendanceRecords.forEach(att => {
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

      // Add color coding to daily worksheet
      if (dailyData.length > 0) {
        const range = XLSX.utils.decode_range(dailyWorksheet['!ref']);
        
        // Color code cells based on status
        for (let row = 1; row <= range.e.r; row++) {
          for (let col = 2; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!dailyWorksheet[cellAddress]) continue;
            
            const cellValue = dailyWorksheet[cellAddress].v;
            let fillColor = { rgb: "FFFFFF" }; // Default white
            
            if (cellValue === 'Present') {
              fillColor = { rgb: "90EE90" }; // Light green
            } else if (cellValue === 'Absent') {
              fillColor = { rgb: "FFB6C1" }; // Light red
            } else if (cellValue === 'LOP') {
              fillColor = { rgb: "FFA500" }; // Orange
            }
            
            if (!dailyWorksheet[cellAddress].s) {
              dailyWorksheet[cellAddress].s = {};
            }
            if (!dailyWorksheet[cellAddress].s.fill) {
              dailyWorksheet[cellAddress].s.fill = {};
            }
            dailyWorksheet[cellAddress].s.fill.fgColor = fillColor;
          }
        }
      }

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

  // Daily attendance sheet download endpoint
  Router.post("/dailysheet", verifyToken, async (req, res) => {
    const { date } = req.body;
  
    try {
      if(req.user.role !== "admin"){
        return res.status(403).json({message:"Access Denied for downloading daily sheet"})
      }

      if (!date) {
        return res.status(400).json({ message: "Please provide a date" });
      }

      const selectedDate = new Date(date);
      const startOfDay = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate(), 23, 59, 59, 999));

      // Get all employees
      const { data: allEmployees, error: empError } = await supabase
        .from(EMPLOYEES_TABLE)
        .select('*')
        .order('department', { ascending: true })
        .order('employee_id', { ascending: true });

      if (empError) {
        return res.status(500).json({ message: empError.message });
      }
      
      // Get all attendance records for the day
      const { data: allAttendance, error: allAttError } = await supabase
        .from(ATTENDANCE_TABLE)
        .select('*')
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());

      if (allAttError) {
        return res.status(500).json({ message: allAttError.message });
      }

      // Get all LOP records for the day
      const { data: allLOP, error: lopError } = await supabase
        .from(LOP_TABLE)
        .select('*')
        .gte('marking_date', startOfDay.toISOString().split('T')[0])
        .lte('marking_date', endOfDay.toISOString().split('T')[0]);

      if (lopError) {
        return res.status(500).json({ message: lopError.message });
      }

      // Create daily data grouped by department
      const dailyData = [];

      for (const employee of allEmployees) {
        // Find attendance record for this employee
        const attendance = allAttendance.find(att => {
          const attEmpId = att.employee_id;
          return attEmpId === employee.id;
        });
        
        
    

        let status = 'Not Logged In';

              if (attendance) {
          if (attendance.status === 'Present') {
            status = 'Logged In';
          } else if (attendance.status === 'Absent') {
            status = 'Absent';
          }
        }

        dailyData.push({
          'Employee ID': employee.employee_id,
          'Name': employee.name,
          'Department': employee.department || 'N/A',
          'Status': status,
        });
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(dailyData.length > 0 ? dailyData : []);

      // Add color coding
      if (dailyData.length > 0) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Color code Status column (column D, index 3)
        for (let row = 1; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: 3 }); // Status column
          if (!worksheet[cellAddress]) continue;
          
          const cellValue = worksheet[cellAddress].v;
          let fillColor = { rgb: "FFFFFF" }; // Default white
          
          if (cellValue === 'Logged In' || cellValue === 'Present') {
            fillColor = { rgb: "90EE90" }; // Light green
          } else if (cellValue === 'Absent' || cellValue === 'Not Logged In') {
            fillColor = { rgb: "FFB6C1" }; // Light red
          } else if (cellValue === 'LOP') {
            fillColor = { rgb: "FFA500" }; // Orange
          }
          
          if (!worksheet[cellAddress].s) {
            worksheet[cellAddress].s = {};
          }
          if (!worksheet[cellAddress].s.fill) {
            worksheet[cellAddress].s.fill = {};
          }
          worksheet[cellAddress].s.fill.fgColor = fillColor;
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Attendance");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=daily_attendance_${dateStr}.xlsx`
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
  
  
  
  module.exports=Router;