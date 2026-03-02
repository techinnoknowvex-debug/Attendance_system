import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import AdminLoginModal from "../components/AdminLoginModal";
import AttendanceForm from "../components/AttendanceForm";
import PINModal from "../components/PINModal";
import LeaveForm from "../components/LeaveForm";



export default function Home() {
  const navigate = useNavigate();

  // Attendance states
  const [empid, setEmpid] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [authType, setAuthType] = useState("");
  const [location, setLocation] = useState({
    lat: null,
    lon: null,
    accuracy: null,
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [Adminshow, setAdminshow] = useState(false);
  const [adminEmpid, setAdminEmpid] = useState("");
  const [password, setPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // ---- leave form states ----
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveEmpid, setLeaveEmpid] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("Sick Leave");
  const [leaveTL, setLeaveTL] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveIdForOtp, setLeaveIdForOtp] = useState(null);
  const [otpType, setOtpType] = useState(""); // will be set to "Attendance" or "Leave" when needed
  const otpTypeRef = useRef("");

  const updateOtpType = (type) => {
    setOtpType(type);
    otpTypeRef.current = type;
  };






  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by your browser", "error");
      return;
    }
  
    setLocationLoading(true);
  
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationLoading(false);
      },
      (error) => {
        showToast("Location permission denied. Please enable location access.", "error");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  

  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/employees-for-attendance", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok && data.Empdata) {
          setEmployees(data.Empdata);
        } else {
          showToast("Failed to load employees", "error");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        showToast("Failed to load employees", "error");
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, []);


  useEffect(() => {
    setEmpid("");
  }, [department]);

 
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0 && showOtpModal) {
      setCanResendOtp(true);
    }
    return () => clearInterval(interval);
  }, [otpTimer, showOtpModal]);


