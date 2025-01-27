import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import CallsPage from "./components/Call/CallPage"; // Sidebar (Online Users & Calls)
import SignInPage from "./components/SignIn/SignInPage";
import SignUpPage from "./components/SignIn/SignUpPage";
import ForgotPasswordPage from "./components/SignIn/ForgotPasswordPage";
import CallsReportPage from "./components/CallsReport/CallsReportPage";

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loggedInUser = localStorage.getItem("user");
        if (loggedInUser) {
            setUser(JSON.parse(loggedInUser));
        }
    }, []);

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("user");
    };

    return (
        <Router>
            <div className="app-container">
                {/* Sidebar for calls (only visible when logged in) */}
                {user && <CallsPage user={user} setUser={setUser} />}

                {/* Main content */}
                <div className="main-content">
                    <Routes>
                        {/* Authentication routes */}
                        <Route path="/login" element={<SignInPage setUser={setUser} />} />
                        <Route path="/register" element={<SignUpPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                        {/* Protected routes (redirects to login if user is not authenticated) */}
                        <Route path="/reports" element={user ? <CallsReportPage user={user} /> : <Navigate to="/login" />} />

                        {/* Default route (redirects to login) */}
                        <Route path="*" element={<Navigate to={user ? "/reports" : "/login"} />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
