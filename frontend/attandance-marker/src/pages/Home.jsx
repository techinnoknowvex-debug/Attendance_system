import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import AdminLoginModal from "../components/AdminLoginModal";
import AttendanceForm from "../components/AttendanceForm";
import PINModal from "../components/PINModal";



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
        const res = await fetch("http://localhost:5000/emp/employees-for-attendance", {
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


  const generateOTP = async () => {
    try {
      setOtpLoading(true);

      const res = await fetch("http://localhost:5000/emp/generateOTP", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: empid }),
      });

      const data = await res.json();
      
      if (res.ok) {
        showToast(data.message || "OTP sent to your email!", "success");
        setShowOtpModal(true);
        setOtp("");
        setOtpTimer(60);
        setCanResendOtp(false);
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
    await generateOTP();
  };


  const verifyAndMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      if (!otp.trim()) {
        showToast("Please enter the OTP", "error");
        return;
      }

      setLoading(true);

     
      const verifyRes = await fetch("http://localhost:5000/emp/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: empid, otp }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        showToast(verifyData.error || verifyData.message || "OTP verification failed. Please try again.", "error");
        setOtp("");
        setLoading(false);
        return;
      }

      
      const markRes = await fetch("http://localhost:5000/emp/markattandance", {
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

   
    await generateOTP();
  };

 
  const Admincheck = async (e) => {
    e.preventDefault();

    if (!adminEmpid.trim() || !password.trim()) {
      showToast("Please enter both Employee ID and Password", "error");
      return;
    }

    setAdminLoading(true);
      try {
      const res = await fetch("http://localhost:5000/emp/admin", {
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
