import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function HR() {
    const navigate = useNavigate();
    const [empid, setEmpid] = useState("");
    const [password, setPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [token, setToken] = useState(sessionStorage.getItem("hrToken") || "");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const [leaves, setLeaves] = useState([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [employees, setEmployees] = useState([]);

    const [viewing, setViewing] = useState(null);
    const [leaveDetails, setLeaveDetails] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
    };

    useEffect(() => {
        if (token) {
            fetchEmployees();
            fetchLeaves();
        }
    }, [token]);

    const fetchEmployees = async () => {
        try {
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/employees-for-attendance");
            const data = await res.json();
            if (res.ok && data.Empdata) {
                setEmployees(data.Empdata);
            }
        } catch (err) {
            console.error("error loading employees", err);
        }
    };

    const fetchLeaves = async () => {
        if (!token) return;
        setLoadingLeaves(true);
        try {
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/hr-all-leaves", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (res.ok && data.data) {
                setLeaves(data.data);
            } else {
                showToast(data.message || "Failed to fetch leaves", "error");
            }
        } catch (err) {
            showToast("Server error while fetching leaves", "error");
            console.error(err);
        } finally {
            setLoadingLeaves(false);
        }
    };

    const login = async (e) => {
        e.preventDefault();
        if (!empid.trim() || !password.trim()) {
            showToast("Please enter both Employee ID and Password", "error");
            return;
        }
        setLoginLoading(true);
        try {
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/HR", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emp_id: empid, password }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token);
                sessionStorage.setItem("hrToken", data.token);
                showToast("Logged in successfully", "success");
            } else {
                showToast(data.message || "Invalid credentials", "error");
            }
        } catch (err) {
            showToast("Server error. Please try again later.", "error");
        } finally {
            setLoginLoading(false);
        }
    };

    const openLeave = async (leave) => {
        setViewing(leave.id);
        setLeaveDetails(leave);
        // Fetch HR leave summary
        try {
            const res = await fetch(`https://attendance-system-oe9j.onrender.com/emp/hr-leave-summary/${leave.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (res.ok) {
                // Merge summary data with leave details
                setLeaveDetails(prev => ({ ...prev, ...data }));
            } else {
                showToast(data.message || "Failed to fetch summary", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error fetching leave summary", "error");
        }
    };

    const doAction = async (action) => {
        if (!viewing) return;
        setActionLoading(true);
        try {
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/hr-leave-action", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ leave_id: viewing, action }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || `Leave ${action}`, "success");
                // refresh list
                fetchLeaves();
                setLeaveDetails(null);
                setViewing(null);
            } else {
                showToast(data.message || "Failed to perform action", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Server error during action", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const logout = () => {
        sessionStorage.removeItem("hrToken");
        setToken("");
        setLeaves([]);
        setViewing(null);
        setLeaveDetails(null);
        navigate("/");
    };

    const getEmpInfo = (id) => {
        return employees.find((e) => e.id === id) || {};
    };

    const getStatusBadge = (status) => {
        if (status === "Approved") return <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm">Approved</span>;
        if (status === "Rejected") return <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">Rejected</span>;
        return <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm">Pending</span>;
    };

    if (!token) {
        // login form
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 px-4">
                {toast.show && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
                )}
                <h2 className="text-2xl font-bold text-[#FF9500] mb-6">HR Login</h2>
                <form onSubmit={login} className="space-y-4 w-full max-w-sm">
                    <input
                        type="text"
                        placeholder="HR ID"
                        value={empid}
                        onChange={(e) => setEmpid(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full bg-[#FF9500] text-white py-2 rounded-xl hover:bg-[#FF8500] disabled:opacity-50"
                    >
                        {loginLoading ? <LoadingSpinner /> : "Login"}
                    </button>
                </form>
            </div>
        );
    }

    // authenticated view
    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative">
            {toast.show && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
            )}
            <button
                onClick={logout}
                className="absolute top-5 right-5 bg-gray-300 px-3 py-1 rounded-xl hover:bg-gray-400"
            >
                Logout
            </button>
            <h1 className="text-2xl font-bold text-[#FF9500] mb-4">Leave Requests (HR Review)</h1>
            {loadingLeaves ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#FF9500] text-white">
                                <th className="px-6 py-4 text-left font-semibold">Emp ID</th>
                                <th className="px-6 py-4 text-left font-semibold">Name</th>
                                <th className="px-6 py-4 text-left font-semibold">Start</th>
                                <th className="px-6 py-4 text-left font-semibold">End</th>
                                <th className="px-6 py-4 text-left font-semibold">TL Status</th>
                                <th className="px-6 py-4 text-left font-semibold">HR Status</th>
                                <th className="px-6 py-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-black">
                                        No leave requests to review
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((lv) => {
                                    const emp = getEmpInfo(lv.employee_id);
                                    return (
                                        <tr key={lv.id} className="bg-cream-50/50 hover:bg-cream-100/80 transition-colors duration-200 border-b border-gray-200">
                                            <td className="px-6 py-4 text-black">{emp.employee_id || "-"}</td>
                                            <td className="px-6 py-4 text-black">{emp.name || "-"}</td>
                                            <td className="px-6 py-4 text-black">{lv.start_date}</td>
                                            <td className="px-6 py-4 text-black">{lv.end_date}</td>
                                            <td className="px-6 py-4 text-black">{getStatusBadge(lv.tl_status)}</td>
                                            <td className="px-6 py-4 text-black">{getStatusBadge(lv.hr_status)}</td>
                                            <td className="px-6 py-4 text-center">
                                                {lv.hr_status === "Pending" ? (
                                                    <button
                                                        onClick={() => openLeave(lv)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        Review
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-500">Reviewed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* leave detail modal */}
            {leaveDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-[#FF9500] mb-4">Leave Details</h2>
                        <div className="space-y-2 mb-4">
                            <p><strong>Employee ID:</strong> {leaveDetails.employee?.empId || getEmpInfo(leaveDetails.employee_id)?.employee_id}</p>
                            <p><strong>Name:</strong> {leaveDetails.employee?.name || getEmpInfo(leaveDetails.employee_id)?.name}</p>
                            <p><strong>Type:</strong> {leaveDetails.employee?.type || getEmpInfo(leaveDetails.employee_id)?.employee_type}</p>
                            <p><strong>Leave Type:</strong> {leaveDetails.leave_type}</p>
                            <p><strong>From:</strong> {leaveDetails.currentRequest?.startDate || leaveDetails.start_date}</p>
                            <p><strong>To:</strong> {leaveDetails.currentRequest?.endDate || leaveDetails.end_date}</p>
                            
                            <p><strong>Reason:</strong> {leaveDetails.currentRequest?.reason || leaveDetails.reason}</p>
                            {leaveDetails.requestMonth && (
                                <>
                                    <hr className="my-2" />
                                    <h3 className="font-bold text-lg">Leave Summary</h3>
                                    <p><strong>Total Applied Leaves (this month):</strong> {leaveDetails.requestMonth.totalLeaves}</p>
                                    <p><strong>Paid Leave Balance:</strong> {leaveDetails.requestMonth.remainingPaidLeaves}</p>
                                    <p className="italic text-sm">{leaveDetails.requestMonth.suggestion}</p>
                                </>
                            )}
                            <hr className="my-2" />
                            <p><strong>TL Status:</strong> {getStatusBadge(leaveDetails.tl_status)}</p>
                            <p><strong>HR Status:</strong> {getStatusBadge(leaveDetails.hr_status)}</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setLeaveDetails(null); setViewing(null); }}
                                className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400"
                            >
                                Close
                            </button>
                            {leaveDetails.hr_status === "Pending" && (
                                <>
                                    <button
                                        onClick={() => doAction("Approved")}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => doAction("Rejected")}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
