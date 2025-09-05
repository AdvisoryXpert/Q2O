import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login";
import ChatBot from "./pages/ChatbotHome";
import SiteMap from "./pages/SiteMap";
import QuotesWithNotes from "./pages/QuotesWithNotes";
import ProtectedRoute from "./protectedroute";
import LRReceipt from "./pages/LRReceipt";
import Contact from "./pages/Contact";
import Quotation from "./pages/quotationItems";
import Order from "./pages/Orders";
import QuotationPage from "./pages/QuotationPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ServiceRequest from "./pages/serviceRequest";
import UserAdmin from "./pages/UserAdminPage";
import OrdOrderLine from "./pages/orderDispatchview";
import OrdOrderLine_pos from "./pages/orderDispatchviewPOS";
import TestScanner from "./pages/testScanner";
import WarrantyTablePage from "./pages/WarrantyTablePage";
import PointOfSales from "./pages/POSSales";
//import QuotationFromCart from "./pages/quotationFromCart";
import FollowUpScreen from "./pages/followUpScreen";
import ConsolidatedAdmin from "./pages/ConsolidatedAdmin";
import PricingAdmin from "./pages/PricingAdmin";
import AnalyticsPage from "./pages/AnalyticsPage";
import LandingPage from "./pages/LandingPage";

const Router = () => {
	return (
		<Routes>
			{/* Public */}
			<Route path="/" element={<LandingPage />} />
			<Route path="/login" element={<Login />} />
			<Route path="/test-scanner" element={<TestScanner />} />

			{/* Protected */}
			<Route path="/Home" element={<ProtectedRoute><ChatBot /></ProtectedRoute>} />
			<Route path="/Sitemap" element={<ProtectedRoute><SiteMap /></ProtectedRoute>} />
			<Route path="/quotes-notes" element={<ProtectedRoute><QuotesWithNotes /></ProtectedRoute>} />
			<Route path="/FollowUp" element={<ProtectedRoute><FollowUpScreen /></ProtectedRoute>} />
			<Route path="/ProductAdmin" element={<ProtectedRoute><ConsolidatedAdmin /></ProtectedRoute>} />
			<Route path="/PricingAdmin" element={<ProtectedRoute><PricingAdmin /></ProtectedRoute>} />
			<Route path="/lr-item" element={<ProtectedRoute><LRReceipt /></ProtectedRoute>} />
			<Route path="/contacts" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
			<Route path="/quotation" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
			<Route path="/quotation-items/:id" element={<ProtectedRoute><Quotation /></ProtectedRoute>} />
			<Route path="/serviceRequest" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
			<Route path="/serviceRequest/:id" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
			<Route path="/UserAdmin" element={<ProtectedRoute><UserAdmin /></ProtectedRoute>} />
			<Route path="/Analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
			<Route path="/QuotationPage" element={<ProtectedRoute><QuotationPage /></ProtectedRoute>} />
			<Route path="/PointOfSales" element={<ProtectedRoute><PointOfSales /></ProtectedRoute>} />
			<Route path="/Warranty" element={<ProtectedRoute><WarrantyTablePage /></ProtectedRoute>} />
			<Route path="/orders" element={<ProtectedRoute><Order /></ProtectedRoute>} />
			<Route path="/Order-Line-Items/:orderId" element={<ProtectedRoute><OrdOrderLine /></ProtectedRoute>} />
			<Route path="/Order-Line-Items_POS/:orderId" 
				element={<ProtectedRoute><OrdOrderLine_pos /></ProtectedRoute>} />
			<Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
		</Routes>
	);
};

export default Router;
