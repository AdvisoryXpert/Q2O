import { MouseEvent } from "react";

import { useChatWindowInternal } from "../../../hooks/internal/useChatWindowInternal";
import { useSettingsContext } from "../../../context/SettingsContext";
import { useStylesContext } from "../../../context/StylesContext";

import "./CloseChatButton.css";  // Reuse the CSS

/**
 * Handles expanding / restoring chat window.
 */
const ExpandChatButton = () => {
  const { settings } = useSettingsContext();
  const { styles } = useStylesContext();
  const { toggleExpandChat } = useChatWindowInternal();  // Assume you have or will add this

  const expandChatIconStyle: React.CSSProperties = {
    backgroundImage: `url(${settings.header?.expandChatIcon})`,
    fill: "#e8eaed",
    stroke: "#e8eaed",
    ...styles.expandChatIconStyle
  };

  const renderButton = () => {
    const IconComponent = settings.header?.expandChatIcon;
    if (!IconComponent || typeof IconComponent === "string") {
      return (
        <span
          className="rcb-close-chat-icon"
          data-testid="rcb-expand-chat-icon"
          style={expandChatIconStyle}
        />
      )
    }
    return (
      IconComponent && (
        <span className="rcb-close-chat-icon" data-testid="rcb-expand-chat-icon">
          <IconComponent style={expandChatIconStyle} />
        </span>
      )
    );
  };

  return (
    <div
      aria-label={settings.ariaLabel?.expandChatButton ?? "expand chat"}
      role="button"
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        toggleExpandChat();  // Your logic to maximize/restore
      }}
      style={{ ...styles.expandChatButtonStyle }}
    >
      {renderButton()}
    </div>
  );
};

export default ExpandChatButton;
