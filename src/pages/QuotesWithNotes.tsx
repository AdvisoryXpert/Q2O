import React, { useEffect, useState } from 'react';
import {
	Box,
	Typography,
	Button,
	TextField,
	Paper
} from '@mui/material';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import TopAppBar from '../navBars/topAppBar';

import { useNavAccess } from '../navBars/navBars';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { http } from '../lib/http'; 
const QuotesWithNotes: React.FC = () => {
	const navItems = useNavAccess();
	const [quotes, setQuotes] = useState<any[]>([]);
	const [notes, setNotes] = useState<any[]>([]);
	const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
	const [noteContent, setNoteContent] = useState('');
	const [searchText, setSearchText] = useState('');

	const fetchQuotes = async () => {
		try {
			const res = await http.get('/quotes');
			setQuotes(res.data);
		} catch (error) {
			console.error('Error fetching quotes:', error);
		}
	};

	const fetchNotes = async (quoteId: number) => {
		try {
			const res = await http.get(`/notes/${quoteId}`);
			setNotes(res.data || []);
		} catch {
			setNotes([]);
		}
	};

	useEffect(() => {
		fetchQuotes();
	}, []);

	const handleRowClick = (row: any) => {
		setSelectedQuoteId(row.quote_id);
		fetchNotes(row.quote_id);
		setNoteContent('');
	};

	const saveNote = async () => {
		if (!selectedQuoteId) return;
		try {
			await http.post(`/notes/${selectedQuoteId}`, {
				content: noteContent,
			});
			setNoteContent('');
			fetchNotes(selectedQuoteId);
			alert('Note saved successfully!');
		} catch {
			alert('Error saving note.');
		}
	};

	const downloadNote = () => {
		if (!selectedQuoteId || !noteContent) return;
		const blob = new Blob([noteContent], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `Quote-${selectedQuoteId}-Note.html`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const filteredQuotes = quotes.filter(q =>
		`${q.quote_id} ${q.dealer_id} ${q.status}`.toLowerCase().includes(searchText.toLowerCase())
	);

	const columns: MRT_ColumnDef<any>[] = [
		{ accessorKey: 'quote_id', header: 'Quote ID' },
		{ accessorKey: 'user_id', header: 'User ID' },
		{ accessorKey: 'dealer_id', header: 'Dealer ID' },
		{ accessorKey: 'total_price', header: 'Total Price' },
		{ accessorKey: 'status', header: 'Status' },
		{
			accessorKey: 'date_created',
			header: 'Date Created',
			Cell: ({ cell }) => new Date(cell.getValue() as string).toLocaleDateString(),
		},
	];

	return (
		<>
			<TopAppBar navItems={navItems} />
			<Box sx={{ p: 2, mt: 10 }}>
				<Typography variant="h5" mb={2}>Quote Notes</Typography>

				<TextField
					fullWidth
					label="Search Quotes"
					variant="outlined"
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
					sx={{ mb: 2 }}
				/>

				<MaterialReactTable
					columns={columns}
					data={filteredQuotes}
					initialState={{ pagination: { pageSize: 5 } }}
					muiTableBodyRowProps={({ row }) => ({
						onClick: () => handleRowClick(row.original),
						sx: {
							cursor: 'pointer',
							backgroundColor: selectedQuoteId === row.original.quote_id ? '#e3f2fd' : 'inherit',
						},
					})}
				/>

				{selectedQuoteId && (
					<Paper sx={{ mt: 4, p: 3 }}>
						<Typography variant="h6" gutterBottom>
							Write Note for Quote #{selectedQuoteId}
						</Typography>

						<ReactQuill
							theme="snow"
							value={noteContent}
							onChange={setNoteContent}
							style={{ height: '200px', marginBottom: '20px', backgroundColor: '#fff' }}
						/>

						<Box sx={{ display: 'flex', gap: 2 }}>
							<Button variant="outlined" onClick={downloadNote}>Download Note</Button>
							<Button variant="contained" onClick={saveNote}>Save Note</Button>
						</Box>
					</Paper>
				)}

				{notes.length > 0 && (
					<Paper sx={{ mt: 4, p: 3, backgroundColor: '#fffde7' }}>
						<Typography variant="h6" gutterBottom>Previous Notes</Typography>
						{notes.map((note) => (
							<Box key={note.note_id} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
								<Typography variant="caption" sx={{ color: 'gray' }}>
									{note.created_at ? new Date(note.created_at).toLocaleString() : 'No Date Available'}
								</Typography>
								<div
									dangerouslySetInnerHTML={{ __html: typeof note.note_text === 'string' ? 
										note.note_text : JSON.stringify(note.note_text) }}
									style={{ marginTop: '8px', fontSize: '0.95rem' }}
								/>
							</Box>
						))}
					</Paper>
				)}
			</Box>
			
		</>
	);
};

export default QuotesWithNotes;
