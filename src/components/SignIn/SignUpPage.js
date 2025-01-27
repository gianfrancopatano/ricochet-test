import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Style.css"; // Importing the main CSS file for styling

const SignUpPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async () => {
        try {
            const response = await axios.post("http://localhost:3001/register", { 
                username, 
                password,
            });
            alert(response.data.message);  
            navigate("/login");  
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Register</h2>
                {error && <p className="error-message">{error}</p>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className="login-btn" onClick={handleRegister}>Register</button>
                <div className="footer-links">
                    <p>Already have an account?</p>
                    <button className="signup-btn" onClick={() => navigate("/login")}>Login</button>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
