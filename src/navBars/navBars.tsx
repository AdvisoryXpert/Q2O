// navBars.tsx
import { useEffect, useState } from 'react';
import { getUserMobile, getUserRole } from '../services/AuthService';
import { navIcons } from './navIcons';
import axios from 'axios';
import { ReactElement } from 'react';
import API from '../apiConfig'; 
type NavItem = {
	icon: ReactElement;
	label: string;
	link: string;
};

export const useNavAccess = () => {
	const [filteredIcons, setFilteredIcons] = useState<NavItem[]>([]);

	useEffect(() => {
		const fetchAccess = async () => {
			const mobile = await getUserMobile();
			const role = await getUserRole();

			if (!mobile || !role) return;

			try {
				const res = await axios.get(`${API}/api/user-access?mobile=${mobile}&role=${role}`);
				const allowedLabels = res.data.access;
				setFilteredIcons(navIcons.filter(icon => allowedLabels.includes(icon.label)));
			} catch (err) {
				console.error('Error fetching access:', err);
			}
		};

		fetchAccess();
	}, []);

	return filteredIcons;
};
