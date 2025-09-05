// src/components/TopAppBar.tsx
import React, { useRef, useState, useEffect } from 'react';
import { clearSessionCache, getUserName } from '../services/AuthService';
import { AppBar, Box, Toolbar, IconButton, Typography, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import aquapotLogo from '../images/aquapot-logo-r.jpg';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { http } from '../lib/http';
import type { NavItem } from './navIcons'; // ⬅ reuse the shared type

type TopAppBarProps = {
  navItems: NavItem[];
};

const TopAppBar: React.FC<TopAppBarProps> = ({ navItems }) => {
	const navigate = useNavigate();
	const [userName, setUserName] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [showScroll, setShowScroll] = useState(false);

	useEffect(() => {
		const fetchUserName = async () => setUserName(await getUserName());
		fetchUserName();

		const checkScroll = () => {
			if (scrollRef.current) setShowScroll(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
		};

		checkScroll();
		window.addEventListener('resize', checkScroll);
		return () => window.removeEventListener('resize', checkScroll);
	}, [navItems]);

	const handleLogout = async () => {
		try {
			await http.post('/logout');
		} catch (error) {
			console.error('Error during logout API call:', error);
		}
		clearSessionCache();
		navigate('/');
	};

	const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
	const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

	return (
		<AppBar position="static" sx={{ background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)', p: 1 }}>
			<Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				{/* Logo */}
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					<img
						src={aquapotLogo}
						alt="Aquapot Logo"
						style={{ width: 100, height: 'auto', borderRadius: 8, marginRight: 16 }}
					/>
				</Box>

				{/* Scrollable Icons with arrows */}
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					{showScroll && (
						<IconButton onClick={scrollLeft} aria-label="Scroll left">
							<ArrowBackIosIcon sx={{ color: '#fff' }} />
						</IconButton>
					)}

					<Box
						ref={scrollRef}
						sx={{
							display: 'flex',
							gap: 2,
							overflowX: 'auto',
							scrollBehavior: 'smooth',
							scrollbarWidth: 'none',
							'&::-webkit-scrollbar': { display: 'none' },
						}}
					>
						{navItems.map((item) => (
							<Tooltip title={item.label} key={item.label} arrow>
								<Box
									onClick={() => item.link && navigate(item.link)}
									sx={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										cursor: 'pointer',
										color: '#fff',
										minWidth: 80,
										p: 1,
										transition: '0.3s',
										borderRadius: 2,
										'&:hover': { transform: 'scale(1.1)', backgroundColor: 
											'rgba(255,255,255,0.1)' },
									}}
								>
									<IconButton color="inherit" sx={{ mb: 0.5 }} aria-label={item.label}>
										{React.cloneElement(item.icon, { fontSize: 'large' })}
									</IconButton>
									<Typography variant="caption">{item.label}</Typography>
								</Box>
							</Tooltip>
						))}
					</Box>

					{showScroll && (
						<IconButton onClick={scrollRight} aria-label="Scroll right">
							<ArrowForwardIosIcon sx={{ color: '#fff' }} />
						</IconButton>
					)}
				</Box>

				{/* Right side: user + logout */}
				<Box sx={{ display: 'flex', alignItems: 'center' }}>
					<Typography sx={{ color: '#fff', fontWeight: 500, fontSize: '1rem' }}>
						{userName ? `Welcome, ${userName}` : ''}
					</Typography>
					<Tooltip title="Logout">
						<IconButton color="inherit" onClick={handleLogout} aria-label="Logout">
							<LogoutIcon />
						</IconButton>
					</Tooltip>
				</Box>
			</Toolbar>
		</AppBar>
	);
};

export default TopAppBar;