const generateOTP = async ({ employee_id = empid, type = "Attendance", refid = null } = {}) => {
    // normalize the type before sending so network requests are consistent
    const normalizeType = (t) => {
      if (typeof t !== "string") return "";
      const lower = t.toLowerCase();
      if (lower === "attendance") return "Attendance";
      if (lower === "leave") return "Leave";
      return t;
    };
    type = normalizeType(type);
    console.log("\n=== GENERATING OTP ===");
    console.log("Type after normalization:", type);
    try {
      const generatePayload = { employee_id, type, refid };
      console.log("Generate OTP Payload:", generatePayload);
      const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/generateOTP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "OTP sent to your email!", "success");
        setShowOtpModal(true);
        setOtp("");
        // 3 minutes = 180 seconds (backend expiry)
        setOtpTimer(180);
        setCanResendOtp(false);
        if (type === "Leave") {
          // once OTP sent hide the form to avoid duplicate submissions
          setShowLeaveForm(false);
        }
      } else {
        showToast(data.error || data.message || "Failed to generate OTP", "error");
      }
    } catch (error) {
      console.error("OTP generation error:", error);
      showToast("Failed to generate OTP. Please try again.", "error");
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    if (otpType === "Attendance") {
      await generateOTP({ employee_id: empid, type: "Attendance", refid: null });
    } else if (otpType === "Leave") {
      await generateOTP({ employee_id: leaveEmpid, type: "Leave", refid: leaveIdForOtp });
    } else {
      await generateOTP();
    }
  };


  const markAttendanceWithoutOTP = async () => {
    try {
      setLoading(true);

      const markRes = await fetch("https://attendance-system-oe9j.onrender.com/emp/markattandance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empid,
          status,
          authType: status === "Work From Home" ? "" : authType,
          latitude: status === "Work From Home" ? null : location.lat,
          longitude: status === "Work From Home" ? null : location.lon,
          timestamp: new Date().toISOString(),
        }),
      });

      const markData = await markRes.json();
      if (markRes.ok) {
        showToast(markData.message || "Attendance marked successfully!", "success");
        setEmpid("");
        setDepartment("");
        setStatus("");
        setAuthType("");
      } else {
        showToast(markData.message || "Something went wrong. Please try again.", "error");
      }
    } catch (error) {
      console.error("Marking error:", error);
      showToast("Failed to mark attendance. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      const trimmed = otp.trim();
      if (!trimmed) {
        showToast("Please enter the OTP", "error");
        return;
      }

      setLoading(true);
      const verifyPayload = {
        employee_id: otpTypeRef.current === "Attendance" ? empid : leaveEmpid,
        otp: trimmed,
        type: otpTypeRef.current,
        refid: otpTypeRef.current === "Attendance" ? null : leaveIdForOtp,
      };
      console.log("\n=== SENDING VERIFY OTP ===");
      console.log("Payload:", verifyPayload);
      console.log("otpTypeRef.current:", otpTypeRef.current);
      console.log("=== END ===");

      // first verify OTP for whichever flow we are in
      const verifyRes = await fetch("https://attendance-system-oe9j.onrender.com/emp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        showToast(verifyData.error || verifyData.message || "OTP verification failed. Please try again.", "error");
        setOtp("");
        setLoading(false);
        return;
      }

      if (otpTypeRef.current === "Attendance") {
        const markRes = await fetch("https://attendance-system-oe9j.onrender.com/emp/markattandance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: empid,
            status,
            authType: status === "Work From Home" ? "" : authType,
            latitude: status === "Work From Home" ? null : location.lat,
            longitude: status === "Work From Home" ? null : location.lon,
            timestamp: new Date().toISOString(),
          }),
        });

        const markData = await markRes.json();
        if (markRes.ok) {
          showToast(markData.message || "Attendance marked successfully!", "success");
          setEmpid("");
          setDepartment("");
          setStatus("");
          setAuthType("");
          setOtp("");
          setShowOtpModal(false);
        } else {
          showToast(markData.message || "Something went wrong. Please try again.", "error");
          setOtp("");
        }
      } else if (otpType === "leave") {
        // after leave OTP is verified the backend already marked the leave as verified
        showToast("Leave verified and submitted!", "success");
        // reset leave form
        setLeaveEmpid("");
        setLeaveName("");
        setLeaveReason("");
        setLeaveStart("");
        setLeaveEnd("");
        setLeaveType("Sick Leave");
        setLeaveTL("");
        setLeaveIdForOtp(null);
        setShowLeaveForm(false);
        setOtp("");
        setShowOtpModal(false);
      }
    } catch (error) {
      console.error("Verification error:", error);
      showToast("Verification failed. Please try again.", "error");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  
  const markattandance = async (e) => {
    e.preventDefault();

    if (status !== "Work From Home" && (!location.lat || !location.lon)) {
      showToast("Please wait for location to be detected", "error");
      return;
    }

    if (status === "Present" && authType === "") {
      showToast("Please select Login or Logout", "error");
      return;
    }
    if (!department) {
      showToast("Please select a department", "error");
      return;
    }
    if (!empid.trim()) {
      showToast("Please select an employee", "error");
      return;
    }
    if (!status) {
      showToast("Please select your status", "error");
      return;
    }

    // set otp type to Attendance before generating
    updateOtpType("Attendance");

    if (status === "Present" && authType === "logout") {
      await markAttendanceWithoutOTP();
    } else {
      setOtpLoading(true);
      await generateOTP({ employee_id: empid, type: "Attendance", refid: null });
    }
  };

  // leave submission
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    if (!leaveEmpid.trim()) {
      showToast("Please select employee for leave", "error");
      return;
    }
    if (!leaveReason.trim()) {
      showToast("Please enter reason", "error");
      return;
    }
    if (!leaveStart || !leaveEnd) {
      showToast("Please select both start and end date", "error");
      return;
    }
    if (!leaveTL) {
      showToast("Please select a team leader", "error");
      return;
    }

    setLeaveLoading(true);
    try {
      let leaveId = leaveIdForOtp;

      if (!leaveId) {
        // first time submission, create record
        const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/applyLeave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empid: leaveEmpid,
            tlID: leaveTL,
            reason: leaveReason,
            leave_type: leaveType,
            st_date: leaveStart,
            end_date: leaveEnd,
          }),
        });

        const data = await res.json();
        if (res.ok && data.leave_id) {
          leaveId = data.leave_id;
          setLeaveIdForOtp(leaveId);
        } else {
          showToast(data.message || data.error || "Failed to apply leave", "error");
          return;
        }
      }

      // start or resend OTP flow for leave
      updateOtpType("Leave");
      setOtpLoading(true);
      await generateOTP({ employee_id: leaveEmpid, type: "leave", refid: leaveId });
    } catch (err) {
      console.error("Leave apply error:", err);
      showToast("Failed to submit leave. Please try again.", "error");
    } finally {
      setLeaveLoading(false);
    }
  };

 
  const Admincheck = async (e) => {
    e.preventDefault();

    if (!adminEmpid.trim() || !password.trim()) {
      showToast("Please enter both Employee ID and Password", "error");
      return;
    }

    setAdminLoading(true);
      try {
      const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          empid: adminEmpid,
          password: password,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("webtoken", data.token);
        showToast(data.message || "Login successful!", "success");
        setTimeout(() => {
          navigate("/admin");
        }, 500);
      } else {
        showToast(data.message || "Invalid credentials", "error");
      }
    } catch {
      showToast("Server error. Please try again later.", "error");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative overflow-hidden">
      {/* Animated Background Elements */}
      <BackgroundAnimation />

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        Adminshow={Adminshow}
        setAdminshow={setAdminshow}
        adminEmpid={adminEmpid}
        setAdminEmpid={setAdminEmpid}
        password={password}
        setPassword={setPassword}
        adminLoading={adminLoading}
        onAdminSubmit={Admincheck}
      />

      {/* apply leave button (top left) */}
      <button
        onClick={() => setShowLeaveForm(true)}
        className="absolute top-5 left-5 z-20 bg-[#FF9500] text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:bg-[#FF8500] transition-all duration-300"
      >
        Apply Leave
      </button>

      {/* Leave Form Modal */}
      <LeaveForm
        showLeaveForm={showLeaveForm}
        setShowLeaveForm={setShowLeaveForm}
        leaveEmpid={leaveEmpid}
        setLeaveEmpid={setLeaveEmpid}
        leaveName={leaveName}
        setLeaveName={setLeaveName}
        leaveReason={leaveReason}
        setLeaveReason={setLeaveReason}
        leaveStart={leaveStart}
        setLeaveStart={setLeaveStart}
        leaveEnd={leaveEnd}
        setLeaveEnd={setLeaveEnd}
        leaveType={leaveType}
        setLeaveType={setLeaveType}
        leaveTL={leaveTL}
        setLeaveTL={setLeaveTL}
        leaveLoading={leaveLoading}
        employeesLoading={employeesLoading}
        employees={employees}
        leaveIdForOtp={leaveIdForOtp}
        onLeaveSubmit={handleLeaveSubmit}
      />

      {/* Attendance Form */}
      <AttendanceForm
        empid={empid}
        setEmpid={setEmpid}
        department={department}
        setDepartment={setDepartment}
        employees={employees}
        employeesLoading={employeesLoading}
        status={status}
        setStatus={setStatus}
        authType={authType}
        setAuthType={setAuthType}
        location={location}
        locationLoading={locationLoading}
        loading={loading}
        otpLoading={otpLoading}
        formDisabled={showOtpModal}
        onSubmit={markattandance}
      />

      {/* OTP Verification Modal */}
      <PINModal
        showPINModal={showOtpModal}
        setShowPINModal={setShowOtpModal}
        otp={otp}
        setOtp={setOtp}
        pinLoading={loading}
        otpTimer={otpTimer}
        canResendOtp={canResendOtp}
        onPINSubmit={verifyAndMarkAttendance}
        onResendOtp={resendOTP}
      />
    </div>
  );
}
