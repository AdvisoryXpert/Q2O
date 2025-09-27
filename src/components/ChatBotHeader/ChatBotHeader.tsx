// Force re-evaluation
import React from "react";

import { useSettingsContext } from "../../context/SettingsContext";
import { useStylesContext } from "../../context/StylesContext";

import "./ChatBotHeader.css";

import { FaExpand, FaCompress } from 'react-icons/fa';

/**
 * Contains header buttons and avatar.
 * 
 * @param buttons list of buttons to render in the header
 * @param isExpanded boolean to determine if chat is expanded
 * @param toggleExpandChat function to toggle chat expansion
 */
const ChatBotHeader = ({ buttons, isExpanded, toggleExpandChat }: { buttons: JSX.Element[], isExpanded: boolean, toggleExpandChat: () => void }) => {
	// handles settings
	const { settings } = useSettingsContext();

	// handles styles
	const { styles } = useStylesContext();

	// styles for header
	const headerStyle: React.CSSProperties = {
		backgroundImage: `linear-gradient(to right, ${settings.general?.secondaryColor},
			${settings.general?.primaryColor})`,
		...styles.headerStyle
	}

	return (
		<div style={headerStyle} className="rcb-chat-header-container">
			<div className="rcb-chat-header">
				{settings.header?.showAvatar &&
					<div 
						style={{backgroundImage: `url("${settings.header?.avatar}")`}}
						className="rcb-bot-avatar"
					/>
				}
				{settings.header?.title}
			</div>
			<div className="rcb-chat-header">
				<button
					onClick={toggleExpandChat}
					style={{
						background: 'none',
						border: 'none',
						fontSize: '20px',
						fontWeight: 'bold',
						cursor: 'pointer',
						color: 'white'
					}}
					aria-label="Expand or Restore Chatbot"
				>
					{isExpanded ? <FaCompress /> : <FaExpand />}
				</button>
				{buttons?.map((button: JSX.Element, index: number) => 
					<div key={index} className="rcb-header-button">{button}</div>
				)}
			</div>
		</div>
	);
};

export default ChatBotHeader;
