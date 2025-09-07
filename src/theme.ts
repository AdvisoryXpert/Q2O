import { createTheme } from '@mui/material/styles';

const theme = createTheme({
	palette: {
		primary: {
			main: '#1976d2', // A shade of blue
		},
		secondary: {
			main: '#dc004e', // A shade of red
		},
	},
	typography: {
		fontFamily: 'Roboto, sans-serif',
		h1: {
			fontSize: '2.5rem',
			fontWeight: 500,
		},
		h2: {
			fontSize: '2rem',
			fontWeight: 500,
		},
		// Add more typography variants as needed
	},
	// You can also customize spacing, breakpoints, etc.
});

export default theme;
