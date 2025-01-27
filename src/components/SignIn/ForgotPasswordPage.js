import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Style.css"; // Importing the main CSS file for styling

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState(""); // For success message
    const navigate = useNavigate();

    const handleResetPassword = async () => {
        try {
            const response = await axios.post("http://localhost:3001/forgot-password", { email });
            setMessage(response.data.message); // Show success message
        } catch (err) {
            setError(err.response?.data?.error || "Error occurred, please try again.");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Forgot Password</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button className="login-btn" onClick={handleResetPassword}>Reset Password</button>
    
                <div className="footer-links">
                    <p>Remembered your password?</p>
                    <button className="forgot-password-btn" onClick={() => navigate("/login")}>Login</button>
                </div>
            </div>
        </div>
    );
    
};

export default ForgotPasswordPage;
