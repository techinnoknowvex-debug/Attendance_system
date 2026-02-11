import { useState,useEffect} from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import BackgroundAnimation from "../components/BackgroundAnimation";
import AddEmployeeForm from "../components/AddEmployeeForm";
import DownloadReportForm from "../components/DownloadReportForm";
import DailySheetForm from "../components/DailySheetForm";
import LOPModal from "../components/LOPModal";
import logo from "../assets/logo.png";

export default function Admin(){
    const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("webtoken");
    if (!token) {
      navigate("/");
    }
  }, [navigate]);


    const [empid,setEmpid]=useState("");
    const [empname,setEmpname]=useState("");
    const [department, setDepartment] = useState("");
    const [year,setYear]=useState("");
    const [month,setMonth]=useState("");
    const [dailyDate, setDailyDate] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [dailyDownloadLoading, setDailyDownloadLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [markLop,setMarkLop]=useState(false)
    const [showLOPModal, setShowLOPModal] = useState(false);
    const [lopEmpId, setLopEmpId] = useState("");
    const [lopReason, setLopReason] = useState("");
    const [lopDate, setLopDate] = useState("");
    const [lopLoading, setLopLoading] = useState(false);
    const [pin, setPin] = useState("");
 
   

    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
    };
 
    const adddata=async (e)=>{
     e.preventDefault();
     
     if (!empid.trim() || !empname.trim() || !department) {
       showToast("Please fill in all fields", "error");
       return;
     }
     const webtoken=sessionStorage.getItem("webtoken");
     setAddLoading(true);
     try {
       const res = await fetch("http://localhost:5000/emp/empregister", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${webtoken}`
         },
         body: JSON.stringify({
           employeeId:empid,
           name:empname,
           department:department,
           pin:pin
         }),
       });
       
       const result = await res.json();
       console.log(result);
       if(result.sucess){
         showToast(result.message || "Employee added successfully!", "success");
         setEmpid("");
         setEmpname("");
         setDepartment("");
         setPin("");
       }else{
         showToast(result.message || "Failed to add employee", "error");
       }
     } catch (error) {
       showToast("Server error. Please try again later.", "error");
       console.error("Error adding employee:", error);
     } finally {
       setAddLoading(false);
     }
    }
 
    

    const handleprintingdata=async (e)=>{
      e.preventDefault();
      
      if (!year || !month) {
        showToast("Please select both year and month", "error");
        return;
      }

      setDownloadLoading(true);
      const webtoken = sessionStorage.getItem("webtoken");
      try{
        const res=await fetch("http://localhost:5000/emp/empdata",{
          method:"POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webtoken}`
          },
          body:JSON.stringify({
            year:year,
            month:month
          })
        })

        if (!res.ok) {
          throw new Error("Failed to download file");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance_${month}_${year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        showToast("Attendance report downloaded successfully!", "success");
        setYear("");
        setMonth("");
      }
      catch(err){
        showToast("Failed to download report. Please try again.", "error");
        console.log("Error",err)
      } finally {
        setDownloadLoading(false);
      }
    }

    const handleDailyDownload = async (e) => {
      e.preventDefault();
      
      if (!dailyDate) {
        showToast("Please select a date", "error");
        return;
      }

      setDailyDownloadLoading(true);
      const webtoken = sessionStorage.getItem("webtoken");
      try {
        const res = await fetch("http://localhost:5000/emp/dailysheet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webtoken}`
          },
          body: JSON.stringify({
            date: dailyDate
          })
        });

        if (!res.ok) {
          throw new Error("Failed to download file");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daily_attendance_${dailyDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        showToast("Daily attendance sheet downloaded successfully!", "success");
        setDailyDate("");
      } catch (err) {
        showToast("Failed to download daily sheet. Please try again.", "error");
        console.log("Error", err);
      } finally {
        setDailyDownloadLoading(false);
      }
    }

    const handleLOPClick = () => {
      setShowLOPModal(true);
    };


    const handleLOPSubmit = async (e) => {
      e.preventDefault();
      
      if (!lopEmpId.trim() || !lopReason.trim() || !lopDate) {
        showToast("Please fill in all fields", "error");
        return;
      }

      setLopLoading(true);
      const webtoken = sessionStorage.getItem("webtoken");
      try {
        const res = await fetch("http://localhost:5000/emp/marklop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webtoken}`
          },
          body: JSON.stringify({
            employeeId: lopEmpId,
            reason: lopReason,
            markingDate: lopDate
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          showToast(result.message || "LOP marked successfully!", "success");
          setLopEmpId("");
          setLopReason("");
          setLopDate("");
          setShowLOPModal(false);
        } else {
          showToast(result.message || "Failed to mark LOP", "error");
        }
      } catch (error) {
        showToast("Server error. Please try again later.", "error");
        console.error("Error marking LOP:", error);
      } finally {
        setLopLoading(false);
      }
    };
 
 
    return(
        <>
       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-100 via-cream-200 to-cream-300 relative overflow-hidden py-12 px-4">
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

        {/* Header with Logo and Company Name */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
          <h1 className="text-2xl font-bold text-[#FF9500]">INNOKNOWVEX</h1>
        </div>

        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-5 left-5 z-10 bg-cream-100/80 hover:bg-cream-200 text-black px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>

        <div className="relative z-10 w-full max-w-7xl">
          {/* Main Row: Add Employee, Download Report, and Daily Sheet + LOP */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Add Employee Card */}
            <AddEmployeeForm
              empid={empid}
              setEmpid={setEmpid}
              empname={empname}
              setEmpname={setEmpname}
              department={department}
              setDepartment={setDepartment}
              addLoading={addLoading}
              pin={pin}
              setPin={setPin}
              onAddSubmit={adddata}
            />

            {/* Download Report Card */}
            <DownloadReportForm
              year={year}
              setYear={setYear}
              month={month}
              setMonth={setMonth}
              downloadLoading={downloadLoading}
              onSubmit={handleprintingdata}
            />

            {/* Daily Download Sheet and LOP Card */}
            <DailySheetForm
              dailyDate={dailyDate}
              setDailyDate={setDailyDate}
              dailyDownloadLoading={dailyDownloadLoading}
              onDailySubmit={handleDailyDownload}
              onLOPClick={handleLOPClick}
            />
          </div>
        </div>
       </div>

      

       {/* LOP Modal */}
       <LOPModal
         markLop={markLop}
         setMarkLop={setMarkLop}
         showLOPModal={showLOPModal}
         setShowLOPModal={setShowLOPModal}
         lopEmpId={lopEmpId}
         setLopEmpId={setLopEmpId}
         lopReason={lopReason}
         setLopReason={setLopReason}
         lopDate={lopDate}
         setLopDate={setLopDate}
         lopLoading={lopLoading}
         onLOPSubmit={handleLOPSubmit}
       />
        </>
    )
}