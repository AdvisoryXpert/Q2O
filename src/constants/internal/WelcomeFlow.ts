import { Flow } from "../../types/Flow";
import { Params } from "../../types/Params";

// default welcome options
const helpOptions = ["Quickstart", "API Docs", "Examples", "Github", "Discord"];

// default provided welcome flow if user does not pass in a flow to the chat bot
export const WelcomeFlow: Flow = {
	start: {
		message: "Hello, Welcome to React ChatBot, I'm excited that you are using our " +
			"chatbot 😊!",
		transition: {duration: 1000},
		chatDisabled: true,
		path: "show_options"
	},
	show_options: {
		message: "It looks like you have not set up a conversation flow yet. No worries! Here are a few helpful " +
			"things you can check out to get started:",
		options: helpOptions,
		path: "process_options"
	},
	prompt_again: {
		message: "Do you need any other help?",
		options: helpOptions,
		path: "process_options"
	},
	unknown_input: {
		message: "Sorry, I do not understand your message 😢! If you require further assistance, you may click on " +
			"the Github option and open an issue there or visit our discord.",
		options: helpOptions,
		path: "process_options"
	},
	process_options: {
		transition: {duration: 0},
		path: (params: Params) => {
			let link = "";
			switch (params.userInput) {
			case "Quickstart":
				link = "";
				break;
			case "API Docs":
				link = "";
				break;
			case "Examples":
				link = "";
				break;
			case "Github":
				link = "";
				break;
			case "Discord":
				link = "";
				break;
			default:
				return "unknown_input";
			}
			params.injectMessage("Sit tight! I'll send you right there!");
			setTimeout(() => {
				window.open(link);
			}, 1000)
			return "repeat"
		},
	},
	repeat: {
		transition: {duration: 3000},
		path: "prompt_again"
	},
}
