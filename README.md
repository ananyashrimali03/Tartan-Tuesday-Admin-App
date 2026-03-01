# Tartan Tuesday — Admin App

A full-stack web application for managing Carnegie Mellon University's **Tartan Tuesday** weekly student engagement event at the Alumni House. Students check in, spin a prize wheel to earn points, and redeem those points for CMU merchandise.

**Live:** [tartan-tuesday-admin-app.onrender.com](https://tartan-tuesday-admin-app.onrender.com)

---

## Features

### Student Check-In
- Instant student lookup by 9-digit ID (auto-detect) or email address
- Multi-select wheel spin — select multiple point values that sum together
- Free Spin bonus option (2 pts + second spin)
- Duplicate prevention — blocks same-day re-entry with option to delete
- Real-time sync to Google Sheets on every transaction

### Prize Redemption
- Tiered prize catalog (10–30 points)
- Point balance validation before redemption
- Size tracking for apparel items

### Statistics Dashboard
- **At-a-Glance Hero Cards** — students served, last-week attendance with week-over-week delta, ML forecast for next Tuesday, return rate
- **Attendance Forecasting** — ensemble of three ML models (Holt-Winters Double Exponential Smoothing, Quadratic Polynomial Regression, Weighted Moving Average) with backtesting and inverse-RMSE weighting
- **Inventory Ledger** — cross-references prize redemptions with inventory data; shows stock used %, remaining count, size breakdown, and color-coded status
- **Ordering Recommendations** — flags fast-moving items to reorder and overstocked slow movers
- **Prize Analytics** — stacked bar chart by product/size, category donut, size demand distribution
- **Points & Engagement** — earned vs. redeemed over time, visit frequency distribution, student demographics by degree level
- **Auto-Generated Insights** — attendance trends, retention rate, points in circulation, inventory depletion estimates

### Fiscal Year Comparison
- Standalone dashboard (`/charts.html`) comparing weekly student participation across semesters
- Auto-sync from check-in data to the Data Comparison sheet in Google Sheets

### Data Management
- Import student rosters and historical swipe data from Excel
- Export all data to Excel (PII masked)
- One-click refresh from Google Sheets

### Security & Privacy
- Session-based admin login (email/password)
- All Google Sheets API calls proxied through the server — no secrets in frontend code
- API key validation on the Google Apps Script backend
- PII masking — student IDs, emails, and names are masked throughout the UI and in exports

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (CDN), Chart.js, XLSX.js, PapaParse |
| Backend | Node.js, Express, express-session |
| Database | Google Sheets via Google Apps Script |
| Deployment | Render |
| ML | Client-side ensemble forecasting (Holt-Winters, Polynomial Regression, WMA) |

---

## Project Structure

```
├── server.js              # Express server — API proxy, auth, static files
├── public/
│   ├── index.html         # HTML shell
│   ├── app.js             # React application (all components + ML utilities)
│   ├── styles.css         # All styling
│   ├── charts.html        # Fiscal year comparison dashboard
│   ├── scotty-shield.png  # CMU logo
│   └── tartan-bg.png      # Tartan pattern background
├── Code.gs                # Google Apps Script (reference copy — runs in Google)
├── BUILD_DOCUMENTATION.md # Development history and prompt documentation
├── package.json
└── .env                   # Environment variables (not committed)
```

---

## Setup

### Prerequisites
- Node.js 18+
- A Google Sheet with Students, Swipes, Inventory, and Data Comparison tabs
- A deployed Google Apps Script web app ([Code.gs](Code.gs))

### Local Development

1. Clone the repo:
   ```bash
   git clone https://github.com/ananyashrimali03/Tartan-Tuesday-Admin-App.git
   cd Tartan-Tuesday-Admin-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   SHEETS_API_URL=<your Google Apps Script deployment URL>
   APP_LOGIN=<admin email>
   APP_PASSWORD=<admin password>
   SESSION_SECRET=<any random string>
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open `http://localhost:3000`

### Google Apps Script Setup

1. Open your Google Sheet > Extensions > Apps Script
2. Paste the contents of `Code.gs`
3. Deploy as a web app (Execute as: Me, Access: Anyone)
4. Copy the deployment URL into your `.env` as `SHEETS_API_URL`

### Deploy to Render

1. Push to GitHub
2. Create a new Web Service on Render, connect the repo
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add all `.env` variables in Render's Environment settings

---

## Author

**Ananya Shrimali** — Carnegie Mellon University
