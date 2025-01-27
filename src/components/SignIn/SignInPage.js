import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Style.css";

const SignInPage = ({ setUser }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await axios.post("http://localhost:3001/login", { username, password });
            const { token, user } = response.data; // Expecting { token, user: { id, username } }
            
            if (!user || !user.id) {
                setError("Invalid user data received");
                return;
            }

            // Store user data and token
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user)); // Store full user object
            setUser(user);

            console.log("User logged in successfully");
            navigate("/calls");
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.error || "Login failed");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Login</h2>
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
                <button className="login-btn" onClick={handleLogin}>Login</button>

                <div className="footer-links">
                    <button className="forgot-password-btn" onClick={() => navigate("/forgot-password")}>Forgot Password?</button>
                    <button className="signup-btn" onClick={() => navigate("/register")}>Sign Up</button>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;