export default function LeaveForm({
  showLeaveForm,
  setShowLeaveForm,
  leaveEmpid,
  setLeaveEmpid,
  leaveName,
  setLeaveName,
  leaveReason,
  setLeaveReason,
  leaveStart,
  setLeaveStart,
  leaveEnd,
  setLeaveEnd,
  leaveType,
  setLeaveType,
  leaveTL,
  setLeaveTL,
  leaveLoading,
  employeesLoading,
  employees,
  leaveIdForOtp,
  onLeaveSubmit
}) {
  if (!showLeaveForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-[#FF9500] mb-4">Leave Application</h2>
        <form onSubmit={onLeaveSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Employee</label>
            <select
              value={leaveEmpid}
              onChange={(e) => {
                setLeaveEmpid(e.target.value);
                const emp = employees.find(x => x.employee_id === e.target.value);
                setLeaveName(emp ? emp.name : "");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none"
              required
              disabled={employeesLoading}
            >
              <option value="">{employeesLoading ? "Loading..." : "Select employee"}</option>
              {employees
                .filter(emp => emp.role === "Employee")
                .map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
            </select>
          </div>

          {leaveName && (
            <div>
              <label className="block text-sm font-medium text-black mb-1">Name</label>
              <input
                type="text"
                value={leaveName}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-gray-100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-1">Reason</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-black mb-1">Start Date</label>
              <input
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-black mb-1">End Date</label>
              <input
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            >
              <option>Sick Leave</option>
              <option>Casual Leave</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Team Leader</label>
            <select
              value={leaveTL}
              onChange={(e) => setLeaveTL(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              required
              disabled={employeesLoading}
            >
              <option value="">{employeesLoading ? "Loading..." : "Select TL"}</option>
              {employees
                .filter(emp => emp.role === "TeamLeader")
                .map(emp => (
                  <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                    {emp.name} ({emp.employee_id})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowLeaveForm(false)}
              className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={leaveLoading}
              className="px-4 py-2 bg-[#FF9500] text-white rounded-xl hover:bg-[#FF8500] disabled:opacity-50"
            >
              {leaveLoading ? "Processing..." : leaveIdForOtp ? "Resend OTP" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
