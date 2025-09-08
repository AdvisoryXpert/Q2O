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
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { navIcons, type NavItem } from "./navIcons";
import aquapotLogo from "../images/aquapot-logo-r.jpg";
import { http } from "../lib/http";
import { clearSessionCache, getUserName } from "../services/AuthService";
import ChatWidget from "../App";

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
		(async () => setUserName(await getUserName()))();
	}, []);

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
				<Toolbar sx={{ minHeight: 64, px: 1.5, gap: 1 }}>
					<IconButton onClick={toggle} aria-label="Toggle navigation">
						{open ? <MenuOpenIcon /> : <MenuIcon />}
					</IconButton>
					{(!mdDown && open) || mdDown ? (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}>
							<img src={aquapotLogo} alt="Aquapot" style={{ height: 28, borderRadius: 6 }} />
							Aquapot
						</Box>
					) : null}
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
										"&.Mui-selected": { bgcolor: "action.selected" },
										"& .MuiListItemIcon-root": {
											minWidth: 0,
											mr: !mdDown && open ? 1.5 : 0,
											justifyContent: "center",
										},
									}}
								>
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
							<Button onClick={handleLogout} startIcon={<LogoutIcon />} size="small" sx={{ mt: 0.5, textTransform: "none" }}>
								Logout
							</Button>
						</Box>
					) : (
						<Tooltip title="Logout">
							<IconButton onClick={handleLogout} size="small">
								<LogoutIcon fontSize="small" />
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
						},
					}}
				>
					{drawerContent}
				</Drawer>
			)}

			{/* Main outlet – don't push with margin; pages are fixed and read the CSS var */}
			<Box
				component="main"
				sx={{
					// was: ml: `${drawerWidth}px`
					// Let fixed pages use left: var(--app-drawer-width) instead.
					p: 0,
					minHeight: "100vh",
					boxSizing: "border-box",
					position: "relative",
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
