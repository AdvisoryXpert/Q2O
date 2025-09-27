import React, { MouseEvent } from "react";

import { useFlowInternal } from "../../../hooks/internal/useFlowInternal";
import { useSettingsContext } from "../../../context/SettingsContext";
import { useStylesContext } from "../../../context/StylesContext";

import "./ResetButton.css";

/**
 * Handles resetting of chat.
 */
const ResetButton = () => {
	// handles settings
	const { settings } = useSettingsContext();

	// handles styles
	const { styles } = useStylesContext();

	// handles flow
	const { restartFlow } = useFlowInternal();

	// figure out what we got for the icon (string URL or component)
	const iconProp = settings.header?.resetChatIcon;

	const isUrl =
    typeof iconProp === "string" && iconProp.trim().length > 0;

	// styles for reset chat icon "box" (works for bg-image and for svg)
	const resetChatIconStyle: React.CSSProperties = {
		width: 18,
		height: 18,
		display: "inline-block",
		backgroundRepeat: "no-repeat",
		backgroundPosition: "center",
		backgroundSize: "contain",
		...(isUrl ? { backgroundImage: `url("${iconProp}")` } : {}),
		...styles.chatIconStyle,
	};

	/**
   * Renders button depending on whether an svg component or image url is provided.
   * Falls back to a text glyph ↺ if none provided.
   */
	const renderButton = () => {
		const IconComponent = isUrl ? null : (iconProp as any);
		if (IconComponent) {
			// If a React component (e.g., MUI SvgIcon), render it and pass sizing via style
			return (
				<span className="rcb-reset-chat-icon" data-testid="rcb-reset-chat-icon">
					<IconComponent
						style={resetChatIconStyle}
						// make SVG inherit current color for consistency with header icons
						color="inherit"
						focusable="false"
						aria-hidden="true"
					/>
				</span>
			);
		}
		if (isUrl) {
			// URL background image
			return (
				<span
					className="rcb-reset-chat-icon"
					data-testid="rcb-reset-chat-icon"
					style={resetChatIconStyle}
				/>
			);
		}
		// Fallback glyph if no icon configured
		return (
			<span
				className="rcb-reset-chat-icon"
				data-testid="rcb-reset-chat-icon"
				style={{ ...resetChatIconStyle, width: "auto", backgroundImage: "none" }}
			>
				↺
			</span>
		);
	};

	const handleClick = (event: MouseEvent) => {
		event.stopPropagation();
		restartFlow();
	};

	return (
		<div
			className="rcb-reset-chat-button"
			aria-label={settings.ariaLabel?.resetChatButton}
			role="button"
			tabIndex={0}
			onClick={handleClick}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				cursor: "pointer",
				userSelect: "none",
				...styles.chatButtonStyle,
			}}
		>
			{renderButton()}
			{settings.header?.showResetChatButtonLabel && (
				<span className="rcb-reset-chat-button-label">
					{settings.ariaLabel?.resetChatButton}
				</span>
			)}
		</div>
	);
};

export default ResetButton;
