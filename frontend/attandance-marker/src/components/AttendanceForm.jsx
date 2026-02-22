import logo from "../assets/logo.png";
import LocationStatus from "./LocationStatus";

export default function AttendanceForm({
  empid,
  setEmpid,
  department,
  setDepartment,
  employees,
  employeesLoading,
  status,
  setStatus,
  authType,
  setAuthType,
  location,
  locationLoading,
  loading,
  otpLoading,
  onSubmit
}) {
 
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))].sort();


  const filteredEmployees = department
    ? employees
        .filter(emp => emp.department === department)
        .sort((a, b) => {
          const last4A = parseInt(a.employee_id.slice(-4)) || 0;
          const last4B = parseInt(b.employee_id.slice(-4)) || 0;
          return last4A - last4B;
        })
    : [];
  return (
    <div className="relative z-10 w-full max-w-md mx-4">
      <div className="glass-effect p-6 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20">
        {/* Logo and Company Name */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={logo} alt="Company Logo" className="h-16 w-16 object-contain" />
          <h1 className="text-3xl font-bold text-[#FF9500]">INNOKNOWVEX</h1>
        </div>
        

        <LocationStatus locationLoading={locationLoading} location={location} />

        <h2 className="text-3xl font-bold text-center mb-2 text-[#FF9500]">
          Mark Your Attendance
        </h2>
        <p className="text-center text-black mb-5 text-sm">Quick and secure attendance tracking</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Department</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all appearance-none bg-cream-100"
                disabled={employeesLoading}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Employee</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                value={empid}
                onChange={(e) => setEmpid(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all appearance-none bg-cream-100"
                disabled={!department || employeesLoading}
              >
                <option value="">Select Employee</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
         
          <div>
            <label className="block text-sm font-medium text-black mb-1">Status</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  if (e.target.value !== "Present") {
                    setAuthType("");
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent transition-all appearance-none bg-cream-100"
              >
                <option value="">Select Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Work From Home">Work From Home</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Attendance Type</label>
            {status === "Present" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className={`relative flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  authType === "login" 
                    ? "border-[#FF9500] bg-[#FFF8F0] shadow-md" 
                    : "border-gray-300 hover:border-gray-400 bg-cream-100"
                }`}>
                  <input
                    type="radio"
                    name="auth"
                    value="login"
                    checked={authType === "login"}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className={`w-6 h-6 ${authType === "login" ? "text-[#FF9500]" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span className={`font-medium ${authType === "login" ? "text-[#FF9500]" : "text-black"}`}>Login</span>
                  </div>
                </label>

                <label className={`relative flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  authType === "logout" 
                    ? "border-[#FF9500] bg-[#FFF8F0] shadow-md" 
                    : "border-gray-300 hover:border-gray-400 bg-cream-100"
                }`}>
                  <input
                    type="radio"
                    name="auth"
                    value="logout"
                    checked={authType === "logout"}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className={`w-6 h-6 ${authType === "logout" ? "text-[#FF9500]" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className={`font-medium ${authType === "logout" ? "text-[#FF9500]" : "text-black"}`}>Logout</span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="bg-cream-100 p-3 rounded-xl text-sm text-gray-600 text-center">
                {status === "Work From Home" ? "Work From Home - No location required" : "Select Present status to choose Login/Logout"}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (status !== "Work From Home" && (locationLoading || !location.lat))}
            className="w-full bg-[#FF9500] hover:bg-[#FF8500] text-white py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading || otpLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark Attendance
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

