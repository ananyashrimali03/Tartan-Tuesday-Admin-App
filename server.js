require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'tartan-tuesday-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : false,
        maxAge: 1000 * 60 * 60 * 12
    }
}));

// ============================================================
// Authentication
// ============================================================

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const validEmail = (process.env.APP_LOGIN || '').trim().toLowerCase();
    const validPassword = (process.env.APP_PASSWORD || '').trim();

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (email.trim().toLowerCase() === validEmail && password.trim() === validPassword) {
        req.session.authenticated = true;
        return res.json({ success: true });
    }

    res.status(401).json({ error: 'Invalid email or password' });
});

app.get('/api/me', (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) return next();
    res.status(401).json({ error: 'Not authenticated' });
}

// ============================================================
// Google Sheets API proxy helper
// ============================================================
async function callSheetsAPI(action, params = {}) {
    const SHEETS_API_URL = process.env.SHEETS_API_URL;

    if (!SHEETS_API_URL || SHEETS_API_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
        throw new Error('SHEETS_API_URL not configured in .env');
    }

    let url = `${SHEETS_API_URL}?action=${encodeURIComponent(action)}`;

    if (process.env.SHEETS_API_KEY) {
        url += `&key=${encodeURIComponent(process.env.SHEETS_API_KEY)}`;
    }

    if (params.data) {
        url += `&data=${encodeURIComponent(JSON.stringify(params.data))}`;
    }
    if (params.studentId) {
        url += `&studentId=${encodeURIComponent(params.studentId)}`;
    }
    if (params.date) {
        url += `&date=${encodeURIComponent(params.date)}`;
    }

    const response = await fetch(url, { redirect: 'follow' });

    if (!response.ok) {
        throw new Error(`Google Sheets API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
}

// ============================================================
// Protected API Routes
// ============================================================

app.get('/api/data', requireAuth, async (req, res) => {
    try {
        const data = await callSheetsAPI('getAllData');
        res.json(data);
    } catch (error) {
        console.error('Error loading data from Sheets:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/swipes', requireAuth, async (req, res) => {
    try {
        const swipeData = req.body;
        if (!swipeData.studentId || !swipeData.date) {
            return res.status(400).json({ error: 'Missing required fields: studentId and date' });
        }
        const result = await callSheetsAPI('addSwipe', { data: swipeData });
        res.json(result);
    } catch (error) {
        console.error('Error adding swipe:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/swipes/:studentId/:date', requireAuth, async (req, res) => {
    try {
        const { studentId, date } = req.params;
        const result = await callSheetsAPI('deleteSwipes', { studentId, date });
        res.json(result);
    } catch (error) {
        console.error('Error deleting swipes:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/comparison', requireAuth, async (req, res) => {
    try {
        const data = await callSheetsAPI('getComparisonData');
        res.json(data);
    } catch (error) {
        console.error('Error loading comparison data:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/inventory', requireAuth, async (req, res) => {
    try {
        const data = await callSheetsAPI('getInventory');
        res.json(data);
    } catch (error) {
        console.error('Error loading inventory:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/comparison/sync', requireAuth, async (req, res) => {
    try {
        const result = await callSheetsAPI('syncComparison');
        res.json(result);
    } catch (error) {
        console.error('Error syncing comparison data:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/swipes/bulk', requireAuth, async (req, res) => {
    try {
        const swipesArray = req.body;
        if (!Array.isArray(swipesArray)) {
            return res.status(400).json({ error: 'Request body must be an array of swipes' });
        }
        if (swipesArray.length === 0) {
            return res.json({ success: true, count: 0 });
        }
        const BATCH_SIZE = 20;
        let totalAdded = 0;
        for (let i = 0; i < swipesArray.length; i += BATCH_SIZE) {
            const batch = swipesArray.slice(i, i + BATCH_SIZE);
            await callSheetsAPI('bulkAddSwipes', { data: batch });
            totalAdded += batch.length;
        }
        res.json({ success: true, count: totalAdded });
    } catch (error) {
        console.error('Error bulk adding swipes:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// Static files & catch-all
// ============================================================

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Tartan Tuesday app running on port ${PORT}`);
    console.log(`Google Sheets sync: ${process.env.SHEETS_API_URL ? 'Enabled' : 'Not configured'}`);
    console.log(`Auth: ${process.env.APP_LOGIN ? 'Configured' : 'WARNING - not configured'}`);
});
