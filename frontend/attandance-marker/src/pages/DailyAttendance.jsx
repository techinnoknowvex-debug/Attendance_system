import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import logo from "../assets/logo.png";

export default function DailyAttendance() {
  const location = useLocation();
  const navigate = useNavigate();

  const { dailyData: initialDailyData, selectedDate: initialSelectedDate } =
    location.state || {};

  const [dailyData, setDailyData] = useState(initialDailyData);
  const [selectedDate] = useState(initialSelectedDate);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 Redirect to admin if page reloads or accessed directly
  useEffect(() => {
    if (!location.state || !initialDailyData || !initialSelectedDate) {
      navigate("/admin", { replace: true });
    }
  }, [location.state, initialDailyData, initialSelectedDate, navigate]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const handleRefresh = async () => {
    if (!selectedDate) return;

    setIsRefreshing(true);
    const webtoken = sessionStorage.getItem("webtoken");

    try {
      const res = await fetch(
        "https://attendance-system-oe9j.onrender.com/emp/dailyattandacetable",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webtoken}`,
          },
          body: JSON.stringify({ date: selectedDate }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch daily sheet");
      }

      const data = await res.json();
      setDailyData(data);
      showToast("Daily attendance sheet refreshed!", "success");
    } catch (err) {
      showToast("Failed to load daily sheet. Please try again.", "error");
      console.log("Error", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!dailyData) return null;

  const departments = [
    "All",
    ...new Set(dailyData.data.map((emp) => emp.department)),
  ];

  const filteredData =
    selectedDepartment === "All"
      ? dailyData.data
      : dailyData.data.filter(
          (emp) => emp.department === selectedDepartment
        );

  // Calculate statistics
  const totalEmployees = filteredData.length;
  const presentCount = filteredData.filter(
    (emp) => emp.status?.toLowerCase() === "logged in"
  ).length;
  const absentCount = filteredData.filter(
    (emp) => emp.status?.toLowerCase() === "absent"
  ).length;
  const workFromHomeCount = filteredData.filter(
    (emp) => emp.status?.toLowerCase() === "work from home"
  ).length;

  const handlePrint = () => {
    window.print();
    showToast("Printing page...", "success");
  };

  const handleDownload = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Status",
      "Login Time",
      "Logout Time",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map(
        (emp) =>
          `"${emp.employeeId}","${emp.name}","${emp.department}","${emp.status}","${
            emp.loginTime
              ? new Date(emp.loginTime).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "N/A"
          }","${
            emp.logoutTime
              ? new Date(emp.logoutTime).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "N/A"
          }"`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_attendance_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast("Daily attendance sheet downloaded as CSV!", "success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative overflow-hidden pt-20 pb-8 px-4">
      <BackgroundAnimation />

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Logo */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
        <h1 className="text-2xl font-bold text-[#FF9500]">
          INNOKNOWVEX
        </h1>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-5 z-10 bg-cream-100/80 hover:bg-cream-200 text-black px-3 py-2 rounded-xl font-semibold shadow-lg transition-all"
      >
        Back to Admin
      </button>

      {/* 🔥 Single Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="absolute top-5 right-5 z-10 bg-[#FF9500] hover:bg-[#FF8500] disabled:bg-gray-400 text-white px-4 py-2 rounded-xl font-semibold shadow-lg transition-all"
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>

      <div className="relative z-10 w-full max-w-6xl mx-auto mt-10">
        <div className="glass-effect p-6 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 mb-6">
          <h2 className="text-3xl font-bold text-[#FF9500] mb-4">
            Daily Attendance Sheet
          </h2>
          <p className="text-gray-600 mb-4">
            Date:{" "}
            <span className="font-semibold">
              {new Date(selectedDate).toLocaleDateString()}
            </span>
          </p>
          {/* Department Filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Filter by Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9500]"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-effect rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FF9500]/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Employee ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Login Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">
                    Logout Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((emp, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">{emp.employeeId}</td>
                    <td className="px-6 py-4">{emp.name}</td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full font-medium inline-block ${
                        emp.status?.toLowerCase() === "logged in"
                          ? "bg-green-100 text-green-800"
                          : emp.status?.toLowerCase() === "absent"
                          ? "bg-red-100 text-red-800"
                          : emp.status?.toLowerCase() === "work from home"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {emp.loginTime
                        ? new Date(emp.loginTime).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {emp.logoutTime
                        ? new Date(emp.logoutTime).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="glass-effect rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 p-6 mt-6">
          <h3 className="text-xl font-bold text-[#FF9500] mb-4">
            Summary - {selectedDepartment === "All" ? "All Departments" : selectedDepartment}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 font-semibold">Total Employees</p>
              <p className="text-2xl font-bold text-blue-600">{totalEmployees}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 font-semibold">Present</p>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <p className="text-sm text-gray-600 font-semibold">Absent</p>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
              <p className="text-sm text-gray-600 font-semibold">Work From Home</p>
              <p className="text-2xl font-bold text-blue-400">{workFromHomeCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}