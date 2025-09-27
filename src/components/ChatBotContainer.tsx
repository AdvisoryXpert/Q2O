import { MouseEvent, useMemo } from "react";

import ChatBotHeader from "./ChatBotHeader/ChatBotHeader";
import ChatBotBody from "./ChatBotBody/ChatBotBody";
import ChatBotInput from "./ChatBotInput/ChatBotInput";
import ChatBotFooter from "./ChatBotFooter/ChatBotFooter";
import ChatBotButton from "./ChatBotButton/ChatBotButton";
import ChatBotTooltip from "./ChatBotTooltip/ChatBotTooltip";
import ToastContainer from "./ChatBotToast/ToastContainer/ToastContainer";
import { useButtonInternal } from "../hooks/internal/useButtonsInternal";
import { useChatWindowInternal } from "../hooks/internal/useChatWindowInternal";
import { useBotEffectsInternal } from "../hooks/internal/useBotEffectsInternal";
import { useIsDesktopInternal } from "../hooks/internal/useIsDesktopInternal";
import { usePluginsInternal } from "../hooks/internal/usePluginsInternal";
import { useBotRefsContext } from "../context/BotRefsContext";
import { useBotStatesContext } from "../context/BotStatesContext";
import { useSettingsContext } from "../context/SettingsContext";
import { useStylesContext } from "../context/StylesContext";
import { Plugin } from "../types/Plugin";
//import { FaExpand, FaCompress } from 'react-icons/fa';

import "./ChatBotContainer.css";

const ChatBotContainer = ({
	plugins,
}: {
  plugins?: Array<Plugin>;
}) => {
	const isDesktop = useIsDesktopInternal();
	const { settings } = useSettingsContext();
	const { styles } = useStylesContext();
	const { hasFlowStarted, setHasFlowStarted } = useBotStatesContext();
	const { inputRef } = useBotRefsContext();

	const {
		setChatScrollHeight,
		viewportHeight,
		viewportWidth,
		isChatWindowOpen,
		isExpanded,
		toggleExpandChat,
	} = useChatWindowInternal();

	const { headerButtons, chatInputButtons, footerButtons } = useButtonInternal();
	useBotEffectsInternal();
	usePluginsInternal(plugins);

	const windowStateClass = useMemo(() => {
		const windowClass = "rcb-chatbot-global ";
		if (settings.general?.embedded) {
			return windowClass + "rcb-window-embedded";
		} else if (isChatWindowOpen) {
			return windowClass + "rcb-window-open";
		}
		return windowClass + "rcb-window-close";
	}, [settings, isChatWindowOpen]);

	const getChatWindowStyle = () => {
		if (isExpanded) {
			return {
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				zIndex: 10000,
				borderRadius: 0,
				margin: 0,
				...styles.chatWindowStyle
			};
		}

		if (!isDesktop && !settings.general?.embedded) {
			return {
				...styles.chatWindowStyle,
				borderRadius: "0px",
				left: "0px",
				right: "auto",
				top: "0px",
				bottom: "auto",
				width: `${viewportWidth}px`,
				height: `${viewportHeight}px`,
				zIndex: 10000,
			};
		}

		if (!settings.general?.embedded) {
			return {
				...styles.chatWindowStyle,
				zIndex: 10000,
			};
		}

		return { ...styles.chatWindowStyle };
	};

	const shouldShowChatBot = () => {
		return (isDesktop && settings.device?.desktopEnabled)
      || (!isDesktop && settings.device?.mobileEnabled);
	};

	return (
		<>
			{shouldShowChatBot() &&
			<div
				onMouseDown={(event: MouseEvent) => {
        		if (!hasFlowStarted && settings.general?.flowStartTrigger === "ON_CHATBOT_INTERACT") {
        			setHasFlowStarted(true);
        		}
        		isDesktop ? inputRef.current?.blur() : event?.preventDefault();
        	}}
				className={windowStateClass}
			>
				<ChatBotTooltip />
				<ChatBotButton />

				{isChatWindowOpen && !isDesktop && !settings.general?.embedded &&
				<>
					<style>
						{`
                  html {
                    overflow: hidden !important;
                    touch-action: none !important;
                    scroll-behavior: auto !important;
                  }
                `}
					</style>
					<div
						style={{
            			position: "fixed",
            			top: 0,
            			left: 0,
            			width: "100%",
            			height: "100%",
            			backgroundColor: "#fff",
            			zIndex: 9999
            		}}
            	/>
				</>
        	}

				<div style={getChatWindowStyle()} className="rcb-chat-window">
					{settings.general?.showHeader && <ChatBotHeader buttons={headerButtons} isExpanded={isExpanded} toggleExpandChat={toggleExpandChat} />}

					

					<ChatBotBody setChatScrollHeight={setChatScrollHeight} />
					<ToastContainer />
					{settings.general?.showInputRow && <ChatBotInput buttons={chatInputButtons} />}
					{settings.general?.showFooter && <ChatBotFooter buttons={footerButtons} />}
				</div>
			</div>
			}
		</>
	);
};

export default ChatBotContainer;
