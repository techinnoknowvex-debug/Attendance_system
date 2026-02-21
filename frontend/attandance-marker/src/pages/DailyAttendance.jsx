import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import logo from "../assets/logo.png";

export default function DailyAttendance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dailyData: initialDailyData, selectedDate: initialSelectedDate } = location.state || {};
  const [dailyData, setDailyData] = useState(initialDailyData);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [refreshDate, setRefreshDate] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const handleRefresh = async (dateToFetch = refreshDate) => {
    const dateParam = dateToFetch || selectedDate;
    if (!dateParam) {
      showToast("Please select a date", "error");
      return;
    }

    setIsRefreshing(true);
    const webtoken = sessionStorage.getItem("webtoken");
    try {
      const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/dailyattandacetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${webtoken}`
        },
        body: JSON.stringify({
          date: dateParam
        })
      });

      if (!res.ok) {
        throw new Error("Failed to fetch daily sheet");
      }

      const data = await res.json();
      setDailyData(data);
      setSelectedDate(dateParam);
      showToast("Daily attendance sheet refreshed!", "success");
    } catch (err) {
      showToast("Failed to load daily sheet. Please try again.", "error");
      console.log("Error", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!dailyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative overflow-hidden pt-20 pb-8 px-4">
        <BackgroundAnimation />

        {/* Toast Notification */}
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
          <h1 className="text-2xl font-bold text-[#FF9500]">INNOKNOWVEX</h1>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate("/admin")}
          className="absolute top-5 left-5 z-10 bg-cream-100/80 hover:bg-cream-200 text-black px-3 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm sm:px-4 sm:text-base"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Admin
        </button>

        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold text-[#FF9500] mb-6">No Data Available</h1>
          <p className="text-gray-600 mb-8">Session data was lost. Please select a date to refresh the daily attendance sheet.</p>
          
          <div className="glass-effect p-8 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 max-w-md mx-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-3">Select Date</label>
              <input
                type="date"
                value={refreshDate}
                onChange={(e) => setRefreshDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all"
              />
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full bg-[#FF9500] hover:bg-[#FF8500] disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get unique departments
  const departments = ["All", ...new Set(dailyData.data.map(emp => emp.department))];

  // Filter data based on selected department
  const filteredData = selectedDepartment === "All" 
    ? dailyData.data 
    : dailyData.data.filter(emp => emp.department === selectedDepartment);

  const handlePrint = () => {
    window.print();
    showToast("Printing page...", "success");
  };

  const handleDownload = () => {
    const headers = ["Employee ID", "Name", "Department", "Status", "Login Time", "Logout Time"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map(emp => 
        `"${emp.employeeId}","${emp.name}","${emp.department}","${emp.status}","${emp.loginTime ? new Date(emp.loginTime).toLocaleTimeString() : 'N/A'}","${emp.logoutTime ? new Date(emp.logoutTime).toLocaleTimeString() : 'N/A'}"`
      )
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

     
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
        <h1 className="text-2xl font-bold text-[#FF9500]">INNOKNOWVEX</h1>
      </div>


      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-5 z-10 bg-cream-100/80 hover:bg-cream-200 text-black px-3 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm sm:px-4 sm:text-base"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Admin
      </button>

      
      <button
        onClick={() => handleRefresh(selectedDate)}
        disabled={isRefreshing}
        className="absolute top-5 right-5 z-10 bg-[#FF9500] hover:bg-[#FF8500] disabled:bg-gray-400 text-white px-3 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 text-sm sm:px-4 sm:text-base"
      >
        {isRefreshing ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </>
        )}
      </button>

      
      <div className="relative z-10 w-full max-w-6xl mx-auto">
       
        <div className="glass-effect p-6 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[#FF9500] mb-2">Daily Attendance Sheet</h2>
              <p className="text-gray-600">Date: <span className="font-semibold">{new Date(selectedDate).toLocaleDateString()}</span></p>
              <p className="text-gray-600">Showing: <span className="font-semibold">{filteredData.length}</span> of <span className="font-semibold">{dailyData.data.length}</span> Employees</p>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={handlePrint}
                className="bg-[#FF9500] hover:bg-[#FF8500] text-white px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 00-2 2v2a2 2 0 002 2h6a2 2 0 002-2v-2a2 2 0 00-2-2z" />
                </svg>
                Print
              </button>
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="glass-effect p-6 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-black mb-2">Filter by Department</label>
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all appearance-none bg-cream-100"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

       
        <div className="glass-effect rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FF9500]/20 border-b border-cream-300/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Employee ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Login Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-[#FF9500]">Logout Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredData && filteredData.length > 0 ? (
                  filteredData.map((emp, index) => (
                    <tr
                      key={index}
                      className={`border-b border-cream-300/20 hover:bg-cream-100/50 transition-colors ${
                        index % 2 === 0 ? "bg-white/50" : "bg-cream-50/30"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">{emp.employeeId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{emp.department}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          emp.status === "Logged In"
                            ? "bg-green-100 text-green-800"
                            : emp.status === "Absent"
                            ? "bg-red-100 text-red-800"
                            : emp.status === "Work From Home"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {emp.loginTime ? (
                          <span className="font-medium text-green-600">
                           {new Date(emp.loginTime).toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {emp.logoutTime ? (
                          <span className="font-medium text-red-600">
                            {new Date(emp.logoutTime).toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No attendance data found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

    
        {filteredData && filteredData.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mt-6">
            <div className="glass-effect p-6 rounded-2xl backdrop-blur-lg border border-cream-300/20">
              <p className="text-gray-600 text-sm mb-2">Total Employees</p>
              <p className="text-3xl font-bold text-[#FF9500]">{filteredData.length}</p>
            </div>
            <div className="glass-effect p-6 rounded-2xl backdrop-blur-lg border border-cream-300/20">
              <p className="text-gray-600 text-sm mb-2">Logged In</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredData.filter(emp => emp.status === "Logged In").length}
              </p>
            </div>
            <div className="glass-effect p-6 rounded-2xl backdrop-blur-lg border border-cream-300/20">
              <p className="text-gray-600 text-sm mb-2">Work From Home</p>
              <p className="text-3xl font-bold text-blue-600">
                {filteredData.filter(emp => emp.status === "Work From Home").length}
              </p>
            </div>
            <div className="glass-effect p-6 rounded-2xl backdrop-blur-lg border border-cream-300/20">
              <p className="text-gray-600 text-sm mb-2">Absent</p>
              <p className="text-3xl font-bold text-red-600">
                {filteredData.filter(emp => emp.status === "Absent").length}
              </p>
            </div>
          </div>
        )}
      </div>

     
      <style>{`
        @media print {
          body {
            background: white;
          }
          .bg-gradient-to-br {
            background: white !important;
          }
          button {
            display: none;
          }
          .absolute {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
