import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GetInTouchPopup from '../components/GetInTouchPopup';

const LandingPage = () => {
	const [showPopup, setShowPopup] = useState(false);
	useEffect(() => {
		const aosStyle = document.createElement('link');
		aosStyle.href = "https://unpkg.com/aos@2.3.1/dist/aos.css";
		aosStyle.rel = "stylesheet";
		document.head.appendChild(aosStyle);

		const aosScript = document.createElement('script');
		aosScript.src = "https://unpkg.com/aos@2.3.1/dist/aos.js";
		aosScript.async = true;
		aosScript.onload = () => {
			if (window.AOS) {
				window.AOS.init({ duration: 1000 });
			}
		};
		document.body.appendChild(aosScript);

		const prices = {
			usd: {
				pro: 49,
				business: 99,
			},
			inr: {
				pro: 3999,
				business: 7999,
			}
		};

		const proPriceEl = document.getElementById('pro-price');
		const businessPriceEl = document.getElementById('business-price');
		const proCurrencyEl = document.getElementById('pro-currency');
		const businessCurrencyEl = document.getElementById('business-currency');
		const freeCurrencyEl = document.getElementById('free-currency');

		fetch('http://ip-api.com/json')
			.then(response => response.json())
			.then(data => {
				if (data.countryCode === 'IN') {
					if (proPriceEl) proPriceEl.innerText = prices.inr.pro.toString();
					if (businessPriceEl) businessPriceEl.innerText = prices.inr.business.toString();
					if (proCurrencyEl) proCurrencyEl.innerText = '₹';
					if (businessCurrencyEl) businessCurrencyEl.innerText = '₹';
					if (freeCurrencyEl) freeCurrencyEl.innerText = '₹';
				}
			})
			.catch(error => {
				console.error('Error fetching location:', error);
			});

		const bootstrapScript = document.createElement('script');
		bootstrapScript.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js";
		bootstrapScript.async = true;
		document.body.appendChild(bootstrapScript);

		return () => {
			if (document.head.contains(aosStyle)) {
				document.head.removeChild(aosStyle);
			}
			if (document.body.contains(aosScript)) {
				document.body.removeChild(aosScript);
			}
			if (document.body.contains(bootstrapScript)) {
				document.body.removeChild(bootstrapScript);
			}
		}
	}, []);

	return (
		<div>
			<style>{`
				:root {
					--primary-color: #007bff;
					--secondary-color: #6c757d;
					--light-gray: #f8f9fa;
				}
				body {
					/* eslint-disable-next-line max-len */
					font-family: 'system-ui', -apple-system, BlinkMacSystemFont, 
					'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
				}
				.navbar {
					padding: 1rem 0;
				}
				.hero {
					background-color: var(--light-gray);
					padding: 6rem 0;
					text-align: center;
				}
				.hero h1 {
					font-size: 3.5rem;
					font-weight: 700;
				}
				.hero p {
					font-size: 1.25rem;
					color: var(--secondary-color);
				}
				.section {
					padding: 4rem 0;
				}
				.section-title {
					text-align: center;
					margin-bottom: 3rem;
					font-size: 2.5rem;
					font-weight: 600;
				}
				.feature-card {
					border: none;
					padding: 2rem;
					text-align: center;
					background-color: var(--light-gray);
					border-radius: 10px;
					margin-bottom: 1.5rem;
					transition: transform 0.3s;
				}
				.feature-card:hover {
					transform: translateY(-10px);
				}
				.feature-icon {
					font-size: 3rem;
					color: var(--primary-color);
					margin-bottom: 1.5rem;
				}
				.how-it-works .step {
					text-align: center;
				}
				.how-it-works .step p {
					margin-bottom: 0.5rem;
				}
				.how-it-works .step-number {
					display: inline-block;
					width: 50px;
					height: 50px;
					line-height: 50px;
					border-radius: 50%;
					background-color: var(--primary-color);
					color: white;
					font-weight: 600;
					margin-bottom: 1rem;
				}
				.testimonial-card {
					background-color: var(--light-gray);
					padding: 2rem;
					border-radius: 10px;
					margin-bottom: 1.5rem;
				}
				.pricing-card {
					border: 1px solid #dee2e6;
					border-radius: 10px;
					padding: 2rem;
					text-align: center;
					transition: transform 0.3s;
				}
				.pricing-card:hover {
					transform: translateY(-10px);
				}
				.pricing-card.popular {
					border-color: var(--primary-color);
					border-width: 2px;
				}
				.footer {
					background-color: #343a40;
					color: white;
					padding: 2rem 0;
				}
				.synopsis-section {
					padding: 2rem 0;
				}
			`}</style>
			{/* Header */}
			<nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
				<div className="container">
					<a className="navbar-brand" href="#" style={{ fontWeight: 600, color: 
						'var(--primary-color)' }}>Qorza</a>
					<button
						className="navbar-toggler"
						type="button"
						data-bs-toggle="collapse"
						data-bs-target="#navbarNav"
					>
						<span className="navbar-toggler-icon"></span>
					</button>
					<div className="collapse navbar-collapse" id="navbarNav">
						<ul className="navbar-nav ms-auto">
							<li className="nav-item"><a className="nav-link" href="#features">Features</a></li>
							{/*<li className="nav-item"><a className="nav-link" href="#pricing">Pricing</a></li>*/}
							<li className="nav-item"><Link className="btn btn-outline-primary ms-lg-2" 
								to="/login">Login</Link></li>
							<li className="nav-item"><a className="btn btn-primary ms-lg-2" href="#">Sign Up</a></li>
						</ul>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<header className="hero" data-aos="fade-in">
				<div className="container">
					<h1 className="display-4" data-aos="fade-up">From Quote to Cash, 
						Faster Than Ever</h1>
					<p className="lead" data-aos="fade-up" data-aos-delay="200">
						Qorza helps you create, send, and manage professional quotes 
						and orders seamlessly.
						Close deals faster and streamline your sales process.
					</p>
					<a href="#" className="btn btn-primary btn-lg mt-3" data-aos="fade-up" data-aos-delay="400">
						Get Started for Free
					</a>
				</div>
			</header>

			{/* Features Section */}
			<section id="features" className="section">
				<div className="container">
					<h2 className="section-title" data-aos="fade-up">
						Everything you need to grow</h2>
					<div className="row">
						<div className="col-md-4" data-aos="fade-up">
							<div className="feature-card">
								<div className="feature-icon">&#128179;</div>
								<h5>Effortless Quoting</h5>
								<p>
									Create and customize professional-looking quotes 
									in minutes with our intuitive editor.
								</p>
							</div>
						</div>
						<div className="col-md-4" data-aos="fade-up" data-aos-delay="200">
							<div className="feature-card">
								<div className="feature-icon">&#10227;</div>
								<h5>Seamless Order Conversion</h5>
								<p>Convert approved quotes into orders with a single click, 
									eliminating manual data entry.</p>
							</div>
						</div>
						<div className="col-md-4" data-aos="fade-up" data-aos-delay="400">
							<div className="feature-card">
								<div className="feature-icon">&#128269;</div>
								<h5>Real-time Tracking</h5>
								<p>Monitor the status of your quotes and orders in real-time, from sent to paid.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* How It Works Section */}
			<section className="section how-it-works bg-light">
				<div className="container">
					<h2 className="section-title" data-aos="fade-up">How It Works</h2>
					<div className="row justify-content-around">
						<div className="col-md-2" data-aos="fade-up">
							<div className="step">
								<div className="step-number">1</div>
								<h6>Draft Quote</h6>
								<p>Create a new quote using your products and services.</p>
							</div>
						</div>
						<div className="col-md-2" data-aos="fade-up" data-aos-delay="200">
							<div className="step">
								<div className="step-number">2</div>
								<h6>Get Approval</h6>
								<p>Send the quote to your client for their approval online.</p>
							</div>
						</div>
						<div className="col-md-2" data-aos="fade-up" data-aos-delay="400">
							<div className="step">
								<div className="step-number">3</div>
								<h6>Convert to Order</h6>
								<p>Once approved, convert the quote to an order instantly.</p>
							</div>
						</div>
						<div className="col-md-2" data-aos="fade-up" data-aos-delay="600">
							<div className="step">
								<div className="step-number">4</div>
								<h6>Track & Deliver</h6>
								<p>Manage the order fulfillment and track payments.</p>
							</div>
						</div>
						<div className="col-md-2" data-aos="fade-up" data-aos-delay="800">
							<div className="step">
								<div className="step-number">5</div>
								<h6>Warranty Support</h6>
								<p>Effortlessly manage product warranties and provide timely support.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Synopsis Section */}
			<section className="section synopsis-section">
				<div className="container">
					<div className="row align-items-center synopsis-row" data-aos="fade-right">
						<div className="col-md-6">
							<img
								src="https://placehold.co/600x400/EBF5FF/7F9CF5?text=Quotes"
								className="img-fluid rounded shadow"
								alt="Create Professional Quotes"
							/>
						</div>
						<div className="col-md-6">
							<h3>Create Professional Quotes in Seconds</h3>
							<p>
								Design and send beautiful, accurate quotes in minutes.
								Our intuitive editor makes it easy to create professional 
								proposals that win business.
							</p>
							<a href="#" className="btn btn-primary me-2">Try for free</a>
							<button className="btn btn-outline-primary" 
								onClick={() => setShowPopup(true)}>Request a demo →</button>
						</div>
					</div>
					<div className="row align-items-center synopsis-row flex-row-reverse" data-aos="fade-left">
						<div className="col-md-6">
							<img
								src="https://placehold.co/600x400/E6FFFA/68D391?text=Orders"
								className="img-fluid rounded shadow"
								alt="Convert Quotes to Orders"
							/>
						</div>
						<div className="col-md-6">
							<h3>Convert Quotes to Orders, Instantly</h3>
							<p>
								No more manual data entry. Convert accepted quotes 
								into sales orders with a single click.
								Track and manage your orders from start to finish.
							</p>
							<a href="#" className="btn btn-primary me-2">								Try for free</a>
							<button className="btn btn-outline-primary" 
								onClick={() => setShowPopup(true)}>Request a demo →</button>
						</div>
					</div>
					<div className="row align-items-center synopsis-row" data-aos="fade-right">
						<div className="col-md-6">
							<img
								src="https://placehold.co/600x400/FFF5EB/F6AD55?text=Warranty"
								className="img-fluid rounded shadow"
								alt="Manage Warranties"
							/>
						</div>
						<div className="col-md-6">
							<h3>Manage Warranties with Ease</h3>
							<p>
								Keep track of product warranties effortlessly.
								Set up automated reminders for expiring warranties 
								and provide better customer service.
							</p>
							<a href="#" className="btn btn-primary me-2">Try for free</a>
							<button className="btn btn-outline-primary" 
								onClick={() => setShowPopup(true)}>Request a demo →</button>
						</div>
					</div>
				</div>
			</section>
			<section id="testimonials" className="section">
				<div className="container">
					<h2 className="section-title" data-aos="fade-up">Loved by businesses worldwide</h2>
					<div className="row">
						<div className="col-md-6" data-aos="fade-up">
							<div className="testimonial-card">
								<p>
									"Qorza has transformed our sales process.
									We're closing deals 50% faster and our clients 
									love the professional look of our quotes."
								</p>
								<small className="text-muted">- Jane Doe, CEO of a growing startup</small>
							</div>
						</div>
						<div className="col-md-6" data-aos="fade-up" data-aos-delay="200">
							<div className="testimonial-card">
								<p>
									"The ability to convert quotes to orders instantly has 
									saved us countless hours of administrative work.
									A must-have tool!"
								</p>
								<small className="text-muted">- John Smith, Operations Manager</small>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pricing Section */}
			{/*
			<section id="pricing" className="section bg-light">
				<div className="container">
					<h2 className="section-title" data-aos="fade-up">Choose your plan</h2>
					<div className="row">
						<div className="col-lg-4" data-aos="fade-up">
							<div className="pricing-card mb-4">
								<h5>Free</h5>
								<h3 className="my-3">
									<span id="free-currency">$</span>
									<span id="free-price">0</span>
									<span className="text-muted">/mo</span>
								</h3>
								<ul className="list-unstyled my-4">
									<li>1 User</li>
									<li>10 Quotes/month</li>
									<li>Basic Support</li>
								</ul>
								<button className="btn btn-outline-primary">Get Started</button>
							</div>
						</div>
						<div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
							<div className="pricing-card popular mb-4">
								<h5>Pro</h5>
								<h3 className="my-3">
									<span id="pro-currency">$</span>
									<span id="pro-price">49</span>
									<span className="text-muted">/mo</span>
								</h3>
								<ul className="list-unstyled my-4">
									<li>5 Users</li>
									<li>Unlimited Quotes</li>
									<li>Priority Support</li>
								</ul>
								<button className="btn btn-primary">Choose Plan</button>
							</div>
						</div>
						<div className="col-lg-4" data-aos="fade-up" data-aos-delay="400">
							<div className="pricing-card mb-4">
								<h5>Business</h5>
								<h3 className="my-3">
									<span id="business-currency">$</span>
									<span id="business-price">99</span>
									<span className="text-muted">/mo</span>
								</h3>
								<ul className="list-unstyled my-4">
									<li>Unlimited Users</li>
									<li>Unlimited Quotes</li>
									<li>Dedicated Support</li>
								</ul>
								<button className="btn btn-outline-primary">Choose Plan</button>
							</div>
						</div>
					</div>
				</div>
			</section>
			*/}
			{/* FAQ Section */}
			<section id="faq" className="section">
				<div className="container">
					<h2 className="section-title" data-aos="fade-up">Frequently Asked Questions</h2>
					<div className="accordion" id="faqAccordion" data-aos="fade-up">
						<div className="accordion-item">
							<h2 className="accordion-header" id="headingOne">
								<button
									className="accordion-button"
									type="button"
									data-bs-toggle="collapse"
									data-bs-target="#collapseOne"
									aria-expanded="true"
									aria-controls="collapseOne"
								>
									Is there a free trial available?
								</button>
							</h2>
							<div
								id="collapseOne"
								className="accordion-collapse collapse show"
								aria-labelledby="headingOne"
								data-bs-parent="#faqAccordion"
							>
								<div className="accordion-body">
									Yes, we offer a free plan that allows you to create up to 10 quotes per month.
									You can use it for as long as you like.
								</div>
							</div>
						</div>
						<div className="accordion-item">
							<h2 className="accordion-header" id="headingTwo">
								<button
									className="accordion-button collapsed"
									type="button"
									data-bs-toggle="collapse"
									data-bs-target="#collapseTwo"
									aria-expanded="false"
									aria-controls="collapseTwo"
								>
									Can I customize the quotes with my own branding?
								</button>
							</h2>
							<div
								id="collapseTwo"
								className="accordion-collapse collapse"
								aria-labelledby="headingTwo"
								data-bs-parent="#faqAccordion"
							>
								<div className="accordion-body">
									Absolutely! With our Pro and Business plans, you can add your company logo,
									change colors, and customize the layout of your quotes to match your brand.
								</div>
							</div>
						</div>
						<div className="accordion-item">
							<h2 className="accordion-header" id="headingThree">
								<button
									className="accordion-button collapsed"
									type="button"
									data-bs-toggle="collapse"
									data-bs-target="#collapseThree"
									aria-expanded="false"
									aria-controls="collapseThree"
								>
									What payment gateways do you support?
								</button>
							</h2>
							<div
								id="collapseThree"
								className="accordion-collapse collapse"
								aria-labelledby="headingThree"
								data-bs-parent="#faqAccordion"
							>
								<div className="accordion-body">
									We support a wide range of payment gateways, including Stripe, PayPal, and more,
									allowing you to get paid directly from your invoices.
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="footer">
				<div className="container text-center">
					<p>&copy; 2025 Qorza. All rights reserved.</p>
				</div>
			</footer>

			{showPopup && <GetInTouchPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />}
		</div>
	);
};

export default LandingPage;


