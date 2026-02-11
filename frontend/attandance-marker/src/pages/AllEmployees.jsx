import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AllEmployees() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", department: "" });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
    };

    useEffect(() => {
        fetchAllEmployees();
    }, []);

    const fetchAllEmployees = async () => {
        const webtoken = sessionStorage.getItem("webtoken");
        setLoading(true);
        try {
            const res = await fetch("https://attendance-system-k7rg.onrender.com/emp/allemp", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${webtoken}`
                }
            });

            const result = await res.json();
            
            if (res.ok && result.Empdata) {
                setEmployees(result.Empdata);
                console.log("employees: ",result.Empdata);
            } else {
                showToast(result.message || "Failed to fetch employees", "error");
            }
        } catch (error) {
            showToast("Server error. Please try again later.", "error");
            console.error("Error fetching employees:", error);
        } finally {
            setLoading(false);
        }
    };

    const startEditEmp = (emp) => {
        setEditingId(emp.id);
        setEditForm({ name: emp.name || "", department: emp.department || "" });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: "", department: "" });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const saveEmp = async (id, Empid) => {
        const webtoken = sessionStorage.getItem("webtoken");
        try {
            const res = await fetch("https://attendance-system-k7rg.onrender.com/emp/update/${id}", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${webtoken}`,
                },
                body: JSON.stringify({
                    name: editForm.name,
                    department: editForm.department,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                showToast(result.message || `Employee ${Empid} updated successfully`, "success");
                setEmployees((prev) =>
                    prev.map((emp) =>
                        emp.id === id ? { ...emp, name: editForm.name, department: editForm.department } : emp
                    )
                );
                cancelEdit();
            } else {
                showToast(result.message || "Failed to update employee", "error");
            }
        } catch (error) {
            showToast("Server error. Please try again later.", "error");
        }
    };

    const deleteEmp = async (id, Empid) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete employee ${Empid}?`
          );
        
          if (!confirmDelete) return;

        const webtoken = sessionStorage.getItem("webtoken");
        try{
        const res = await fetch("https://attendance-system-k7rg.onrender.com/emp/delete/${id}", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${webtoken}`
            }
          });
  
          const deleteResult = await res.json();
          
          if (res.ok) {
            showToast(deleteResult.message || "Employee deleted successfully!", "success");
            setEmployees(prev => prev.filter(emp => emp.id !== id));
          } else {
            showToast(deleteResult.message || "Failed to delete employee", "error");
          }
        } catch (error) {
          showToast("Server error. Please try again later.", "error");
        }
    }


    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative overflow-hidden py-12 px-4">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-light-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                    <div className="absolute top-40 right-10 w-72 h-72 bg-light-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-light-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>

                {/* Toast Notification */}
                {toast.show && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ ...toast, show: false })}
                    />
                )}

                {/* Back Button */}
                <button
                    onClick={() => navigate("/admin")}
                    className="absolute top-5 left-5 z-10 bg-cream-100/80 hover:bg-cream-200 text-black px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Admin
                </button>

                <div className="relative z-10 w-full max-w-6xl">
                    <div className="glass-effect p-8 rounded-3xl shadow-2xl backdrop-blur-lg border border-cream-300/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#FF9500] rounded-xl">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-[#FF9500]">
                                All Employees
                            </h1>
                        </div>
                        <p className="text-black mb-6 text-sm">List of all registered employees</p>

                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[#FF9500] text-white">
                                            <th className="px-6 py-4 text-left font-semibold rounded-tl-xl">Employee ID</th>
                                            <th className="px-6 py-4 text-left font-semibold">Employee Name</th>
                                            <th className="px-6 py-4 text-left font-semibold">Department</th>
                                            <th className="px-6 py-4 text-center font-semibold rounded-tr-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-8 text-center text-black">
                                                    No employees found
                                                </td>
                                            </tr>
                                        ) : (
                                            employees.map((emp, index) => (
                                                <tr
                                                    key={emp._id || index}
                                                    className="bg-cream-50/50 hover:bg-cream-100/80 transition-colors duration-200 border-b border-gray-200"
                                                >
                                                    <td className="px-6 py-4 text-black font-medium">{emp.employee_id}</td>
                                                    <td className="px-6 py-4 text-black">
                                                        {editingId === emp.id ? (
                                                            <input
                                                                type="text"
                                                                name="name"
                                                                value={editForm.name}
                                                                onChange={handleEditChange}
                                                                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-black"
                                                            />
                                                        ) : (
                                                            emp.name
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-black">
                                                        {editingId === emp.id ? (
                                                            <input
                                                                type="text"
                                                                name="department"
                                                                value={editForm.department}
                                                                onChange={handleEditChange}
                                                                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-black"
                                                            />
                                                        ) : (
                                                            emp.department || "N/A"
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            {editingId === emp.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => saveEmp(emp.id, emp.employee_id)}
                                                                        className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        className="px-3 py-1 rounded-lg bg-gray-400 text-white text-sm hover:bg-gray-500 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => startEditEmp(emp)}
                                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                    aria-label="Edit employee"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        className="w-5 h-5"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L13 14l-4 1 1-4 8.5-8.5z"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteEmp(emp.id, emp.employee_id)}
                                                                className="text-red-600 hover:text-red-800 transition-colors"
                                                                aria-label="Delete employee"
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    className="w-5 h-5"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0h8l-1-3H9l-1 3z"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

