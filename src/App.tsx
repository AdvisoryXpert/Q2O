import { useState, useRef, useEffect } from "react";
import { getUserId } from "./services/AuthService";
import { http } from './lib/http';
import { Button } from "./constants/Button";
import AudioIcon from "./assets/audio_icon.svg?react";
import AudioIconDisabled from "./assets/audio_icon_disabled.svg?react";
import botAvatar from "./assets/bot_avatar.svg";
import CloseChatIcon from "./assets/close_chat_icon.svg?react";
import { FiRefreshCw } from "react-icons/fi";
import ChatBot from "./components/ChatBot";

/** ---------------- Types ---------------- */
type DealerData = {
  full_name: string;
  phone: string;
  email: string;
  location: string;
  dealer_type: string;
  account_type: string;
};

type QuoteRow = {
  quote_id: number;
  assigned_kam_name?: string | null;
  assigned_kam_id?: number | null;
  status?: string | null;
  user_name?: string | null; // fallback if KAM not available
};

/** ---------------- Component ---------------- */
function App(): JSX.Element {
	// Mount guard for StrictMode double-invoke
	const mountChatRef = useRef(false);
	const [mountChat, setMountChat] = useState(false);
	useEffect(() => {
		if (mountChatRef.current) return;
		mountChatRef.current = true;
		setMountChat(true);
		console.log("%c[App.tsx] Mounted", "color: orange; font-weight: bold;");
		return () => console.log("%c[App.tsx] Unmounted", "color: red; font-weight: bold;");
	}, []);

	/** ---------- Local state ---------- */
	const initialState = {
		dealerData: {
			full_name: "",
			phone: "",
			email: "",
			location: "Chennai",
			dealer_type: "Dealer",
			account_type: "Default",
		} as DealerData,
		tdsLevel: "",
		hardnessLevel: "",
	};

	const [state, setState] = useState(initialState);
	const [accountTypes, setAccountTypes] = useState<string[]>([]);
	const [status, setStatus] = useState({
		quoteCreated: false,
		isCreatingQuote: false,
		existingDealerId: null as string | null,
		existingQuotes: [] as QuoteRow[],
	});

	const creationLock = useRef(false);

	/** ---------- Helpers ---------- */
	const cleanInput = (input: string | undefined): string => input?.trim() || "";

	const validPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

	const createQuotation = async (
		dealerData: any,
		total_price: number,
		product_id: number,
		user_id: number
	) => {
		try {
			const payload = {
				...dealerData,
				tds_level: parseInt(dealerData.tds_level, 10),
				hardness_level: parseInt(dealerData.hardness_level, 10),
				total_price,
				product_id,
				user_id
			};
			const { data } = await http.post('/dealer-quotation', payload);
			return data.quote_id;
		} catch (error: any) {
			console.error("Error saving dealer, quotation & item:", error?.response?.data || error.message);
			throw error;
		}
	};

	/** ---------- Reactive: prefetch existing dealer_id from quotes by phone ---------- */
	useEffect(() => {
		if (state.dealerData.phone && state.dealerData.phone.length >= 10) {
			(async () => {
				try {
					const { data: quotes } = await http.get(`/quotes/by-phone/${state.dealerData.phone}`);
					if (Array.isArray(quotes) && quotes.length > 0) {
						// Try to capture dealer_id from the first item if available
						setStatus(prev => ({
							...prev,
							existingQuotes: quotes,
						}));
					} else {
						setStatus(prev => ({ ...prev, existingQuotes: [] }));
					}
				} catch (err) {
					console.error("Error prefetching quotes:", err);
					setStatus(prev => ({ ...prev, existingQuotes: [] }));
				}
			})();
		}
	}, [state.dealerData.phone]);

	/** ---------- Flow ---------- */
	const flow: Flow = {
		start: {
			message:
        "Welcome to the RO CPQ System! Is this quote for a Dealer or an Individual?",
			options: ["Dealer", "Individual"],
			path: async (params: Params) => {
				// Reset status for new quote
				setStatus({
					quoteCreated: false,
					isCreatingQuote: false,
					existingDealerId: null,
					existingQuotes: [],
				});
				setState(initialState);

				const type = cleanInput(params.userInput) === "Individual" ? "Individual" : "Dealer";
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						dealer_type: type,
					},
				}));

				// Load account types for the selected category
				try {
					const { data } = await http.get(`/account-types?category=${type}`);
					const accountTypeNames = Array.isArray(data) ? data.map((t: any) => t.account_type_name) : [];
					setAccountTypes(accountTypeNames);
				} catch (err) {
					console.error("Error fetching account types:", err);
					setAccountTypes(["Default"]);
				}

				return "ask_account_type";
			},
		},

		ask_account_type: {
			message: "What is your account type?",
			options: () => (accountTypes.length ? accountTypes : ["Default"]),
			path: (_params: Params) => {
				const chosen = cleanInput(_params.userInput) || "Default";
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						account_type: chosen,
					},
				}));
				// → Immediately ask for phone number (no design-based option at all)
				return "ask_contact";
			},
		},

		ask_contact: {
			message: "Please enter a valid 10-digit phone number:",
			path: (params: Params) => {
				const phone = cleanInput(params.userInput);
				if (!validPhone(phone)) {
					// stay in same step
					return "ask_contact";
				}
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						phone,
					},
				}));
				return "check_existing";
			},
		},

		/** Check if dealer exists; if exists, do NOT prompt create. Show existing quotes (if any). */
		check_existing: {
			message: async () => {
				try {
					const phone = state.dealerData.phone;

					// 1) Is there a dealer?
					const { data: dealers } = await http.get(`/dealers/by-phone/${phone}`);
					const dealer = Array.isArray(dealers) ? dealers[0] : null;

					if (dealer && dealer.dealer_id) {
						setStatus(prev => ({ ...prev, existingDealerId: String(dealer.dealer_id) }));

						// 2) Fetch quotes for that phone
						const { data: quotes } = await http.get(`/quotes/by-phone/${phone}`);

						if (Array.isArray(quotes) && quotes.length > 0) {
							setStatus(prev => ({ ...prev, existingQuotes: quotes }));

							// Show ONLY Quote ID and KAM
							const quoteList = quotes
								.map(
									(q: any, i: number) =>
										`${i + 1}. Quote ID: ${q.quote_id}, Status: ${q.status}, 
							Assigned To: ${q.assigned_kam_name || "N/A"}, Created By: ${q.creator_name || "N/A"}`
								)
								.join("\n");

							return `Existing Dealer found ✅\nQuotes:\n${quoteList}\n\nDo you want to create a new quotation?`;
						}

						// Dealer exists but no quotes
						return "Dealer found. No quotes exist yet.\nDo you want to create a new quotation?";
					}

					// No dealer found
					setStatus(prev => ({ ...prev, existingDealerId: null, existingQuotes: [] }));
					return "No dealer found for this number. Would you like to create a new dealer and proceed?";
				} catch (err) {
					console.error("Error checking dealer/quotes:", err);
					return "Error fetching data. Do you want to continue anyway?";
				}
			},
			// Use buttons instead of free text
			options: ["Yes", "No"],
			path: (params: Params) => {
				const input = cleanInput(params.userInput).toLowerCase();
				// If dealer exists, Yes => proceed to TDS; No => end
				// If no dealer exists, Yes => ask for name then proceed; No => end
				const dealerKnown = !!status.existingDealerId;
				if (dealerKnown) {
					return input === "yes" ? "ask_tds" : "end";
				} else {
					return input === "yes" ? "ask_name" : "end";
				}
			},
		},

		/** Ask name ONLY when creating a new dealer */
		ask_name: {
			message: "Please enter the name of the associate:",
			path: (params: Params) => {
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						full_name: cleanInput(params.userInput),
					},
				}));
				return "ask_tds";
			},
		},

		ask_tds: {
			message: "Please enter the TDS level of your water (in ppm):",
			path: (params: Params) => {
				setState(prev => ({
					...prev,
					tdsLevel: cleanInput(params.userInput),
				}));
				return "ask_hardness";
			},
		},

		ask_hardness: {
			message: "What is the hardness level of your water (in mg/L)?",
			path: (params: Params) => {
				setState(prev => ({
					...prev,
					hardnessLevel: cleanInput(params.userInput),
				}));
				return "ask_generateQuote";
			},
		},

		ask_generateQuote: {
			message: "Do you want to generate a quote?",
			options: ["Yes", "No"], // ← buttons only
			path: (params: Params) => {
				const input = cleanInput(params.userInput).toLowerCase();
				return input === "yes" ? "recommend_product" : "end";
			},
		},

		recommend_product: {
			message: async () => {
				if (creationLock.current) return "Processing your request...";
				if (status.quoteCreated) return "Quotation already created. ✅";

				if (!state.dealerData.phone || !state.tdsLevel || !state.hardnessLevel) {
					return "Missing required information. Please start over.";
				}

				try {
					creationLock.current = true;
					setStatus(prev => ({ ...prev, isCreatingQuote: true }));

					// Prepare dealer payload
					const dealerPayload = {
						...state.dealerData,
						tds_level: state.tdsLevel,
						hardness_level: state.hardnessLevel,
						...(status.existingDealerId ? { dealer_id: status.existingDealerId } : {}),
					};

					const total_price = 0;
					const product_id = 101;
					const user_id = parseInt((await getUserId()) || "1");

					const quote_id = await createQuotation(
						dealerPayload,
						total_price,
						product_id,
						user_id
					);

					setStatus(prev => ({
						...prev,
						quoteCreated: true,
						isCreatingQuote: false,
					}));

					return `Quotation generated successfully!\nYour Quotation ID: ${quote_id}`;
				} catch (err) {
					console.error("Error:", err);
					return "Error creating quotation. Please try again.";
				} finally {
					creationLock.current = false;
				}
			},
			path: "end",
		},

		end: {
			message: "✅ Thank you for using the RO CPQ system! Would you like to start a new quote?",
			options: ["Yes, start new quote", "No, I'm done"],
			path: (params: Params) => {
				const input = cleanInput(params.userInput).toLowerCase();
				if (input.startsWith("yes")) {
					return "start";
				} else {
					return "final_end";
				}
			},
		},

		final_end: {
			message: "Great! Have a nice day."
		},
	};

	/** ---------- Render ---------- */
	return (
		<div className="App">
			<header className="App-header">
				<div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20vh" }}>
					{mountChat && (
						<ChatBot
							id="chatbot-id"
							flow={flow}
							settings={{
								audio: { disabled: false, icon: AudioIcon, iconDisabled: AudioIconDisabled },
								chatInput: { botDelay: 800 },
								userBubble: { showAvatar: true },
								botBubble: { showAvatar: true },
								voice: { disabled: false },
								sensitiveInput: { asterisksCount: 6 },
								header: {
									title: "RO Chat-Bot",
									buttons: [Button.NOTIFICATION_BUTTON, Button.AUDIO_BUTTON, "reset-button", Button.CLOSE_CHAT_BUTTON],
									showResetChatButtonLabel: true,
									resetChatIcon: FiRefreshCw,
									closeChatIcon: CloseChatIcon,
									showAvatar: true,
									avatar: botAvatar
								},
							}}
						/>
					)}
				</div>
			</header>
		</div>
	);
}

export default App;
