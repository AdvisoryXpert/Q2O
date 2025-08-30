import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../style/Login.css";
import API from '../apiConfig';

const Login: React.FC = () => {
	const [mobile, setMobile] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const response = await axios.post(`${API}/api/login`, {
				mobile,
				password,
			  }, {
				withCredentials: true
			});
			  

			if (response.data.success) {
				
				navigate("/Home");
			} else {
				setError("Invalid credentials.");
			}
		} catch (err: any) {
			console.error("Login error:", err?.response || err?.message || err);
			if (err?.response?.status === 403) {
				setError("Forbidden. Check CORS settings.");
			} else if (err?.response?.status === 401) {
				setError("Unauthorized. Invalid credentials.");
			} else {
				setError("Server error. Try again later.");
			}
		}		
	};

	return (
		<div className="login-wrapper">
			<div className="login-box">
				<h2 className="login-title">Welcome to RO Chennai</h2>
				<p className="login-subtitle">Please login to continue</p>
				<form onSubmit={handleLogin} className="login-form">
					<input
						type="tel"
						pattern="[6-9]{1}[0-9]{9}"
						title="Enter valid 10-digit mobile number"
						maxLength={10}
						required
						value={mobile}
						onChange={(e) => setMobile(e.target.value)}
						placeholder="Enter your 10-digit mobile number"
					/>
					<input
						type="password"
						required
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter your password"
					/>
					<button type="submit" className="login-button">Login</button>
					{error && <p className="login-error">{error}</p>}
				</form>
			</div>
		</div>
	);
};

export default Login;
