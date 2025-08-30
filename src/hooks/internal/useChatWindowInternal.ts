import { useCallback, useState } from "react";

import { useRcbEventInternal } from "./useRcbEventInternal";
import { useBotStatesContext } from "../../context/BotStatesContext";
import { useSettingsContext } from "../../context/SettingsContext";
import { RcbEvent } from "../../constants/RcbEvent";

/**
 * Internal custom hook for managing chat window logic.
 * Added the code for isexpanded
 */
export const useChatWindowInternal = () => {
	// handles settings
	const { settings } = useSettingsContext();

	// handles bot states
	const {
		isChatWindowOpen,
		setIsChatWindowOpen,
		viewportHeight,
		setViewportHeight,
		viewportWidth,
		setViewportWidth,
		setUnreadCount
	} = useBotStatesContext();

	// handles rcb events
	const { callRcbEvent } = useRcbEventInternal();

	// tracks scroll height
	const [chatScrollHeight, setChatScrollHeight] = useState<number>(0);

	// tracks expanded state
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const toggleExpandChat = useCallback(() => {
		setIsExpanded(prev => !prev);
	}, []);

	/**
   * Toggles chat window.
   */
	const toggleChatWindow = useCallback(async () => {
		if (settings.event?.rcbToggleChatWindow) {
			const event = await callRcbEvent(
				RcbEvent.TOGGLE_CHAT_WINDOW,
				{ currState: isChatWindowOpen, newState: !isChatWindowOpen }
			);
			if (event.defaultPrevented) {
				return;
			}
		}
		setIsChatWindowOpen(prev => {
			if (!prev) {
				setUnreadCount(0);
			}
			return !prev;
		});
	}, [isChatWindowOpen, settings, callRcbEvent, setIsChatWindowOpen, setUnreadCount]);

	/**
   * Handles opening/closing of the chat window.
   *
   * @param isOpen boolean indicating whether to open/close the chat window
   */
	const openChat = useCallback(async (isOpen: boolean) => {
		if (isChatWindowOpen === isOpen) {
			return;
		}
		await toggleChatWindow();
	}, [isChatWindowOpen, toggleChatWindow]);

	return {
		isChatWindowOpen,
		setIsChatWindowOpen,
		toggleChatWindow,
		openChat,
		chatScrollHeight,
		setChatScrollHeight,
		viewportHeight,
		setViewportHeight,
		viewportWidth,
		setViewportWidth,
		isExpanded,
		toggleExpandChat
	};
};
