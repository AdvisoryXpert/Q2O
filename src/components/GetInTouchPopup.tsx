import React from 'react';
import './GetInTouchPopup.css';

type GetInTouchPopupProps = {
  onClose: () => void;
  isOpen: boolean;
}

const GetInTouchPopup: React.FC<GetInTouchPopupProps> = ({ onClose, isOpen }) => {
	return (
		<div id="getInTouchModal" className="popup" style={{ display: isOpen ? 'flex' : 'none' }}>
			<div className="popup-content">
				<span className="close" onClick={onClose}>&times;</span>
				<div className="get-in-touch-modal-grid">
					<div className="left-panel">
						<div className="flex flex-col gap-8">
							<div className="flex flex-col gap-2">
								<h3 className="font-bold text-2xl tracking-tight">Get in touch with us</h3>
								<p className="text-neutral-500 dark:text-neutral-400">Get help with pricing plans, schedule a demo, explore use-cases for your business, and more.</p>
							</div>
							<div className="flex flex-col gap-4">
								<p className="font-bold text-lg tracking-tight">Contact Information</p>
								<p className="text-neutral-500 dark:text-neutral-400">Reach out to sales. We respond fast!</p>
								<a className="text-black dark:text-white font-semibold" href="mailto:support@getswipe.in">hello@entbylabs.com</a>
							</div>
						</div>
					</div>
					<div className="right-panel">
						<form>
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2"><label className="form-label" htmlFor="name">Your Name or Company Name*</label><input name="name" placeholder="Enter your name" className="form-control" /></div>
								<div className="flex flex-col gap-2"><label className="form-label" htmlFor="phone">Phone Number*</label><input name="phone" placeholder="Enter phone number" className="form-control" /></div>
								<div className="flex flex-col gap-2"><label className="form-label" htmlFor="email">Your Email</label><input name="email" placeholder="Enter your email" className="form-control" /></div>
								<div className="flex flex-col gap-2"><label className="form-label" htmlFor="message">Your message to us!</label><textarea name="message" placeholder="I want to schedule a demo" className="form-control"></textarea></div>
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2"><input type="radio" id="demo" name="reason" value="I want to schedule a demo" defaultChecked /><label htmlFor="demo">I want to schedule a demo</label></div>
									<div className="flex items-center gap-2"><input type="radio" id="more-info" name="reason" value="I want to know more about Swipe" /><label htmlFor="more-info">I want to know more about Swipe</label></div>
									<div className="flex items-center gap-2"><input type="radio" id="pricing" name="reason" value="Help me with pricing details" /><label htmlFor="pricing">Help me with pricing details</label></div>
									<div className="flex items-center gap-2"><input type="radio" id="feature-question" name="reason" value="I have a question about a feature" /><label htmlFor="feature-question">I have a question about a feature</label></div>
								</div><button type="submit" className="btn btn-primary">Submit</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GetInTouchPopup;