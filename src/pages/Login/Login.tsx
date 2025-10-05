// src/pages/Login/Login.tsx
import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "./Login.css";
import { http } from "../../lib/http";
import logo from "../../../assets/Qorza.png";
import banner from "../../../assets/Whisk_cf2e3ae24d.jpg";

// ⬇️ NEW: in-memory auth bus (no localStorage user)
//    Adjust the relative path if your folder structure differs.
import { login } from "../../services/AuthService";
import { setAuthFromLogin } from "../../auth/authBus";

const Login: React.FC = () => {
	const [mobile, setMobile] = useState("");
	const [password, setPassword] = useState("");
	const [token, setToken] = useState("");
	const [error, setError] = useState("");
	const [step, setStep] = useState<"password" | "2fa" | "qr">("password");
	const [qrCode, setQrCode] = useState("");
	const [canRegenerate, setCanRegenerate] = useState(false);

	const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
	const [forgotPasswordMessageType, setForgotPasswordMessageType] =
    useState<"success" | "error">("error");

	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as any)?.from?.pathname || "/Home";

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			const data = await login(mobile, password);

			if (data?.success) {
				// 2FA flow branching (unchanged)
				if (data.two_factor_required) {
					setStep("2fa");
					setCanRegenerate(!!data.can_regenerate_2fa);
					return;
				}
				if (data.two_factor_setup && data.qr_code) {
					setQrCode(data.qr_code);
					setStep("qr");
					return;
				}

				// ✅ Standard login success
				// Token is now handled by AuthService.login internally

				// ✅ Publish id & mobile in memory for nav (NO localStorage for user info)
				//    Your login JSON already has: user_id, mobile, userRole, userName
				setAuthFromLogin({
					user_id: data.user_id,
					mobile: data.mobile,
					userRole: data.userRole,
					userName: data.userName,
				});

				navigate(from, { replace: true });
			} else {
				setError("Invalid credentials.");
			}
		} catch (err: any) {
			console.error("Login error:", err?.response || err?.message || err);
			if (err?.response?.status === 403) setError("Forbidden. Check CORS settings.");
			else if (err?.response?.status === 401) setError("Unauthorized. Invalid credentials.");
			else setError("Server error. Try again later.");
		}
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			const response = await http.post(
				"/login/verify",
				{ mobile, token },
				{ withCredentials: true }
			);

			const data = response.data;

			if (data?.success) {
				// ✅ 2FA success: same treatment as normal login
				if (data?.token) setToken(data.token);

				setAuthFromLogin({
					user_id: data.user_id,
					mobile: data.mobile,
					userRole: data.userRole,
					userName: data.userName,
				});

				navigate(from, { replace: true });
			} else {
				setError("Invalid 2FA token.");
			}
		} catch (err: any) {
			console.error("2FA error:", err?.response || err?.message || err);
			setError("Server error. Try again later.");
		}
	};

	const handleRegenerate = async () => {
		setError("");
		try {
			const response = await http.post(
				"/login/regenerate-2fa",
				{ mobile },
				{ withCredentials: true }
			);

			const data = response.data;

			if (data?.success && data.qr_code) {
				setQrCode(data.qr_code);
				setStep("qr");
			} else {
				setError("Could not regenerate QR code.");
			}
		} catch (err: any) {
			console.error("Regeneration error:", err?.response || err?.message || err);
			setError("Server error. Try again later.");
		}
	};

	const handleForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setForgotPasswordMessage("Passwords do not match.");
			setForgotPasswordMessageType("error");
			return;
		}
		try {
			const response = await http.post(
				"/change-password",
				{ mobile, newPassword },
				{ withCredentials: true }
			);

			const data = response.data;

			if (data?.success) {
				setForgotPasswordMessage("Password updated successfully. Please login.");
				setForgotPasswordMessageType("success");
			} else {
				setForgotPasswordMessage(data?.error || "An error occurred.");
				setForgotPasswordMessageType("error");
			}
		} catch (err: any) {
			console.error("Forgot password error:", err?.response || err?.message || err);
			setForgotPasswordMessage("Server error. Try again later.");
			setForgotPasswordMessageType("error");
		}
	};

	return (
		<div className="login-container">
			<div className="login-left">
				<img src={banner} alt="Banner" className="banner-image" />
			</div>

			<div className="login-right">
				<Link to="/" className="home-link">
					Home Page
				</Link>

				<div className="login-box">
					<img src={logo} alt="RO Chennai Logo" className="logo-image" />

					{forgotPasswordMode ? (
						<>
							<h2 className="login-title">Forgot Password</h2>
							<form onSubmit={handleForgotPassword} className="login-form">
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
								<label htmlFor="newPassword">New Password</label>
								<input
									id="newPassword"
									type="password"
									required
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Enter your new password"
								/>
								<label htmlFor="confirmPassword">Confirm New Password</label>
								<input
									id="confirmPassword"
									type="password"
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Confirm your new password"
								/>
								<button type="submit" className="login-button">
									Submit
								</button>
								{forgotPasswordMessage && (
									<p className={`login-message ${forgotPasswordMessageType}`}>
										{forgotPasswordMessage}
									</p>
								)}
							</form>
							<div className="login-links">
								<a href="#" onClick={() => setForgotPasswordMode(false)}>
									Back to Login
								</a>
							</div>
						</>
					) : (
						<>
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
										<button type="submit" className="login-button">
											Login
										</button>
										{error && <p className="login-error">{error}</p>}
									</form>
									<div className="login-links">
										<a href="#" onClick={() => setForgotPasswordMode(true)}>
											Forgot Your Password?
										</a>
									</div>
								</>
							)}

							{step === "qr" && (
								<>
									<h2 className="login-title">Scan QR Code</h2>
									<p>Scan this QR code with your Google Authenticator app.</p>
									<img src={qrCode} alt="QR Code" />
									<button onClick={() => setStep("2fa")} className="login-button">
										Continue
									</button>
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
										<button type="submit" className="login-button">
											Verify
										</button>
										{error && <p className="login-error">{error}</p>}
									</form>
									{!!canRegenerate && (
										<button onClick={handleRegenerate} className="regenerate-button">
											Regenerate QR Code
										</button>
									)}
								</>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default Login;
