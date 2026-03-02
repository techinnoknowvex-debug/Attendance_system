import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TL() {
    const navigate = useNavigate();
    const [empid, setEmpid] = useState("");
    const [password, setPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [token, setToken] = useState(sessionStorage.getItem("tlToken") || "");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    const [leaves, setLeaves] = useState([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [employees, setEmployees] = useState([]); // to map id->data

    const [viewing, setViewing] = useState(null); // leave id currently viewing
    const [leaveDetails, setLeaveDetails] = useState(null);
    const [selectedLeave, setSelectedLeave] = useState(null); // full leave record
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
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/all_Leaves", {
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
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/TL", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emp_id: empid, password }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
                setToken(data.token);
                sessionStorage.setItem("tlToken", data.token);
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
        setSelectedLeave(leave);
        try {
            const res = await fetch(`https://attendance-system-oe9j.onrender.com/emp/calculatedLeave/${leave.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (res.ok) {
                setLeaveDetails(data);
            } else {
                showToast(data.message || "Failed to fetch details", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error fetching leave details", "error");
        }
    };

    const doAction = async (action) => {
        if (!viewing) return;
        setActionLoading(true);
        try {
            const res = await fetch("https://attendance-system-oe9j.onrender.com/emp/leave-action", {
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
                setSelectedLeave(null);
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
        sessionStorage.removeItem("tlToken");
        setToken("");
        setLeaves([]);
        setViewing(null);
        setLeaveDetails(null);
        setSelectedLeave(null);
        navigate("/");
    };

    const getEmpInfo = (id) => {
        return employees.find((e) => e.id === id) || {};
    };

    if (!token) {
        // login form
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 px-4">
                {toast.show && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
                )}
                <h2 className="text-2xl font-bold text-[#FF9500] mb-6">Team Leader Login</h2>
                <form onSubmit={login} className="space-y-4 w-full max-w-sm">
                    <input
                        type="text"
                        placeholder="Employee ID"
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
            <h1 className="text-2xl font-bold text-[#FF9500] mb-4">Leave Requests</h1>
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
                                <th className="px-6 py-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-black">
                                        No leave requests
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
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openLeave(lv)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    View
                                                </button>
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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
                        <h2 className="text-2xl font-bold text-[#FF9500] mb-4">Leave Details</h2>
                        <div className="space-y-2 mb-4">
                            <p><strong>Employee ID:</strong> {leaveDetails.employee.empId}</p>
                            <p><strong>Name:</strong> {leaveDetails.employee.name}</p>
                            <p><strong>Type:</strong> {leaveDetails.employee.type}</p>
                            <p><strong>From:</strong> {leaveDetails.currentRequest.startDate}</p>
                            <p><strong>To:</strong> {leaveDetails.currentRequest.endDate}</p>
                            <p><strong>Reason:</strong> {leaveDetails.currentRequest.reason}</p>
                            <hr className="my-2" />
                            <p><strong>Total applied Leaves:</strong> {leaveDetails.requestMonth.totalLeaves}</p>
                            <p><strong>paid leave balance:</strong> {leaveDetails.requestMonth.remainingPaidLeaves}</p>
                            <p className="italic text-sm">{leaveDetails.requestMonth.suggestion}</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setLeaveDetails(null); setViewing(null); setSelectedLeave(null); }}
                                className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400"
                            >
                                Close
                            </button>
                            {/* Disable action buttons if already reviewed by TL */}
                            <button
                                onClick={() => doAction("Approved")}
                                disabled={actionLoading || (selectedLeave && selectedLeave.tl_status && selectedLeave.tl_status !== "Pending")}
                                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => doAction("Rejected")}
                                disabled={actionLoading || (selectedLeave && selectedLeave.tl_status && selectedLeave.tl_status !== "Pending")}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
