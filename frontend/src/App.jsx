import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Header from "./components/Header";

// Auth Pages
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

// Staff Pages
import StaffDashboard from "./pages/staff/Dashboard";
import StaffLeaveRequest from "./pages/staff/LeaveRequest";
import StaffProfile from "./pages/staff/Profile";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import Reports from "./pages/admin/Reports";
import LeaveManagement from "./pages/admin/LeaveManagement";
import StaffReports from "./pages/admin/StaffReports";
import StaffDailyReports from "./pages/staff/StaffReports";
import Attendance from "./pages/admin/Attendance";
import ResetPassword from "./pages/ResetPassword";

function App() {
  const loading = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#020c4c" }}
      >
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  return (
    <Router basename="/time-tracker">
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Header />

          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/change-password"
              element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              }
            />

            {/* Staff Routes */}
            <Route
              path="/staff"
              element={
                <PrivateRoute>
                  <StaffDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/staff/leave"
              element={
                <PrivateRoute>
                  <StaffLeaveRequest />
                </PrivateRoute>
              }
            />
            <Route
              path="/staff/profile"
              element={
                <PrivateRoute>
                  <StaffProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/staff/daily-reports"
              element={
                <PrivateRoute>
                  <StaffDailyReports />
                </PrivateRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <PrivateRoute adminOnly={true}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <PrivateRoute adminOnly={true}>
                  <StaffManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <PrivateRoute adminOnly={true}>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/leaves"
              element={
                <PrivateRoute adminOnly={true}>
                  <LeaveManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/attendance"
              element={
                <PrivateRoute adminOnly={true}>
                  <Attendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/staff-reports"
              element={
                <PrivateRoute adminOnly={true}>
                  <StaffReports />
                </PrivateRoute>
              }
            />

            {/* Default Redirect */}
            <Route path="*" element={<Login />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
