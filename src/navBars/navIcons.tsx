// src/components/navicons.tsx
import type { ReactElement } from 'react';
import Home from '@mui/icons-material/Home';
import ContactsIcon from '@mui/icons-material/Contacts';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FireTruck from '@mui/icons-material/LocalShipping';
import QuotesIcon from '@mui/icons-material/AddShoppingCart';
import Quotation from '@mui/icons-material/RequestQuoteSharp';
import ServiceRequest from '@mui/icons-material/MiscellaneousServices';
import UserAdmin from '@mui/icons-material/AdminPanelSettings';
import Warranty from '@mui/icons-material/Warehouse';
import POS from '@mui/icons-material/PointOfSale';
import FollowUp from '@mui/icons-material/LocalActivity';
import ProductAdmin from '@mui/icons-material/Inventory';
import PricingAdmin from '@mui/icons-material/PriceCheck';
import AnalyticsIcon from '@mui/icons-material/Analytics';

export type NavItem = {
  icon: ReactElement;
  label: string;
  link: string;
};

export const navIcons: NavItem[] = [
	{ icon: <Home />, label: 'Home', link: '/Home' },
	{ icon: <ContactsIcon />, label: 'Dealers', link: '/contacts' },
	{ icon: <QuotesIcon />, label: 'Quotes', link: '/quotation' },
	{ icon: <Quotation />, label: 'QuotesPage', link: '/QuotationPage' },
	{ icon: <AssignmentIcon />, label: 'Orders', link: '/orders' },
	{ icon: <FireTruck />, label: 'LR Item', link: '/lr-item' },
	{ icon: <ServiceRequest />, label: 'SR', link: '/serviceRequest' },
	{ icon: <FollowUp />, label: 'Followup', link: '/FollowUp' },
	{ icon: <UserAdmin />, label: 'UserAdmin', link: '/UserAdmin' },
	{ icon: <AnalyticsIcon />, label: 'Analytics', link: '/Analytics' },
	{ icon: <Warranty />, label: 'Warranty', link: '/Warranty' },
	{ icon: <POS />, label: 'POS', link: '/PointOfSales' },
	{ icon: <ProductAdmin />, label: 'ProductAdmin', link: '/ProductAdmin' },
	{ icon: <PricingAdmin />, label: 'PricingAdmin', link: '/PricingAdmin' },
];
