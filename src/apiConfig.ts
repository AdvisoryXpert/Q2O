// src/apiConfig.ts
const API = import.meta.env.VITE_API;

if (!API) {
	throw new Error("VITE_API is not defined in your environment");
}

export default API;