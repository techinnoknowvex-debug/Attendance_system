import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import AdminLoginModal from "../components/AdminLoginModal";
import AttendanceForm from "../components/AttendanceForm";
import PINModal from "../components/PINModal";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  const [pin, setPin] = useState("");
  const [askPin, setAskPin] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by your browser", "error");
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);


  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const res = await fetch("https://attendance-system-29fc.onrender.com/emp/employees-for-attendance", {
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


  const pinverification = async (e) => {
    e.preventDefault();
    try {
      if (!pin.trim()) {
        showToast("Please enter your PIN", "error");
        return;
      }

      setLoading(true);
     
      const verifyRes = await fetch("https://attendance-system-29fc.onrender.com/emp/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, employeeId: empid }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        showToast(verifyData.message || "PIN verification failed. Please try again.", "error");
        setPin("");
        setLoading(false);
        return;
      }

     
      const res = await fetch("https://attendance-system-29fc.onrender.com/emp/markattandance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empid,
          status,
          authType: authType,
          latitude: location.lat,
          longitude: location.lon,
          accuracy: location.accuracy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Attendance marked successfully!", "success");
        setEmpid("");
        setDepartment("");
        setStatus("");
        setAuthType("");
        setPin("");
        setAskPin(false);
      } else {
        showToast(data.message || "Something went wrong. Please try again.", "error");
        setPin("");
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      showToast("PIN verification failed. Please try again.", "error");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  // Attendance submit
  const markattandance = async (e) => {
    e.preventDefault();

    if (!location.lat || !location.lon) {
      showToast("Please wait for location to be detected", "error");
      return;
    }
  
    if (authType === "" && status=="Present") {
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
    
    // Open PIN modal instead of calling API directly
    setAskPin(true);
  };

 
  const Admincheck = async (e) => {
    e.preventDefault();

    if (!adminEmpid.trim() || !password.trim()) {
      showToast("Please enter both Employee ID and Password", "error");
      return;
    }

    setAdminLoading(true);
      try {
      const res = await fetch("https://attendance-system-29fc.onrender.com/emp/admin", {
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

      {/* PIN Verification Modal */}
      <PINModal
        showPINModal={askPin}
        setShowPINModal={setAskPin}
        pin={pin}
        setPin={setPin}
        pinLoading={loading}
        onPINSubmit={pinverification}
      />
    </div>
  );
}
