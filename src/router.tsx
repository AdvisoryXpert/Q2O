import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./protectedroute";
import TopAppBar from "../src/navBars/topAppBar"; // ⬅️ the vertical drawer layout

// Public
import Login from "./pages/Login/Login";
import LandingPage from "./pages/LandingPage";
import TestScanner from "./pages/testScanner";

// Protected pages
import ChatBotHome from "./pages/ChatbotHome";
import SiteMap from "./pages/SiteMap";
import QuotesWithNotes from "./pages/QuotesWithNotes";
import LRReceiptPage from "./pages/LRReceipt";          // ⬅️ the cleaned page you shared
import Contact from "./pages/Contact";
import Quotation from "./pages/quotationItems";
import Orders from "./pages/Orders";
import QuotationPage from "./pages/QuotationPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ServiceRequest from "./pages/serviceRequest";
import UserAdmin from "./pages/UserAdminPage";
import OrdOrderLine from "./pages/orderDispatchview";
import OrdOrderLine_pos from "./pages/orderDispatchviewPOS";
import WarrantyTablePage from "./pages/WarrantyTablePage";
import PointOfSales from "./pages/POSSales";
import FollowUpScreen from "./pages/followUpScreen";
import ConsolidatedAdmin from "./pages/ConsolidatedAdmin";
import PricingAdmin from "./pages/PricingAdmin";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function Router() {
	return (
		<Routes>
			{/* Public */}
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<Login />} />
			<Route path="/test-scanner" element={<TestScanner />} />

			{/* ✅ Protected layout: ALL protected pages go inside this route */}
			<Route element={<ProtectedRoute><TopAppBar /></ProtectedRoute>}>
				<Route path="/Home" element={<ChatBotHome />} />
				<Route path="/Sitemap" element={<SiteMap />} />
				<Route path="/quotes-notes" element={<QuotesWithNotes />} />
				<Route path="/FollowUp" element={<FollowUpScreen />} />
				<Route path="/ProductAdmin" element={<ConsolidatedAdmin />} />
				<Route path="/PricingAdmin" element={<PricingAdmin />} />
				<Route path="/lr-item" element={<LRReceiptPage />} />
				<Route path="/contacts" element={<Contact />} />
				<Route path="/quotation" element={<Quotation />} />
				<Route path="/quotation-items/:id" element={<Quotation />} />
				<Route path="/serviceRequest" element={<ServiceRequest />} />
				<Route path="/serviceRequest/:id" element={<ServiceRequest />} />
				<Route path="/UserAdmin" element={<UserAdmin />} />
				<Route path="/Analytics" element={<AnalyticsPage />} />
				<Route path="/QuotationPage" element={<QuotationPage />} />
				<Route path="/PointOfSales" element={<PointOfSales />} />
				<Route path="/Warranty" element={<WarrantyTablePage />} />
				<Route path="/orders" element={<Orders />} />
				<Route path="/orders/:orderId" element={<OrderDetailPage />} />
				<Route path="/Order-Line-Items/:orderId" element={<OrdOrderLine />} />
				<Route path="/Order-Line-Items_POS/:orderId" element={<OrdOrderLine_pos />} />

				{/* Optional default */}
				<Route path="*" element={<Navigate to="/Home" replace />} />
			</Route>
		</Routes>
	);
}
