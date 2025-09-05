import React from 'react';
import './GetInTouchPopup.css';

type GetInTouchPopupProps = {
  onClose: () => void;
  isOpen: boolean;
};

const GetInTouchPopup: React.FC<GetInTouchPopupProps> = ({ onClose, isOpen }) => {
	return (
		<div
			id="getInTouchModal"
			className="popup"
			style={{ display: isOpen ? 'flex' : 'none' }}
		>
			<div className="popup-content">
				<span className="close" onClick={onClose}>
					&times;
				</span>
				<div className="get-in-touch-modal-grid">
					<div className="left-panel">
						<div className="flex flex-col gap-8">
							<div className="flex flex-col gap-2">
								<h3 className="font-bold text-2xl">Get in touch</h3>
								<p className="text-sm opacity-80">
									Get help with pricing plans, schedule a demo, explore use-cases for your business,
									and more.
								</p>
							</div>

							<div className="flex flex-col gap-4">
								<p className="font-bold text-lg tracking-tight">
									Prefer to email?
								</p>

								<a
									className="text-black dark:text-white font-semibold"
									href="mailto:support@getswipe.in"
								>
									hello@entbylabs.com
								</a>
							</div>

							<div className="flex flex-col gap-6">
								<div className="flex items-center gap-3">
									<span className="contact-badge">1</span>
									<div className="flex flex-col">
										<p className="font-semibold">Talk to Sales</p>
										<p className="text-sm opacity-80">
											Explore features and pick the right plan for your business.
										</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<span className="contact-badge">2</span>
									<div className="flex flex-col">
										<p className="font-semibold">Get a Demo</p>
										<p className="text-sm opacity-80">
											See how our product fits into your workflow.
										</p>
									</div>
								</div>

								<div className="flex items-center gap-3">
									<span className="contact-badge">3</span>
									<div className="flex flex-col">
										<p className="font-semibold">Ask a Question</p>
										<p className="text-sm opacity-80">
											Have something specific in mind? We’ll help you out.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Right panel: form */}
					<div className="right-panel">
						<form>
							<div className="form-grid">
								<div className="form-field">
									<label className="form-label" htmlFor="name">
										Your Name or Company Name*
									</label>
									<input
										id="name"
										className="form-input"
										type="text"
										placeholder="Enter your name or company"
										required
									/>
								</div>

								<div className="form-field">
									<label className="form-label" htmlFor="email">
										Email*
									</label>
									<input
										id="email"
										className="form-input"
										type="email"
										placeholder="you@company.com"
										required
									/>
								</div>

								<div className="form-field">
									<label className="form-label" htmlFor="phone">
										Phone number (optional)
									</label>
									<input
										id="phone"
										className="form-input"
										type="tel"
										placeholder="Enter your phone number"
									/>
								</div>

								<div className="form-field">
									<label className="form-label" htmlFor="message">
										How can we help?
									</label>
									<textarea
										id="message"
										className="form-textarea"
										placeholder="Tell us about your query"
										rows={4}
									/>
								</div>

								<div className="form-field">
									<p className="form-label">What describes you best?</p>

									<div className="radio-row">
										<input
											id="just-exploring"
											type="radio"
											name="persona"
											value="Just exploring"
										/>
										<label htmlFor="just-exploring">Just exploring</label>
									</div>

									<div className="radio-row">
										<input
											id="book-demo"
											type="radio"
											name="persona"
											value="I want to book a demo"
										/>
										<label htmlFor="book-demo">I want to book a demo</label>
									</div>

									<div className="radio-row">
										<input
											id="feature-question"
											type="radio"
											name="persona"
											value="I have a question about a feature"
										/>
										<label htmlFor="feature-question">
											I have a question about a feature
										</label>
									</div>
								</div>

								<button type="submit" className="btn btn-primary">
									Submit
								</button>
							</div>
						</form>
					</div>
					{/* end right panel */}
				</div>
			</div>
		</div>
	);
};

export default GetInTouchPopup;
