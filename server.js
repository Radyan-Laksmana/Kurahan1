const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Expose uploads explicitly (also covered by express.static above)
app.use('/uploads', express.static(path.join('public', 'uploads')));

// Admin credentials
const ADMIN_USERNAME = 'AdminKurahan';
const ADMIN_PASSWORD = 'Naharuk1';

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized - Please login first' });
}

// Simple admin token auth for write operations (keeping for backward compatibility)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
function requireAdmin(req, res, next) {
	if (!ADMIN_TOKEN) {
		return res.status(500).json({ error: 'Server admin token not configured' });
	}
	const authHeader = req.header('authorization') || '';
	const altHeader = req.header('x-admin-token') || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : altHeader;
	if (token && token === ADMIN_TOKEN) return next();
	return res.status(401).json({ error: 'Unauthorized' });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname || '').toLowerCase();
		const base = path.basename(file.originalname || 'upload', ext).replace(/[^a-z0-9-_]/gi, '_');
		cb(null, `${Date.now()}_${base}${ext}`);
	}
});
const upload = multer({ storage });

// Load credentials
let credentials;
try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (error) {
    console.error('Error loading GOOGLE_CREDENTIALS from env:', error.message);
    process.exit(1);
}

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const spreadsheetId = '1c_SPp4R6KlL6e3-EfRY0dtK4rfhFrCn5i4sz7cUXr30';

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Check authentication status
app.get('/auth/status', (req, res) => {
    res.json({ 
        isAuthenticated: !!(req.session && req.session.isAuthenticated),
        username: req.session?.username || null
    });
});

async function getSheet() {
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// READ - Get all data from spreadsheet
app.get('/data', async (req, res) => {
    try {
        const sheets = await getSheet();
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1'
        });
        
        // Process the data to handle image URLs better
        let processedData = result.data.values || [];
        
        // If there's data, process image columns
        if (processedData.length > 1) {
            for (let i = 1; i < processedData.length; i++) {
                const row = processedData[i];
                
                // Process image columns (E and I columns based on your structure)
                if (row[4]) { // Column E - Gambar
                    row[4] = processImageUrl(row[4]);
                }
                if (row[8]) { // Column I - Gambar (duplicate)
                    row[8] = processImageUrl(row[8]);
                }
                if (row[15]) { // Column P - Gambar UMKM
                    row[15] = processImageUrl(row[15]);
                }
            }
        }
        
        console.log('Successfully fetched data from spreadsheet');
        res.json(processedData);
    } catch (error) {
        console.error('Error fetching data from spreadsheet:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch data from spreadsheet',
            details: error.message 
        });
    }
});

// Helper function to process image URLs
function processImageUrl(imageData) {
    if (!imageData) return '';
    
    // If it's already a URL, return as is
    if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
        return imageData;
    }
    
    // If it's an object (embedded image), try to extract URL
    if (typeof imageData === 'object' && imageData !== null) {
        // Try to find image URL in the object
        if (imageData.url) return imageData.url;
        if (imageData.src) return imageData.src;
        if (imageData.link) return imageData.link;
        
        // If it's a Google Drive image object, construct the URL
        if (imageData.imageId) {
            return `https://drive.google.com/uc?id=${imageData.imageId}`;
        }
    }
    
    // If we can't process it, return empty string
    console.log('Could not process image data:', imageData);
    return '';
}

// CREATE - Add new row to spreadsheet
app.post('/data', requireAuth, async (req, res) => {
    try {
        const sheets = await getSheet();
        
        // Get current data to determine the next row
        const currentData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1'
        });
        
        const nextRow = (currentData.data.values?.length || 0) + 1;
        
        // Prepare the new row data based on the spreadsheet structure
        const newRow = [
            req.body.judul || '',
            req.body.deskripsi || '',
            req.body.penulis || '',
            req.body.tanggal || new Date().toLocaleDateString('id-ID'),
            req.body.gambar || '',
            req.body.jabatan || '',
            req.body.nama || '',
            req.body.kontak || '',
            req.body.gambar || '',
            req.body.lakiLaki || '',
            req.body.perempuan || '',
            req.body.keluarga || '',
            req.body.anakBalita || '',
            req.body.namaUmkm || '',
            req.body.deskripsiUmkm || '',
            req.body.gambarUmkm || '',
            req.body.pengelola || ''
        ];
        
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1',
            valueInputOption: 'RAW',
            requestBody: { values: [newRow] }
        });
        
        console.log('Successfully added new row to spreadsheet');
        res.json({ status: 'success', message: 'Data berhasil ditambahkan' });
    } catch (error) {
        console.error('Error adding data to spreadsheet:', error.message);
        res.status(500).json({ 
            error: 'Failed to add data to spreadsheet',
            details: error.message 
        });
    }
});

// UPDATE - Update existing row
app.put('/data/:row', requireAuth, async (req, res) => {
    try {
        const rowIndex = parseInt(req.params.row);
        const sheets = await getSheet();
        
        const updatedRow = [
            req.body.judul || '',
            req.body.deskripsi || '',
            req.body.penulis || '',
            req.body.tanggal || '',
            req.body.gambar || '',
            req.body.jabatan || '',
            req.body.nama || '',
            req.body.kontak || '',
            req.body.gambar || '',
            req.body.lakiLaki || '',
            req.body.perempuan || '',
            req.body.keluarga || '',
            req.body.anakBalita || '',
            req.body.namaUmkm || '',
            req.body.deskripsiUmkm || '',
            req.body.gambarUmkm || '',
            req.body.pengelola || ''
        ];
        
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Sheet1!A${rowIndex}:Q${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: { values: [updatedRow] }
        });
        
        console.log(`Successfully updated row ${rowIndex} in spreadsheet`);
        res.json({ status: 'success', message: 'Data berhasil diperbarui' });
    } catch (error) {
        console.error('Error updating data in spreadsheet:', error.message);
        res.status(500).json({ 
            error: 'Failed to update data in spreadsheet',
            details: error.message 
        });
    }
});

// DELETE - Delete row
app.delete('/data/:row', requireAuth, async (req, res) => {
    try {
        const rowIndex = parseInt(req.params.row);
        const sheets = await getSheet();
        
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0, // Assuming Sheet1 is the first sheet
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        });
        
        console.log(`Successfully deleted row ${rowIndex} from spreadsheet`);
        res.json({ status: 'success', message: 'Data berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting data from spreadsheet:', error.message);
        res.status(500).json({ 
            error: 'Failed to delete data from spreadsheet',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Image upload endpoint (admin only)
app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const publicUrl = `/uploads/${req.file.filename}`;
        res.json({ status: 'success', url: publicUrl });
    } catch (error) {
        console.error('Error handling upload:', error.message);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log('Available endpoints:');
    console.log('  GET  /data - Fetch all data from spreadsheet');
    console.log('  POST /data - Add new row to spreadsheet');
    console.log('  PUT  /data/:row - Update specific row');
    console.log('  DELETE /data/:row - Delete specific row');
    console.log('  GET  /health - Health check');
});

