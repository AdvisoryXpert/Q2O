import { useState, useRef, useEffect } from "react";
import { getUserId } from "./services/AuthService";
import { http } from './lib/http';
import ChatBot from "./components/ChatBot";

type DealerData = {
  full_name: string;
  phone: string;
  email: string;
  location: string;
  dealer_type: string;
  account_type: string;
}

function App() {
	// Guard to mount ChatBot only once in React 18 StrictMode (dev)
	const mountChatRef = useRef(false);
	const [mountChat, setMountChat] = useState(false);
	useEffect(() => {
		if (mountChatRef.current) return;
		mountChatRef.current = true;
		setMountChat(true);
	}, []);

	// Initial state
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
	});
  
	const creationLock = useRef(false);

	const cleanInput = (input: string | undefined): string => {
		return input?.trim() || "";
	};

	const createQuotation = async (dealerData: any, total_price: number, product_id: number, user_id: number) => {
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
			console.error("Error saving dealer, quotation & item:", error.response?.data || error.message);
			throw error; // Re-throw to be caught by the calling function
		}
	};

	// Fetch existing dealer ID from previous quotes
	useEffect(() => {
		if (state.dealerData.phone && state.dealerData.phone.length >= 10) {
			const fetchDealerId = async () => {
				try {
					const { data: quotes } = await http.get(
						`/quotes/by-phone/${state.dealerData.phone}`
					);
					if (quotes.length > 0 && quotes[0].dealer_id) {
						setStatus(prev => ({ ...prev, existingDealerId: quotes[0].dealer_id }));
					} else {
						setStatus(prev => ({ ...prev, existingDealerId: null }));
					}
				} catch (err) {
					console.error("Error fetching quotes:", err);
					setStatus(prev => ({ ...prev, existingDealerId: null }));
				}
			};
			fetchDealerId();
		}
	}, [state.dealerData.phone]);

	const flow: Flow = {
		start: {
			message: "Welcome to the RO CPQ System! Is this quote for a Dealer or an Individual?",
			options: ["Dealer", "Individual"],
			path: async (params: Params) => {
				const type = cleanInput(params.userInput) === "Individual" ? "Individual" : "Dealer";
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						dealer_type: type,
					},
				}));

				try {
					const { data } = await http.get(`/account-types?category=${type}`);
					const accountTypeNames = data.map((t: any) => t.account_type_name);
					setAccountTypes(accountTypeNames);
				} catch (err) {
					console.error("Error fetching account types:", err);
				}

				return "ask_account_type";
			},
		},

		ask_account_type: {
			message: "What is your account type?",
			options: () => accountTypes,
			path: (params: Params) => {
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						account_type: cleanInput(params.userInput) || "Default",
					},
				}));
				return "choose_flow";
			},
		},

		choose_flow: {
			message: "Please choose one of the following flows:",
			options: ["Design-Based Quote Flow", "TDS-Hardness Based Flow"],
			path: (params: Params) => {
				const input = cleanInput(params.userInput);
				if (input === "Design-Based Quote Flow") return "design_flow_start";
				if (input === "TDS-Hardness Based Flow") return "ask_name";
				return "choose_flow";
			},
		},

		design_flow_start: {
			message: "🔧 Design-Based Flow selected. (API will be added later)",
			path: "end",
		},

		ask_name: {
			message: "Please enter name of associate:",
			path: (params: Params) => {
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						full_name: cleanInput(params.userInput),
					},
				}));
				return "ask_contact";
			},
		},

		ask_contact: {
			message: "Please enter valid contact detail:",
			path: (params: Params) => {
				const phone = cleanInput(params.userInput);
				const isValid = /^[6-9]\d{9}$/.test(phone);
		
				if (!isValid) {
					// Stay in the same step and ask again
					return "ask_contact";
				}
		
				setState(prev => ({
					...prev,
					dealerData: {
						...prev.dealerData,
						phone: phone,
					},
				}));
		
				return "check_existing_quotes";
			},
		},		

		check_existing_quotes: {
			message: async () => {
				try {
					const { data: dealers } = await http.get(`/dealers/by-phone/${state.dealerData.phone}`);
					const dealer = dealers[0]; 

					if (!dealer || !dealer.dealer_id) {
						return `No dealer found for this number.
						 Would you like to create a new dealer and proceed? (yes/no)`;
					}

					// Store dealer_id to avoid creating a new one later
					setStatus(prev => ({ ...prev, existingDealerId: dealer.dealer_id }));

					// 🟡 Step 2: Check if dealer has existing quotes
					const { data: quotes } = await http.get(`/quotes/by-phone/${state.dealerData.phone}`);

					if (quotes.length === 0) {
						return `Dealer found, but no quotes exist. 
						Do you want to create a new quotation? (yes/no)`;
					}

					const quoteList = quotes
						.map(
							(q: any, i: number) =>
								`${i + 1}. Quote ID: ${q.quote_id}, Status: ${q.status}, 
							Assigned To: ${q.user_name || "N/A"}`
						)
						.join("\n");

					return `Existing Dealer Found ✅\nQuotes:\n${quoteList}
					\n\nProceed with new quotation? (yes/no)`;

				} catch (err) {
					console.error("Error checking dealer or quotes:", err);
					return `Error fetching data. 
					Do you want to continue anyway? (yes/no)`;
				}
			},
			path: (params: Params) => {
				const input = cleanInput(params.userInput).toLowerCase();
				return input === "yes" ? "ask_tds" : "end";
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
			message: "Do you want to generate a quote? (Type 'yes' to confirm)",
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

					// Prepare payload - maintains original structure
					const dealerPayload = {
						...state.dealerData,
						tds_level: state.tdsLevel,
						hardness_level: state.hardnessLevel,
						// Only add dealer_id if we found an existing one
						...(status.existingDealerId ? { dealer_id: status.existingDealerId } : {})
					};

					const total_price = 5000;
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
			message: "✅ Thank you for using the RO CPQ system! Type anything to restart.",
			path: "start",
		},
	};

	return (
		<div className="App">
			<header className="App-header">
				<div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20vh" }}>
					{mountChat && (
						<ChatBot
							id="chatbot-id"
							flow={flow}
							settings={{
								audio: { disabled: false },
								chatInput: { botDelay: 1000 },
								userBubble: { showAvatar: true },
								botBubble: { showAvatar: true },
								voice: { disabled: false },
								sensitiveInput: { asterisksCount: 6 },
								header: { title: "RO Supplier Chennai" },
							}}
						/>
					)}
				</div>
			</header>
		</div>
	);
}

export default App;