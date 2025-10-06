import React, { useEffect, useMemo, useState } from "react";
import {
	Drawer,
	Box,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	IconButton,
	Tooltip,
	Divider,
	Toolbar,
	Typography,
	useMediaQuery,
	useTheme,
	Button,
	CssBaseline,
	GlobalStyles,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import qorzaLogo from "../../assets/Qorza.png";
import { navIcons, type NavItem } from "./navIcons";
import { http } from "../lib/http";
import { clearSessionCache, getUserName } from "../services/AuthService";
import { default as ChatWidget } from "../App";

const DRAWER_WIDTH_EXPANDED = 240;
const DRAWER_WIDTH_COLLAPSED = 72;



const TopAppBar: React.FC = () => {
	const theme = useTheme();
	const mdDown = useMediaQuery(theme.breakpoints.down("md"));
	const [open, setOpen] = useState<boolean>(!mdDown);
	const [userName, setUserName] = useState<string | null>(null);
	

	const navigate = useNavigate();
	const location = useLocation();

	// remove legacy top spacing inside pages
	useEffect(() => {
		document.body.classList.add("no-topbar");
		return () => document.body.classList.remove("no-topbar");
	}, []);

	// keep open state in sync with breakpoint
	useEffect(() => setOpen(!mdDown), [mdDown]);

	useEffect(() => {
		(async () => {
			setUserName(await getUserName());
		})();
	}, [location.pathname]);

	const handleLogout = async () => {
		try { await http.post("/logout"); } catch {}
		clearSessionCache();
		navigate("/login");
	};

	const toggle = () => setOpen((o) => !o);
	const drawerWidth = open ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_COLLAPSED;

	// ⬇️ CRITICAL: drive the layout with a CSS var so pages can use left: var(--app-drawer-width)
	useEffect(() => {
		const w = mdDown ? 0 : drawerWidth;
		document.documentElement.style.setProperty("--app-drawer-width", `${w}px`);
	}, [drawerWidth, mdDown]);

	const drawerContent = useMemo(
		() => (
			<Box
				role="navigation"
				sx={{
					width: mdDown ? DRAWER_WIDTH_EXPANDED : drawerWidth,
					display: "flex",
					flexDirection: "column",
					height: "100%",
				}}
			>
				{open && (
					<Box sx={{ p: 2, textAlign: 'center' }}>
						<Link to="/">
							<img
								src={qorzaLogo}
								alt="Quotation to Order"
								style={{ width: '70%', borderRadius: '8px' }}
							/>
						</Link>
					</Box>
				)}
				<Toolbar sx={{ minHeight: 64, px: 1.5, gap: 1 }}>
					<IconButton onClick={toggle} aria-label="Toggle navigation">
						{open ? <MenuOpenIcon sx={{ color: 'white' }} /> : <MenuIcon sx={{ color: 'white' }} />}
					</IconButton>
					
				</Toolbar>

				<Divider />

				<Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
					<List disablePadding>
						{navIcons.map((item: NavItem) => {
							const active = item.link && location.pathname.startsWith(item.link);
							const btn = (
								<ListItemButton
									selected={!!active}
									onClick={() => {
										if (item.link) navigate(item.link);
										if (mdDown) setOpen(false);
									}}
									sx={{
										px: 1.5,
										color: "white",
										"&.Mui-selected": {
											bgcolor: "rgba(255, 255, 255, 0.2)",
										},
										"&:hover": {
											bgcolor: "rgba(0, 0, 0, 0.1)",
										},
										"& .MuiListItemIcon-root": {
											minWidth: 0,
											mr: !mdDown && open ? 1.5 : 0,
											justifyContent: "center",
											color: "white",
										},
									}}								>
									<ListItemIcon>{React.cloneElement(item.icon, { fontSize: "medium" })}</ListItemIcon>
									{(!mdDown && open) || mdDown ? <ListItemText primary={item.label} /> : null}
								</ListItemButton>
							);
							return (
								<ListItem key={item.label} disablePadding sx={{ display: "block" }}>
									{!mdDown && !open ? (
										<Tooltip title={item.label} placement="right">{btn}</Tooltip>
									) : (
										btn
									)}
								</ListItem>
							);
						})}
					</List>
				</Box>

				<Divider />
				<Box sx={{ px: 1.5, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
					<AccountCircleIcon />
					{open ? (
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
								{userName ? `Welcome, ${userName}` : "Welcome"}
							</Typography>
							<Button onClick={handleLogout} startIcon={<LogoutIcon sx={{ color: 'white' }} />} size="small" sx={{ mt: 0.5, textTransform: "none", color: "white" }}>
								Logout
							</Button>
						</Box>
					) : (
						<Tooltip title="Logout">
							<IconButton onClick={handleLogout} size="small">
								<LogoutIcon fontSize="small" sx={{ color: 'white' }} />
							</IconButton>
						</Tooltip>
					)}
				</Box>
			</Box>
		),
		[mdDown, open, drawerWidth, navigate, location.pathname, userName]
	);

	return (
		<Box sx={{ minHeight: "100vh" }}>
			<CssBaseline />

			{/* Global helpers */}
			<GlobalStyles
				styles={{
					":root": {
						// defaults; updated dynamically in the effect above:
						"--app-drawer-width": `${DRAWER_WIDTH_EXPANDED}px`,
						"--app-header-height": "56px",
					},
					"html, body, #root": { height: "100%", width: "100%" },
					body: { margin: 0, overflowX: "hidden" },

					/* Remove legacy top spacing inside pages */
					"body.no-topbar main": { paddingTop: 0, marginTop: 0 },
					"body.no-topbar main > .MuiToolbar-root:first-child": {
						display: "none !important", height: 0, minHeight: 0, paddingTop: 0, marginTop: 0,
					},
					"body.no-topbar main > .toolbar-spacer, \
           body.no-topbar main > .app-top-spacer, \
           body.no-topbar main > .page-toolbar-spacer": {
						display: "none !important", height: 0, minHeight: 0, paddingTop: 0, marginTop: 0,
					},

					/* Smooth resize for fixed pages that use left: var(--app-drawer-width) */
					".app-page-fixed": {
						transition: "left 200ms ease, width 200ms ease",
					},
				}}
			/>

			{/* Drawer */}
			{mdDown ? (
				<Drawer
					variant="temporary"
					open={open}
					onClose={() => setOpen(false)}
					ModalProps={{ keepMounted: true }}
					PaperProps={{ sx: { width: DRAWER_WIDTH_EXPANDED, boxSizing: "border-box" } }}
				>
					{drawerContent}
				</Drawer>

			) : (
				<Drawer
					variant="permanent"
					open
					sx={{
						width: drawerWidth,
						"& .MuiDrawer-paper": {
							width: drawerWidth,
							boxSizing: "border-box",
							position: "fixed",
							top: 0,
							left: 0,
							height: "100vh",
							overflowX: "hidden",
							transition: (t) =>
								t.transitions.create("width", {
									easing: t.transitions.easing.sharp,
									duration: t.transitions.duration.shortest,
								}),
							zIndex: theme.zIndex.drawer,
							background: "linear-gradient(45deg, #2196F3 30%, #64B5F6 90%)",
						},
					}}
				>
					{drawerContent}
				</Drawer>
			)}

			{/* Main outlet – push with margin-left to avoid overlap with the drawer */}
			<Box
				component="main"
				sx={{
					p: 0,
					minHeight: "100vh",
					boxSizing: "border-box",
					position: "relative",
					ml: `var(--app-drawer-width)`,
					width: `calc(100% - var(--app-drawer-width))`,
					transition: (t) =>
						t.transitions.create(["margin-left", "width"], {
							easing: t.transitions.easing.sharp,
							duration: t.transitions.duration.shortest,
						}),
				}}
			>
				<Outlet />
			</Box>

			{/* Chatbot */}
			<Box sx={{ position: "fixed", right: 16, bottom: 16, zIndex: theme.zIndex.modal + 1 }}>
				<ChatWidget />
			</Box>
		</Box>
	);
};

export default TopAppBar;