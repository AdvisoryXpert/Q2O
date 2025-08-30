import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import API from '../../apiConfig';
import logo from './aquapot-2019-vc.png';
import banner from './b1-700x269.png';

const Login: React.FC = () => {
	const [mobile, setMobile] = useState("");
	const [password, setPassword] = useState("");
	const [token, setToken] = useState("");
	const [error, setError] = useState("");
	const [step, setStep] = useState("password"); // password, 2fa, qr
	const [qrCode, setQrCode] = useState("");
	const [canRegenerate, setCanRegenerate] = useState(false);

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
				if (response.data.two_factor_required) {
					setStep("2fa");
					setCanRegenerate(response.data.can_regenerate_2fa);
				} else if (response.data.two_factor_setup) {
					setQrCode(response.data.qr_code);
					setStep("qr");
				} else {
					
					navigate("/Home");
				}
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

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const response = await axios.post(`${API}/api/login/verify`, {
				mobile,
				token,
			  }, {
				withCredentials: true
			});
			  

			if (response.data.success) {
				
				navigate("/Home");
			} else {
				setError("Invalid 2FA token.");
			}
		} catch (err: any) {
			console.error("2FA error:", err?.response || err?.message || err);
			setError("Server error. Try again later.");
		}
	};

	const handleRegenerate = async () => {
		try {
			const response = await axios.post(`${API}/api/login/regenerate-2fa`, {
				mobile,
			  }, {
				withCredentials: true
			});
			  

			if (response.data.success) {
				setQrCode(response.data.qr_code);
				setStep("qr");
			} else {
				setError("Could not regenerate QR code.");
			}
		} catch (err: any) {
			console.error("Regeneration error:", err?.response || err?.message || err);
			setError("Server error. Try again later.");
		}
	};

	return (
		<div className="login-container">
			<div className="login-left">
				<img src={banner} alt="Banner" className="banner-image" />
			</div>
			<div className="login-right">
				<div className="login-box">
					<img src={logo} alt="RO Chennai Logo" className="logo-image" />
					{step === "password" && (
						<>
							<h2 className="login-title">Login or Create an Account</h2>
							<form onSubmit={handleLogin} className="login-form">
								<label htmlFor="mobile">Mobile Number</label>
								<input
									id="mobile"
									type="tel"
									pattern="[6-9]{1}[0-9]{9}"
									title="Enter valid 10-digit mobile number"
									maxLength={10}
									required
									value={mobile}
									onChange={(e) => setMobile(e.target.value)}
									placeholder="Enter your 10-digit mobile number"
								/>
								<label htmlFor="password">Password</label>
								<input
									id="password"
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter your password"
								/>
								<button type="submit" className="login-button">Login</button>
								{error && <p className="login-error">{error}</p>}
							</form>
							<div className="login-links">
								<a href="#">Forgot Your Password?</a>
							</div>
						</>
					)}
					{step === "qr" && (
						<>
							<h2 className="login-title">Scan QR Code</h2>
							<p>Scan this QR code with your Google Authenticator app.</p>
							<img src={qrCode} alt="QR Code" />
							<button onClick={() => setStep("2fa")} className="login-button">Continue</button>
						</>
					)}
					{step === "2fa" && (
						<>
							<h2 className="login-title">Enter 2FA Token</h2>
							<form onSubmit={handleVerify} className="login-form">
								<label htmlFor="token">Authenticator Code</label>
								<input
									id="token"
									type="text"
									required
									value={token}
									onChange={(e) => setToken(e.target.value)}
									placeholder="Enter your 6-digit code"
								/>
								<button type="submit" className="login-button">Verify</button>
								{error && <p className="login-error">{error}</p>}
							</form>
							{!!canRegenerate && <button onClick={handleRegenerate} 
								className="regenerate-button">Regenerate QR Code</button>}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default Login;