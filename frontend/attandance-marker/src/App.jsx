import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import AllEmployees from "./pages/AllEmployees";
import DailyAttendance from "./pages/DailyAttendance";

const AdminRoute = ({ children }) => {
  const token = sessionStorage.getItem("webtoken");

  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home/>} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />

        <Route
          path="/allemp"
          element={
            <AdminRoute>
              <AllEmployees />
            </AdminRoute>
          }
        />
        <Route
          path="/daily-attendance"
          element={
            <AdminRoute>
              <DailyAttendance />
            </AdminRoute>
          }
        />
      </Routes>
    </Router>
  );
}
