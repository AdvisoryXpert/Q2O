import axios from 'axios';
import API from '../apiConfig';

type UserSessionData = {
    user_id: string;
    userMobile: string;
    userRole: string;
    userName: string;
}

let cachedSessionData: UserSessionData | null = null;

export const fetchSessionData = async (): Promise<UserSessionData | null> => {
	if (cachedSessionData) {
		return cachedSessionData;
	}
	try {
		const response = await axios.get(`${API}/api/session-data`, {
			withCredentials: true
		});
		if (response.status === 200 && response.data) {
			cachedSessionData = response.data;
			return response.data;
		}
		return null;
	} catch (error) {
		console.error("Error fetching session data:", error);
		cachedSessionData = null; // Clear cache on error
		return null;
	}
};

export const getUserId = async (): Promise<string | null> => {
	const data = await fetchSessionData();
	return data ? data.user_id : null;
};

export const getUserMobile = async (): Promise<string | null> => {
	const data = await fetchSessionData();
	return data ? data.userMobile : null;
};

export const getUserRole = async (): Promise<string | null> => {
	const data = await fetchSessionData();
	return data ? data.userRole : null;
};

export const getUserName = async (): Promise<string | null> => {
	const data = await fetchSessionData();
	return data ? data.userName : null;
};

export const clearSessionCache = () => {
	cachedSessionData = null;
};
