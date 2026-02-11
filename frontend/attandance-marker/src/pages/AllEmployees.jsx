import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AllEmployees() {
    const navigate = useNavigate();

    useEffect(() => {
  const token = sessionStorage.getItem("webtoken");
  if (!token) {
    navigate("/");
  }
}, []);

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [editingEmp, setEditingEmp] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: "", department: "" });

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
    };

    const fetchAllEmployees = async () => {
        const webtoken = sessionStorage.getItem("webtoken");
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/emp/allemp", {
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

      useEffect(() => {
        fetchAllEmployees();
    }, []);


    const deleteEmp=async  (id,Empid)=>{
        const confirmDelete = window.confirm(
            `Are you sure you want to delete employee ${Empid}?`
          );
        
          if (!confirmDelete) return;

        const webtoken = sessionStorage.getItem("webtoken");
        try{
        const res = await fetch(`http://localhost:5000/emp/delete/${id}`, {
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
    };

    const editEmp = (emp) => {
        console.log("Editing employee:", emp);
        setEditingEmp(!editingEmp);
        setEditFormData({ id: emp.id, employee_id: emp.employee_id, name: emp.name, department: emp.department });
        console.log("Edit form data set to:", { id: emp.id, employee_id: emp.employee_id, name: emp.name, department: emp.department });
    };

    const submitEdit = async () => {
        if (!editFormData.name || !editFormData.department) {
            showToast("Please fill in all fields", "error");
            return;
        }

        const webtoken = sessionStorage.getItem("webtoken");
        try {
            const res = await fetch(`http://localhost:5000/emp/update/${editFormData.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${webtoken}`
                },
                body: JSON.stringify({
                    name: editFormData.name,
                    department: editFormData.department
                })
            });

            const result = await res.json();

            if (res.ok) {
                showToast(result.message || "Employee updated successfully!", "success");
                setEmployees(prev =>
                    prev.map(emp =>
                        emp.id === editFormData.id
                            ? { ...emp, name: editFormData.name, department: editFormData.department }
                            : emp
                    )
                );
                setEditingEmp(!editingEmp);
            } else {
                showToast(result.message || "Failed to update employee", "error");
            }
        } catch (error) {
            showToast("Server error. Please try again later.", "error");
        }
    };


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

                {/* Edit Modal */}
                {editingEmp && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                            <h2 className="text-2xl font-bold text-[#FF9500] mb-6">Edit Employee</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Employee ID
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.employee_id}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                name: e.target.value
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9500]"
                                        placeholder="Enter employee name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.department}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                department: e.target.value
                                            })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9500]"
                                        placeholder="Enter department"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setEditingEmp(!editingEmp)}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitEdit}
                                    className="flex-1 px-4 py-2 bg-[#FF9500] text-white rounded-lg font-semibold hover:bg-[#E68A00] transition-colors duration-200"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
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
                                            <th className="px-6 py-4 text-left font-semibold rounded-tr-xl">Department</th>
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
                                                    <td className="px-6 py-4 text-black">{emp.name}</td>
                                                    <td className="px-6 py-4 text-black">{emp.department || "N/A"}</td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => editEmp(emp)}
                                                            className="inline-flex items-center justify-center p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                            title="Edit Employee"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => deleteEmp(emp.id, emp.employee_id)}
                                                            className="inline-flex items-center justify-center p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors duration-200"
                                                            title="Delete Employee"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
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

