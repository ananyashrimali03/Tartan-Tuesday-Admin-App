# Tartan Tuesday Admin App — Build Documentation (Kept asking the AIs to auto update this as I kept prompting)

**Author:** Ananya Shrimali  
**Started:** Early 2026  
**University:** Carnegie Mellon University  
**Purpose:** Admin tool for managing the weekly Tartan Tuesday event at the Alumni House  
**Reference:** [CMU Tartan Tuesdays](https://www.cmu.edu/engage/get-involved/students)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Phase 1 — Initial Build with Claude](#2-phase-1--initial-build-with-claude)
3. [Phase 2 — Deployment & Modularization with Cursor](#3-phase-2--deployment--modularization-with-cursor)
4. [Phase 3 — UI Redesign](#4-phase-3--ui-redesign)
5. [Phase 4 — Data Visualization Dashboard](#5-phase-4--data-visualization-dashboard)
6. [Phase 5 — Google Sheets Automation](#6-phase-5--google-sheets-automation)
7. [Phase 6 — Feature Enhancements](#7-phase-6--feature-enhancements)
8. [Phase 7 — Branding & Visual Identity](#8-phase-7--branding--visual-identity)
9. [Phase 8 — Advanced Analytics & ML](#9-phase-8--advanced-analytics--ml)
10. [Phase 9 — Prize Intelligence & Inventory](#10-phase-9--prize-intelligence--inventory)
11. [Phase 10 — Dashboard Redesign](#11-phase-10--dashboard-redesign)
12. [Tech Stack Summary](#12-tech-stack-summary)
13. [File Structure](#13-file-structure)
14. [Lessons Learned](#14-lessons-learned)
15. [Phase 11 — Privacy & Student Data Protection](#15-phase-11--privacy--student-data-protection)
16. [Appendix A: server.js & Code.gs — Complete API & Logic Reference](#appendix-a-serverjs--codegs--complete-api--logic-reference)
17. [Appendix B: app.js — Complete Function & Component Reference](#appendix-b-appjs--complete-function--component-reference)

---

## 1. Project Overview

Tartan Tuesday is a weekly event at Carnegie Mellon University where students wear CMU apparel on Tuesdays and visit the Alumni House (5017 Forbes Ave.) between noon and 5 PM to spin a prize wheel. Students earn points from the wheel, which they can accumulate and later redeem for CMU merchandise (hoodies, sunglasses, t-shirts, etc.). I work there parrt time and  currently use goolge sheets for each data entry and records.  

This admin application was built to replace manual tracking and provide a digital system for:
- Checking in students via card swipe or ID/email lookup
- Recording points earned from the wheel
- Tracking prize redemptions
- Managing inventory
- Analyzing attendance trends and making data-driven ordering decisions

---

## 2. Phase 1 — Initial Build with Claude

**Tool used:** Claude (claude-antigravity)  
**Starting point:** A Google Sheets spreadsheet with student check-in data

### Prompts (reconstructed):

> **Prompt 1:** Here is my Google Spreadsheet for Tartan Tuesday at CMU. [Attached spreadsheet link/data]. Tartan Tuesday is a weekly event at Carnegie Mellon University where students come to the Alumni House every Tuesday from noon to 5 PM wearing CMU apparel. They spin a prize wheel and earn points. They can accumulate points over multiple weeks and redeem them for CMU merchandise like hoodies, sunglasses, t-shirts, etc. Here's the CMU page about it: https://www.cmu.edu/engage/get-involved/students. I need you to build me a web-based admin application to manage this event.

> **Prompt 2:** The app should have these features:
> - A check-in tab where I can swipe a student's card or enter their 9-digit ID to look them up
> - Show their name, degree level, and cumulative points
> - A wheel spin section where I select how many points they won (1, 2, 3, or 5 pts and a free spin)
> - A prize redemption tab where students can spend their accumulated points on prizes
> - The prizes have tiers: Silver (5 pts), Gold (10 pts), Platinum (15 pts)
> - A statistics tab showing key numbers like total students, visits, points
> - A student history tab with a searchable/sortable table of all students
> - A data management tab to import/export Excel files
> - Connect to Google Sheets via Google Apps Script so data syncs automatically

> **Prompt 3:** Here is my Google Apps Script code (Code.gs) that handles the backend. The spreadsheet has these columns: Student ID, Points Earned, Points Redeemed, Date Visited, Cumulative Points, Prize Redeemed, Size, First Name, Last Name, Degree Level, Email. Set up the app to communicate with this Apps Script web app.

> **Prompt 4:** The student roster is in a separate sheet called "Roster" with columns for ID, First Name, Last Name, Email, and Degree Level. When a student swipes their card, look them up from this roster and auto-fill their information.

> **Prompt 5:** Add a feature to detect if a student has already spun the wheel today. Each student should only spin once per Tuesday. Show a warning if they've already checked in today.

> **Prompt 6:** I need the check-in to show whether this is a student's first time visiting (for welcome purposes) and their total visit count.

> **Prompt 7:** Add cumulative points calculation — the app should track all points earned minus all points redeemed across all visits to show their current balance.

### Output:
Claude generated a single monolithic HTML file (`tartan_tuesday_app (11).html`, ~2200 lines) containing:
- React 18 app via CDN (no build tools)
- All CSS embedded in a `<style>` block
- All JavaScript/JSX in a `<script type="text/babel">` block
- Dark theme UI with red/gold accents
- Google Sheets API integration via Google Apps Script
- Five tabs: Check-In, Redeem, Statistics, History, Data Management
- PapaParse + XLSX.js for file import/export
- localStorage caching for offline resilience

---

## 3. Phase 2 — Deployment & Modularization with Cursor

**Tool used:** Cursor (Claude)  
**Goal:** Deploy to Render and clean up the codebase

### Prompts:

> **Prompt 8:** I want to deploy the app on Render. Tell me what to fill in these fields. This is my GitHub link: https://github.com/ananyashrimali03/Tartan-Tuesday-Admin-App [Attached screenshot of Render deployment form]

> **Prompt 9:** Can you separate HTML, CSS and JS files?

### What was built:
- Created `server.js` — Express.js server serving static files + API proxy to Google Apps Script
- Created `package.json` with `"start": "node server.js"`
- Created `.env` for `SHEETS_API_URL`
- Split monolith into:
  - `public/index.html` — lean HTML shell
  - `public/styles.css` — all CSS
  - `public/app.js` — all React/JSX logic
- Server proxies all `/api/*` calls to the Google Apps Script, keeping the API URL secret

---

## 4. Phase 3 — UI Redesign

> **Prompt 10:** Now can you update the UI similar to this photo? [Attached screenshot of a modern white/red admin dashboard design]

### What changed:
- Complete visual overhaul from dark theme to clean white/red
- Added top navigation bar with logo
- Hero section with title and stat boxes
- Card-based layout for all tabs
- Modern form inputs with proper labels and focus states
- Responsive grid layout
- Smooth hover animations and transitions

---

## 5. Phase 4 — Data Visualization Dashboard

> **Prompt 11:** Can you read the Data Comparison tab in the Google Sheets and create a data visualization dashboard where you show a comparative chart for all the fiscal years for each week? Use a visualization style of your choice but make it readable. Main aim is to compare the number of students that participated in that particular week each semester.

> **Prompt 12:** Run on browser

> **Prompt 13:** I updated the code.gs data in Apps Script

> **Prompt 14:** https://script.google.com/macros/s/AKfycby.../exec — I did now

> **Prompt 15:** [Screenshot] Can you remove the total students in FY chart from here and create another bar chart for only this separately? So that scale for week data doesn't minimize so much?

> **Prompt 16:** [Screenshot] I want to remove this FY data point from this particular chart and only keep weeks data in this

### What was built:
- `public/charts.html` — dedicated data visualization page
- Chart.js integration for interactive charts
- Year-over-year weekly attendance comparison (line chart with multiple semesters)
- Robust "total row" detection and filtering (keyword matching + statistical outlier detection)
- Separate total attendance bar chart with appropriate scale
- New API endpoints: `GET /api/comparison` and `POST /api/comparison/sync`
- New Apps Script functions: `getComparisonData()`, `syncAllComparisonData()`

---

## 6. Phase 5 — Google Sheets Automation

> **Prompt 17:** Can you also keep creating an automated entry in the Data Comparison tab in Google Sheets: calculate the total number of students that came in for a particular date and add that as a next week. Like if the previous week was 31 and now I'm on a new date making entries, count how many entries were made today and add it for week 32 and so on.

### What was built:
- `updateComparisonData()` in Code.gs — auto-fires on every check-in
- Counts unique students per date
- Detects current semester column automatically
- Finds the next available week number
- Updates or creates "Week N" entries
- `syncAllComparisonData()` for full historical rebuilds
- "Rebuild Comparison Sheet" button in the app

---

## 7. Phase 6 — Feature Enhancements

### Multi-point selection:

> **Prompt 18:** Allow the user to select multiple points options in student check-in and add all the selected button points to finally add their total points earned in the sheets

### Check-in button debugging:

> **Prompt 19:** Why is my complete check-in button inactive?

### What was built:
- Changed `selectedPoints` from single value to `selectedPointsList` array
- Toggle behavior on wheel point buttons (tap to select, tap again to deselect)
- Free spin button logic (adds to existing selections)
- Sum of all selected points shown in real-time
- Dynamic requirements checklist above the check-in button showing exactly what's missing

---

## 8. Phase 7 — Branding & Visual Identity

### Emoji cleanup:

> **Prompt 20:** Remove all the emojis used in the app and make it look clean

### Logo replacement:

> **Prompt 21:** [Uploaded CMU Scotty dog shield image] Replace this with the "TT" icon before the header Tartan Tuesday text

### Color palette update:

> **Prompt 22:** Also, update the color palette of the whole app with that of the image colors

### Remove badge:

> **Prompt 23:** Remove the CMU Tartans fixed button from top right

### Tartan background:

> **Prompt 24:** [Uploaded tartan pattern image] Can you replace the red background under the title with this pattern? Update other aesthetics to make it visible and clean

### Footer and fonts:

> **Prompt 25:** Replace the footer black background too with the same image. Also update the heading titles using CMU's title fonts from cmu.edu

### Title case:

> **Prompt 26:** Where is the code for title text and all text on the buttons?

> **Prompt 27:** I want to change all the all caps "TARTAN TUESDAY" titles to "Tartan Tuesday"

### What changed:
- All decorative emojis systematically removed from UI text
- `<img src="/scotty-shield.png">` replaced the "TT" text logo
- Color palette shifted from generic red (`#dc2626`) to CMU crimson (`#9B1B30`, `#7A1425`, `#5E0F1C`)
- Hero section and footer backgrounds replaced with tartan pattern image + dark overlay
- "CMU TARTANS" badge removed from top-right
- Google Fonts loaded: Source Serif 4 (headings) + Open Sans (body text) — CMU's official brand fonts
- `text-transform: uppercase` removed; titles now display in proper title case

---

## 9. Phase 8 — Advanced Analytics & ML

### Initial analytics request:

> **Prompt 28:** [Uploaded inventory sheet screenshot] I added a new sheet called Inventory. Now I want to improve the Statistics tab and improve the data visualizations and inventory prediction — when will the stock get empty? You are a senior business data analyst and know which are the best and most important graphs and charts I need. Suggest them. I want to use simple ML algorithms as well and show the predictions on the dashboard. I also want to predict how many people will come on Tartan Tuesday. People only come on Tuesdays — be aware of that. What are the strategies and conclusions I can make to be included in the dashboard that will be helpful? Business is: people come every Tuesday and spin the wheel. They receive points and get a chance to redeem those points to get CMU merch. This happens every Tuesday in the Alumni House. How can I improve?

> **Prompt 29:** I don't want to replace the bare 6-number Statistics tab but add on to it in the same tab

> **Prompt 30:** Yes build

> **Prompt 31:** Reflect on the plan you have made and critique it

> **Prompt 32:** Go ahead

### Email lookup:

> **Prompt 33:** Can you also let me search student info using email? If someone doesn't have their ID number?

### Upgrade to ensemble ML:

> **Prompt 34:** Instead of linear regression, I want to use advanced models which can give more accurate results

### What was built:
- **ML Algorithms (client-side JavaScript):**
  - Holt's Double Exponential Smoothing (level + trend)
  - Polynomial (Quadratic) Regression via Gaussian elimination
  - Weighted Moving Average with exponential decay
  - Ensemble forecasting with backtesting — models compete on historical accuracy, weighted by inverse RMSE
  - Confidence intervals from prediction spread + historical error
- **New charts (Chart.js):**
  - Attendance trend with ensemble forecast bar + confidence range
  - Points economy stacked bar chart (earned vs redeemed per date)
  - Visit frequency donut (1 visit, 2-3, 4-6, 7+)
  - Student demographics donut (by degree level)
  - Prize popularity horizontal bar (later upgraded)
- **Inventory integration:**
  - New `GET /api/inventory` endpoint
  - `getInventory()` function in Code.gs
  - Inventory status display with color-coded quantity badges
- **Business insights engine:**
  - `generateInsights()` function analyzing attendance trends, retention, points surplus, inventory health, peak days, redemption rates
  - Color-coded insight cards (positive/negative/warning/neutral)
- **Email lookup:**
  - `lookupStudent()` accepts email (detects `@`) or 9-digit ID
  - Press Enter to search by email
  - Works in both Check-In and Redeem tabs

---

## 10. Phase 9 — Prize Intelligence & Inventory

### Prize whitelist and data management:

> **Prompt 35:** [Listed all prizes with sizes] These are the only prizes that are given to people during Tartan Tuesday. The graphs have extra categories and gifts which are not given or cannot be redeemed. Also there are different sizes here — I want you to manage that as well. Choose a proper graph type according to the use cases. Think about telling stories with data conceptually. This application is for the Tartan Tuesday admin.

### Fuzzy matching:

> **Prompt 36:** The chart only shows analytics for one item (Black Hoodie). Could you make a comparative chart for the following prizes? I might have written "survey, mug or donation" or "mug" or simply just "mug" at different places — but this means that 3 people took 3 mugs. Try to not match the spreadsheet entry word by word, rather try understanding smartly how many mugs really got redeemed even if the entries had other keywords. Use the same methods for other prizes as well. Refer sizes redeemed from the size column. [Listed full prize catalog including Vintage Hoodie, 1/4 zip, bottle]

### Expanded prizes + inventory cross-reference:

> **Prompt 37:** There is also picnic blanket, umbrella, chair and pin among prizes. Please add them too. Also add how many redeemed from the inventory tab and how many still remain, if you can calculate that.

### What was built:
- **Fuzzy keyword matching system (`PRIZE_RULES`):**
  - 11 prize rules, each with multiple keyword variants
  - Ordered to prevent false positives (e.g., "Vintage Hoodie" checked before "Black Hoodie")
  - Scans for keywords anywhere in the entry string
  - Categories: Apparel, Accessories, Outdoor
- **Size extraction:**
  - Primary: reads from the dedicated `size` column in Google Sheets
  - Fallback: parses size from the prize name string (e.g., "- XL")
- **Three prize charts:**
  - Stacked horizontal bar: redemptions by product with size breakdown
  - Donut: category mix (Apparel vs Accessories vs Outdoor)
  - Vertical bar: size distribution across all apparel items (most popular size highlighted)
- **Inventory Ledger table:**
  - Cross-references prize redemptions with inventory sheet
  - Fuzzy matches prize names to inventory item names
  - Columns: Prize, Given, Left, Stock Used (% bar), Sizes, Status
  - Calculates `initialStock = currentQuantity + totalRedeemed`
- **`buildInventoryLedger()` function:**
  - Matches prizes to inventory items via keyword overlap
  - Shows items with 0 redemptions but existing inventory
  - Color-coded status badges

---

## 11. Phase 10 — Dashboard Redesign

> **Prompt 38:** Now you are an Apple-level UI/UX designer. Help me update the statistics page so that it's really simple to read as a user. Major problems I face as a Tartan Tuesday admin:
> 1. I don't have any records of how many prizes are being redeemed and how many are still available in the inventory stock.
> 2. If a student forgets their ID and just remembers their email, it was hard to extract their data earlier.
> 3. I restock every year with new prizes, I don't know which ones are more popular. Like I ordered around 100 outdoor chairs but still have 90+ left in the stock and the year is almost over. My ordering proportions are intuitive.
> 4. The current numbers on the statistics page are hard to read and visualize. I don't know what to do with those big numbers in the beginning.

### What changed:
Complete restructure of the Statistics tab from a data dump into a narrative dashboard:

1. **At a Glance** — 4 contextual hero cards answering "how are we doing?"
   - Students served (with total check-ins and Tuesdays count)
   - Last week's attendance (with week-over-week % delta)
   - Next Tuesday ensemble forecast (with confidence range)
   - Return rate (with avg points per student, crimson accent card)

2. **Attendance** — Clean chart with model breakdown in a collapsible accordion

3. **Inventory & Prizes** — Promoted to second section (was buried at the bottom)
   - Three pill metrics: given out / in stock / redemption rate
   - Full inventory ledger table
   - **Ordering Recommendations** — new feature:
     - "Reorder soon" (red) — items >60% depleted or <6 weeks supply
     - "Overstocked" (amber) — items <15% used with >10 remaining
     - Shows weekly consumption rate and weeks-until-empty estimate

4. **What's Popular** — Stacked product chart + category donut + size demand

5. **Points & Engagement** — Points economy, visit frequency, demographics

6. **Insights** — Business insights at the bottom

---

## 12. Tech Stack Summary

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 (CDN, development mode, JSX via Babel) |
| **Styling** | Hand-written CSS with CSS Grid, Flexbox, media queries |
| **Charts** | Chart.js 4.4 |
| **Data Import/Export** | PapaParse (CSV), XLSX.js (Excel) |
| **Fonts** | Google Fonts — Source Serif 4, Open Sans |
| **Backend** | Node.js + Express.js |
| **Database** | Google Sheets (via Google Apps Script as API proxy) |
| **Deployment** | Render (Node.js web service) |
| **ML/Forecasting** | Client-side JS — Holt-Winters, Polynomial Regression, Weighted MA, Ensemble |
| **Version Control** | Git + GitHub |

---

## 13. File Structure

```
Tartan Tuesday app/
├── .env                              # SHEETS_API_URL environment variable
├── package.json                      # Node.js dependencies and scripts
├── server.js                         # Express server + API proxy
├── Code.gs                           # Google Apps Script backend (deployed separately)
├── tartan_tuesday_app (11).html      # Original monolithic build (archived)
├── BUILD_DOCUMENTATION.md            # This file
└── public/
    ├── index.html                    # HTML entry point
    ├── styles.css                    # All CSS
    ├── app.js                        # React app + ML utilities (~1800 lines)
    ├── charts.html                   # Standalone fiscal year comparison dashboard
    ├── scotty-shield.png             # CMU Scotty logo
    └── tartan-bg.png                 # Tartan pattern background image
```

---

## 14. Lessons Learned

1. **Start monolithic, then modularize.** Claude generated a single HTML file first. Only after it worked end-to-end did we split into separate files for deployment.

2. **Google Sheets is a viable database for small apps.** With ~500 students and weekly events, Sheets + Apps Script handles the load fine and gives non-technical staff direct access to the data.

3. **Fuzzy matching > exact matching.** Real-world data entry is messy. The keyword-based prize matching catches entries like "vintage hoodie" or "crew neck" that exact matching would miss entirely.

4. **Design around the admin's questions, not the data.** The original stats page dumped 6 numbers. The redesign answers: "How was last week?" → "What do I need to reorder?" → "What's popular?" — in that priority order.

5. **Ensemble ML beats any single model.** By backtesting 3 models and weighting by accuracy, the forecast is more robust than any individual approach. And the confidence range is honest about uncertainty.

6. **Ship incrementally.** Every prompt resulted in a deployable change. No multi-week sprints — just continuous "make this one thing better."

7. **Privacy by default.** Since this app handles real student data, we added masking so the app can be demonstrated without revealing individual identities.

---

## 15. Phase 11 — Privacy & Student Data Protection

> **Prompt 39:** Remove the Student History tab from the app completely. Make sure the frontend doesn't reveal student ID to the app user. I will be submitting this project for my coding class but I don't want to use a fake dataset. I want to show the real functioning of the app without revealing any other student's data.

### What changed:

**Removed:**
- Student History tab (button, JSX, all related state: `searchTerm`, `sortBy`, `sortOrder`)
- `getStudentHistory()`, `filteredStudentHistory`, `sortedStudentHistory`, `handleSort` functions
- Student History table that displayed raw IDs, full names, emails, and point balances

**Added privacy masking utilities:**
- `maskId(id)` — Shows only last 3 digits: `"123456789"` → `"***789"`
- `maskEmail(email)` — Shows first 2 characters + domain: `"ananya@cmu.edu"` → `"an***@cmu.edu"`
- `maskName(first, last)` — Shows initial + last name: `"Ananya Shrimali"` → `"A. Shrimali"`

**Masked in the UI:**
- Student info cards in Check-In and Redeem tabs now show `"A. Shrimali (***789)"` instead of full name, ID, and email
- Input field is replaced with masked ID after successful lookup (raw digits are not persisted on screen)
- Alert messages and activity log use masked names
- Requirements checklist shows masked names

**Masked in data export:**
- Excel export no longer includes Student ID, full first name, or email columns
- Exports: masked name, points earned/redeemed, date, prize, size, degree level

**Internal logic unchanged:**
- `lookupStudent()`, `calculateCumulativePoints()`, `hasSpunToday()` still use real IDs internally for correct functionality
- Google Sheets sync still sends real IDs (necessary for data integrity)
- All analytics and ML remain fully functional

---

*Total prompts used: ~39 across Claude and Cursor*  
*Total development time: Iterative over several sessions*  
*Lines of code: ~1,750 (app.js) + ~1,200 (styles.css) + ~700 (charts.html) + ~500 (Code.gs) + ~170 (server.js) ≈ 4,320 lines*

---

## Appendix A: server.js & Code.gs — Complete API & Logic Reference

This appendix documents every function, endpoint, and piece of logic in `server.js` and `Code.gs` for developers maintaining or extending the Tartan Tuesday app.

---

### A.1 Proxy Pattern Overview

The app uses a **proxy pattern** to keep the Google Apps Script URL secret and avoid CORS issues:

```
[Browser/Client]  →  [Express server.js]  →  [Google Apps Script Code.gs]  →  [Google Sheets]
       ↑                      ↑                           ↑
   /api/* routes         callSheetsAPI()              doGet(e) / doPost(e)
```

**Flow:**

1. The frontend (`app.js`, `charts.html`) calls local API routes like `GET /api/data` or `POST /api/swipes`.
2. `server.js` receives these requests and uses `callSheetsAPI(action, params)` to forward them to the Apps Script web app URL (from `SHEETS_API_URL` in `.env`).
3. The Apps Script URL is called with query parameters: `?action=<action>&data=...&studentId=...&date=...`
4. `Code.gs`'s `doGet(e)` (or `doPost(e)`) reads `e.parameter.action` and dispatches to the appropriate function.
5. The Apps Script reads/writes Google Sheets and returns JSON.
6. `server.js` returns that JSON to the client.

**Why this pattern:** The `SHEETS_API_URL` is never exposed to the browser. All Sheets access goes through the Node server, which runs on Render with the secret in `.env`.

---

### A.2 server.js — Complete Reference

#### A.2.1 Configuration & Middleware

| Item | Description |
|------|-------------|
| `dotenv` | Loads `.env` for `PORT` and `SHEETS_API_URL` |
| `PORT` | `process.env.PORT \|\| 3000` (Render sets `PORT`) |
| `express.json({ limit: '10mb' })` | Parses JSON bodies up to 10MB (for bulk swipes) |

---

#### A.2.2 Function: `callSheetsAPI(action, params)`

**Signature:**
```javascript
async function callSheetsAPI(action, params = {})
```

**Parameters:**
- `action` (string): The action name passed to Apps Script (e.g. `'getAllData'`, `'addSwipe'`).
- `params` (object, optional): Additional parameters.
  - `params.data` — JSON-serializable object/array (e.g. swipe object or swipes array).
  - `params.studentId` — Student ID string.
  - `params.date` — Date string (e.g. `'2025-02-25'`).

**Behavior:**
1. Reads `SHEETS_API_URL` from `process.env`.
2. Throws if `SHEETS_API_URL` is missing or placeholder.
3. Builds URL: `{SHEETS_API_URL}?action={action}&data=...&studentId=...&date=...` (only adds params that exist).
4. Calls `fetch(url, { redirect: 'follow' })`.
5. Throws on non-OK HTTP status.
6. Parses JSON; throws if `data.error` is present.
7. Returns the parsed JSON.

**Returns:** The JSON response from the Apps Script.

---

#### A.2.3 API Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/api/data` | `callSheetsAPI('getAllData')` | Load all students and swipes for the main app. |
| `POST` | `/api/swipes` | `callSheetsAPI('addSwipe', { data: req.body })` | Add a single swipe. Requires `studentId` and `date` in body. |
| `DELETE` | `/api/swipes/:studentId/:date` | `callSheetsAPI('deleteSwipes', { studentId, date })` | Delete all swipes for a student on a given date. |
| `GET` | `/api/comparison` | `callSheetsAPI('getComparisonData')` | Load Data Comparison sheet for charts. |
| `GET` | `/api/inventory` | `callSheetsAPI('getInventory')` | Load inventory data. |
| `POST` | `/api/comparison/sync` | `callSheetsAPI('syncComparison')` | Rebuild Data Comparison sheet from Swipes. |
| `POST` | `/api/swipes/bulk` | Batched `callSheetsAPI('bulkAddSwipes', { data: batch })` | Bulk add swipes. Body must be an array. Batches of 20. |

**Error handling:** All routes use `try/catch`; on error they return `res.status(500).json({ error: error.message })`. Validation errors (e.g. missing fields) return `400`.

---

#### A.2.4 Static Files & Catch-All

| Route | Behavior |
|-------|----------|
| `app.use(express.static(path.join(__dirname, 'public')))` | Serves `public/` (index.html, app.js, styles.css, charts.html, images). |
| `app.get('*', ...)` | SPA fallback: any unmatched route serves `public/index.html`. |

---

### A.3 Code.gs — Complete Reference

#### A.3.1 Entry Points: `doGet(e)` and `doPost(e)`

**`doGet(e)`** — Handles all operations via GET (query parameters).

- Reads `action` from `e.parameter.action`; defaults to `'getAllData'`.
- Dispatches via `switch (action)` to the appropriate function.
- Returns `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`.
- On error: returns `{ error: error.message }` as JSON.

**`doPost(e)`** — Fallback for write operations via POST.

- Parses `e.postData.contents` as JSON.
- Reads `action` from `payload.action`.
- Dispatches to `addSwipe`, `deleteSwipes`, or `bulkAddSwipes`.
- Same JSON output format as `doGet`.

---

#### A.3.2 doGet / doPost Action Cases

| Action | Handler | Description |
|--------|---------|-------------|
| `getStudents` | `getStudents()` | Returns array of student objects. |
| `getSwipes` | `getSwipes()` | Returns array of swipe objects. |
| `getAllData` | `{ students: getStudents(), swipes: getSwipes() }` | Combined students + swipes (default action). |
| `getComparisonData` | `getComparisonData()` | Returns Data Comparison sheet structure for charts. |
| `syncComparison` | `syncAllComparisonData()` | Rebuilds Data Comparison from Swipes. |
| `getInventory` | `getInventory()` | Returns inventory items. |
| `addSwipe` | `addSwipe(JSON.parse(e.parameter.data))` | Adds one swipe. |
| `deleteSwipes` | `deleteSwipes(e.parameter.studentId, e.parameter.date)` | Deletes swipes for student on date. |
| `bulkAddSwipes` | `bulkAddSwipes(JSON.parse(e.parameter.data))` | Adds multiple swipes. |
| *(default)* | — | Returns `{ error: 'Unknown action: ' + action }`. |

---

#### A.3.3 Read Functions

##### `getStudents()`

**Returns:** Array of student objects.

**Logic:**
- Uses sheet `'Students'`, rows 2 to `getLastRow() - 1`, columns 1–12.
- Maps each row to: `{ id, firstName, lastName, email, degreeLevel, preferredYear }`.
- Column mapping: `id` = col 0, `firstName` = col 7 or 6, `lastName` = col 8, `email` = col 11, `degreeLevel` = col 10, `preferredYear` = col 9.
- Filters: `id` must be 9 characters and numeric.
- Returns `[]` if sheet missing or fewer than 2 rows.

---

##### `getSwipes()`

**Returns:** Array of swipe objects.

**Logic:**
- Uses sheet `'Swipes'`, rows 4 to `getLastRow() - 3`, columns 1–11.
- Maps each row to: `{ studentId, pointsEarned, pointsRedeemed, date, cumulativePoints, prizeRedeemed, size, firstName, lastName, degreeLevel, email }`.
- `date` is normalized via `formatDate(row[3])`.
- Filters: `studentId` must be 9 characters.
- Returns `[]` if sheet missing or fewer than 4 rows.

---

##### `getComparisonData()`

**Returns:** `{ headers, rows }` or `{ error }`.

**Logic:**
- Gets sheet via `getComparisonSheet()`.
- If not found: returns `{ error: 'Data Comparison sheet not found. Available sheets: ...' }`.
- Reads row 1 as headers, rows 2 to `lastRow - 1` as data (excludes last row, typically Total).
- Converts Date cells to `yyyy-MM-dd`.
- Filters out fully empty rows.
- Returns `{ headers: [], rows: [] }` if sheet too small.

---

##### `getInventory()`

**Returns:** Array of inventory objects.

**Logic:**
- Uses sheet `'Inventory'`, rows 2 to `getLastRow() - 1`, columns 1–5.
- Maps to: `{ category, item, quantity, location, notes }`.
- Filters out rows with empty `item`.
- Returns `[]` if sheet missing or fewer than 2 rows.

---

#### A.3.4 Write Functions

##### `addSwipe(swipeData)`

**Parameters:** `swipeData` — `{ studentId, pointsEarned, pointsRedeemed, date, prizeRedeemed?, size? }`

**Returns:** `{ success: true, row: newRow }`

**Logic:**
1. Appends a new row to `'Swipes'`.
2. Sets columns 1–4: studentId, pointsEarned, pointsRedeemed, date.
3. Sets columns 6–7 if `prizeRedeemed` / `size` present.
4. Calls `copyFormulasToRow(sheet, newRow)` for columns 5, 8, 9, 10, 11.
5. If `pointsEarned > 0`, calls `updateComparisonData(swipeData.date)` (auto-updates Data Comparison).
6. Returns the new row index.

---

##### `deleteSwipes(studentId, date)`

**Parameters:** `studentId` (string), `date` (string)

**Returns:** `{ success: true, deleted: number }`

**Logic:**
1. Reads Swipes data (rows 4+), iterates from bottom to top.
2. Deletes rows where `rowStudentId === studentId` and `rowDate === date`.
3. Calls `updateComparisonData(date)` to refresh comparison counts.
4. Returns count of deleted rows.

---

##### `bulkAddSwipes(swipesArray)`

**Parameters:** `swipesArray` — Array of swipe objects (same shape as `addSwipe`).

**Returns:** `{ success: true, count: number, comparisonUpdated: number }`

**Logic:**
1. For each swipe, appends a row and sets columns 1–4, 6–7 as in `addSwipe`.
2. Calls `copyFormulasToRow` for each new row.
3. Collects unique dates where `pointsEarned > 0`.
4. Calls `updateComparisonData(date)` for each unique date.
5. Returns total count and number of dates updated in comparison.

---

#### A.3.5 Comparison Sheet Helpers

##### `getComparisonSheet()`

**Returns:** Sheet object or `null`.

**Logic:** Tries sheet names: `'Data Comparison'`, `'Comparison'`, `'data comparison'`, `'YoY'`, `'Year Comparison'`, `'Weekly Comparison'`. Returns first match.

---

##### `findRowByLabel(sheet, label)`

**Parameters:** `sheet`, `label` (string)

**Returns:** 1-based row index, or `-1`.

**Logic:** Scans column A (rows 2 to `lastRow - 1`) for a cell matching `label` (trimmed). Returns row index or -1.

---

##### `getCurrentSemesterCol(sheet)`

**Returns:** 1-based column index of rightmost non-empty header, or `-1`.

**Logic:** Reads row 1, scans from right to left for first non-empty header.

---

##### `countUniqueStudentsForDate(date)`

**Parameters:** `date` (string, e.g. `'2025-02-25'`)

**Returns:** Number of unique students with `pointsEarned > 0` on that date.

**Logic:** Reads Swipes (cols 1–4), filters by `rowDate === date` and `pts > 0`, counts unique 9-digit `studentId`s.

---

##### `getMaxWeekNumber(sheet)`

**Returns:** Highest "Week N" number in column A.

**Logic:** Scans column A for `/week\s*(\d+)/i`, returns max parsed number.

---

##### `getTotalRowIndex(sheet)`

**Returns:** 1-based row index of Total row, or `-1`.

**Logic:** Scans column A for labels matching `/total|grand\s*total|sum/i`.

---

#### A.3.6 Comparison Sheet Main Logic

##### `updateComparisonData(date)`

**Parameters:** `date` (string)

**Returns:** `{ success, action?, weekLabel?, count?, row? }` or `{ error }` or `{ success: false, reason }`

**Logic:**
1. Returns early if no date.
2. Gets `studentCount` via `countUniqueStudentsForDate(date)`.
3. Gets comparison sheet and current semester column; returns error if missing.
4. Uses `ScriptProperties` key `ttDateWeekMapping` (JSON: `date → weekLabel`).
5. If `mapping[date]` exists: finds row by label, updates count in current semester column, returns `{ action: 'updated', ... }`.
6. If first time: computes `nextWeek = getMaxWeekNumber + 1`, `weekLabel = 'Week ' + nextWeek`.
7. Inserts row before Total row (or at end if no Total).
8. Sets column A = weekLabel, current semester column = studentCount.
9. Saves `mapping[date] = weekLabel` in ScriptProperties.
10. Returns `{ action: 'inserted', weekLabel, count, row }`.

---

##### `syncAllComparisonData()`

**Returns:** `{ success: true, processed: number, summary?: array, reason?: string }`

**Logic:**
1. Reads all Swipes (cols 1–4).
2. Collects unique dates with at least one check-in (`pointsEarned > 0`, valid 9-digit studentId).
3. Sorts dates chronologically.
4. Calls `updateComparisonData(date)` for each date.
5. Returns count and summary of `{ date, weekLabel, count }` per date.

---

#### A.3.7 Helper Functions

##### `copyFormulasToRow(sheet, targetRow)`

**Parameters:** `sheet`, `targetRow` (1-based)

**Logic:** Copies formulas from `targetRow - 1` to `targetRow` for columns 5, 8, 9, 10, 11. No-op if `targetRow - 1 < 4`.

---

##### `formatDate(value)`

**Parameters:** `value` — Date, string, or other

**Returns:** `yyyy-MM-dd` string or original string.

**Logic:**
- Date: `Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')`.
- `M/D/YY` or `M/D/YYYY`: parse and format.
- ISO string with `T`: return part before `T`.
- Otherwise: return string as-is.

---

### A.4 Action-to-Endpoint Mapping

| server.js Endpoint | Code.gs Action | Notes |
|--------------------|----------------|-------|
| `GET /api/data` | `getAllData` | Default doGet action. |
| `POST /api/swipes` | `addSwipe` | Body → `params.data`. |
| `DELETE /api/swipes/:studentId/:date` | `deleteSwipes` | Params from URL. |
| `GET /api/comparison` | `getComparisonData` | For charts page. |
| `GET /api/inventory` | `getInventory` | For inventory display. |
| `POST /api/comparison/sync` | `syncComparison` | Rebuild comparison sheet. |
| `POST /api/swipes/bulk` | `bulkAddSwipes` | Batched in groups of 20. |

---

### A.5 Google Sheets Structure (Expected by Code.gs)

| Sheet | Purpose | Key Columns |
|-------|---------|-------------|
| **Students** | Student roster | Col 0: ID, 6–7: FirstName, 8: LastName, 9: PreferredYear, 10: DegreeLevel, 11: Email |
| **Swipes** | Check-ins & redemptions | 1: StudentId, 2: PointsEarned, 3: PointsRedeemed, 4: Date, 5: CumulativePoints (formula), 6: PrizeRedeemed, 7: Size, 8–11: formulas/lookups |
| **Data Comparison** | Weekly attendance by semester | Row 1: semester headers, Col A: Week labels, data cols: counts |
| **Inventory** | Prize stock | 1: Category, 2: Item, 3: Quantity, 4: Location, 5: Notes |

---

## Appendix B: app.js — Complete Function & Component Reference

This appendix documents every function, utility, React hook, state variable, and UI section in `public/app.js`.

---

### B.0 Constants & API Client

| Constant | Type | Purpose |
|----------|------|---------|
| `PRIZES` | Array | Prize catalog: `{ points, name, tier }` for Vest/Chair (30), Blanket/Tent/Mug (25), Mousepad/Towel (20), Sunglasses/Tumbler/Notepad (10) |
| `POINT_OPTIONS` | Array | Wheel point values: `[1, 2, 3, 5, 10]` |
| `SHEETS_API_URL` | String | Google Apps Script web app URL |
| `SYNC_ENABLED` | Boolean | True when `SHEETS_API_URL` is not placeholder |

**SheetsAPI** — Object with methods:
- `get(action)` — GET request with `?action=...`; returns JSON or throws.
- `post(payload)` — POST with `action`, optional `data`, `studentId`, `date`; returns JSON or throws.
- `loadAllData()` — Calls `get('getAllData')`.
- `addSwipe(swipeData)` — Posts new check-in/redemption.
- `deleteSwipes(studentId, date)` — Deletes today's entries for student.
- `bulkAddSwipes(swipesArray)` — Batches swipes in groups of 20 and posts each batch.

All methods return `null` when `!SYNC_ENABLED`.

---

### B.1 ML & Forecasting Utilities

#### `linearRegression(ys)`

**Parameters:** `ys` — Array of numbers (time series values)

**Returns:** `{ slope, intercept, r2, predict }` — Object with regression coefficients, R², and a `predict(x)` function

**Logic:**
- Computes least-squares linear regression over indices 0..n-1 as x-values.
- Returns `{ slope: 0, intercept: ys[0] || 0, r2: 0, predict: () => ys[0] || 0 }` if `n < 2`.
- `predict(x)` returns `Math.max(0, Math.round(slope * x + intercept))`.

---

#### `exponentialSmoothing(series, alpha = 0.3)`

**Parameters:** `series` — Array of numbers; `alpha` — Smoothing factor (default 0.3)

**Returns:** Number — Smoothed forecast value (rounded, non-negative)

**Logic:** Single exponential smoothing; iterates `s = alpha * series[i] + (1 - alpha) * s`. Returns 0 for empty series.

---

#### `holtDoubleSmoothing(series, alpha = 0.35, beta = 0.15)`

**Parameters:** `series` — Array of numbers; `alpha`, `beta` — Level and trend smoothing factors

**Returns:** `{ forecast, level, trend, predictAhead }` — Holt double exponential smoothing result

**Logic:**
- Maintains level and trend; `predictAhead(k)` forecasts k steps ahead.
- Returns `{ forecast: series[0] || 0, predictAhead: () => series[0] || 0 }` if `series.length < 2`.
- `forecast` and `predictAhead(k)` are clamped to non-negative integers.

---

#### `polyRegression(ys, degree = 2)`

**Parameters:** `ys` — Array of numbers; `degree` — Polynomial degree (default 2)

**Returns:** `{ coeffs, r2, predict }` — Polynomial regression coefficients, R², and `predict(x)` function

**Logic:**
- Uses Gaussian elimination to solve normal equations for polynomial fit.
- Falls back to `linearRegression(ys)` if `n <= degree`.
- `predict(x)` evaluates polynomial and returns `Math.max(0, Math.round(val))`.

---

#### `weightedMovingAvg(series, decay = 0.75)`

**Parameters:** `series` — Array of numbers; `decay` — Weight decay factor (default 0.75)

**Returns:** Number — Weighted average (recent values weighted more heavily)

**Logic:** Weights each value by `decay^(n-1-i)`; returns 0 for empty series.

---

#### `ensembleForecast(series)`

**Parameters:** `series` — Array of numbers (attendance counts by week)

**Returns:** `{ forecast, low, high, models, bestModel, method }` — Ensemble forecast with confidence range

**Logic:**
- If `series.length < 4`: uses simple exponential smoothing; returns `{ forecast, low, high, models: [], method }`.
- Otherwise: runs Holt-Winters, Quadratic Regression, and Weighted Moving Avg; computes RMSE on last 4 points; weights predictions by inverse RMSE; combines into ensemble forecast.
- `low` and `high` are confidence bounds; `models` lists each model's prediction, RMSE, and weight.

---

#### `getContiguousRun(sorted)`

**Parameters:** `sorted` — Array of `{ date, count }` objects sorted by date (ascending)

**Returns:** Array — Subset of items forming a contiguous run (no gap > 21 days from previous)

**Logic:** Starts from last item and walks backward; stops when gap between consecutive dates exceeds 21 days.

---

#### `getNextTuesday()`

**Parameters:** None

**Returns:** String — ISO date (YYYY-MM-DD) of the next Tuesday

**Logic:** Computes `(2 - getDay() + 7) % 7 || 7` days from today.

---

#### `fmtDateLabel(s)`

**Parameters:** `s` — Date string (YYYY-MM-DD)

**Returns:** String — Formatted label (e.g., "Jan 15") via `toLocaleDateString`

**Logic:** Parses as noon UTC and formats with `{ month: 'short', day: 'numeric' }`.

---

### B.2 Data Processing Utilities

#### `getAttendanceByDate(swipes)`

**Parameters:** `swipes` — Array of swipe objects

**Returns:** Array of `{ date, count }` — Unique students per date (only swipes with `pointsEarned > 0`), sorted by date

**Logic:** Groups by date; counts unique `studentId` per date.

---

#### `getPointsByDate(swipes)`

**Parameters:** `swipes` — Array of swipe objects

**Returns:** Array of `{ date, earned, redeemed }` — Points earned and redeemed per date, sorted by date

**Logic:** Aggregates `pointsEarned` and `pointsRedeemed` by date.

---

#### `getVisitBuckets(swipes)`

**Parameters:** `swipes` — Array of swipe objects

**Returns:** Object — `{ '1 visit': n, '2-3 visits': n, '4-6 visits': n, '7+ visits': n }`

**Logic:** Counts visits per student (pointsEarned > 0); buckets into 1, 2–3, 4–6, 7+.

---

#### `getDegreeBreakdown(swipes)`

**Parameters:** `swipes` — Array of swipe objects

**Returns:** Object — `{ degreeLevel: count }` (one count per unique student)

**Logic:** Uses first occurrence per `studentId`; `degreeLevel` defaults to `'Unknown'` if missing.

---

#### `PRIZE_RULES`

**Type:** Constant array of objects

**Structure:** `{ name, keywords, category, sized }` — Defines prize name, keyword matchers, category (Apparel, Accessories, Outdoor, etc.), and whether the prize has sizes.

**Entries:** Sunglasses, Vintage Hoodie, Black Hoodie, Crew Neck Sweater, CMU T-Shirt, 1/4 Zip, Picnic Blanket, Umbrella, Chair, Pin, Bottle.

---

#### `fuzzyMatchPrize(raw)`

**Parameters:** `raw` — Raw prize string from swipe data

**Returns:** `PRIZE_RULES` entry or `null`

**Logic:** Lowercases and trims; returns first rule whose `keywords` array has any keyword contained in `raw`.

---

#### `extractSize(swipeRow)`

**Parameters:** `swipeRow` — Swipe object with optional `size` and `prizeRedeemed`

**Returns:** String — Size (XXS, XS, S, M, L, XL, XXL, 2XL, 3XL) or `null`

**Logic:** Uses `swipeRow.size` if valid; otherwise parses size from end of `prizeRedeemed` via regex.

---

#### `getPrizeStats(swipes)`

**Parameters:** `swipes` — Array of swipe objects

**Returns:** `{ byProduct, bySize, byCategory, byRaw, totalMatched }`

**Logic:**
- `byProduct`: `{ productName: { size: count } }` — Redemptions per product and size.
- `bySize`: `{ size: count }` — Apparel sizes only.
- `byCategory`: `{ category: count }`.
- `byRaw`: `{ rawPrizeString: count }` — Unmatched raw strings.
- `totalMatched`: Count of swipes matched to a PRIZE_RULES entry.

---

#### `buildInventoryLedger(prizeStats, inventory)`

**Parameters:** `prizeStats` — Output of `getPrizeStats`; `inventory` — Array of `{ item, quantity, location, category }`

**Returns:** Array of ledger rows — `{ product, redeemed, sizeBreakdown, initialStock, remaining, inventoryItem, location }`

**Logic:**
- Matches products to inventory via `findInventoryMatch` (keyword overlap).
- For each product in `prizeStats.byProduct`: computes redeemed, size breakdown, initial stock (if in inventory), remaining.
- Adds inventory-only products (in PRIZE_RULES but no redemptions) with quantity > 0.
- Sorted by `redeemed` descending.

---

#### `generateInsights(swipes, stats, attendance, inventory)`

**Parameters:** `swipes`, `stats` (from `getStatistics`), `attendance` (from `getAttendanceByDate`), `inventory`

**Returns:** Array of `{ type, text }` — `type` is `'positive' | 'negative' | 'warning' | 'neutral'`

**Logic:** Produces insights such as:
- Attendance trend (up/down/stable over last 4 weeks).
- Return rate (students visiting more than once).
- Unredeemed points surplus.
- Low/out-of-stock inventory items.
- Peak attendance date.
- Redemption rate.
- Prize stock runway (weeks until stock depletes at current pace).

---

### B.3 React State & Hooks

| State/Ref | Type | Purpose |
|-----------|------|---------|
| `activeTab` | `useState('check-in')` | Current tab: `'check-in'`, `'redeem'`, `'statistics'`, `'history'`, `'data'` |
| `studentId` | `useState('')` | Raw input for student ID or email |
| `selectedPointsList` | `useState([])` | Multi-select of point values from wheel (e.g., [1, 3]) |
| `freeSpinActive` | `useState(false)` | Whether free spin bonus is active |
| `firstSpinPoints` | `useState(0)` | Points from first spin when free spin active (2) |
| `studentInfo` | `useState(null)` | Looked-up student object with cumulativePoints, isFirstTime, visitCount, alreadySpunToday |
| `selectedPrize` | `useState(null)` | Selected prize object for redemption |
| `alert` | `useState(null)` | `{ message, type }` for toast alerts |
| `students` | `useState([])` | Student roster from Sheets/import |
| `swipes` | `useState([])` | All check-in and redemption records |
| `recentActivities` | `useState([])` | Last 50 activity messages for Recent Activity panel |
| `searchTerm` | `useState('')` | Filter for Student History table |
| `sortBy` | `useState('lastVisit')` | Sort field for history table |
| `sortOrder` | `useState('desc')` | Sort direction |
| `inputRef` | `useRef(null)` | Ref to student ID input for focus management |
| `syncStatus` | `useState('idle')` | `'idle' | 'loading' | 'syncing' | 'success' | 'error'` |
| `syncMessage` | `useState('')` | Message shown in sync toast |
| `isInitialLoading` | `useState(SYNC_ENABLED)` | Blocks UI until initial Sheets load completes |
| `inventory` | `useState([])` | Prize inventory from `/api/inventory` |
| `attendanceChartRef` | `useRef(null)` | Canvas ref for attendance chart |
| `pointsChartRef` | `useRef(null)` | Canvas ref for points economy chart |
| `visitFreqChartRef` | `useRef(null)` | Canvas ref for visit frequency donut |
| `degreeChartRef` | `useRef(null)` | Canvas ref for degree breakdown donut |
| `prizeChartRef` | `useRef(null)` | Canvas ref for prize demand stacked bar |
| `prizeCategoryChartRef` | `useRef(null)` | Canvas ref for prize category donut |
| `sizeDistChartRef` | `useRef(null)` | Canvas ref for size distribution bar |
| `chartInstances` | `useRef({})` | Holds Chart.js instances for cleanup on unmount/update |

---

### B.4 Side Effects (useEffect)

| Effect | Dependencies | Behavior |
|--------|--------------|----------|
| **Initial load & Sheets sync** | `[]` | On mount: loads `tartanStudents`, `tartanSwipes`, `tartanActivities` from localStorage; if `SYNC_ENABLED`, calls `SheetsAPI.loadAllData()`, updates `students` and `swipes`, sets `syncStatus`/`syncMessage`, clears `isInitialLoading`. |
| **Persist students** | `[students]` | Writes `students` to `localStorage` key `tartanStudents`. |
| **Persist swipes** | `[swipes]` | Writes `swipes` to `localStorage`; if `swipes.length > 100`, debounces write by 1s. |
| **Persist recent activities** | `[recentActivities]` | Writes to `localStorage`; if length > 20, debounces by 500ms. |
| **Focus check-in input** | `[activeTab]` | When `activeTab === 'check-in'`, focuses `inputRef.current`. |
| **Fetch inventory** | `[]` | On mount: fetches `/api/inventory`, sets `inventory` if array. |
| **Charts render** | `[activeTab, swipes, inventory]` | When `activeTab === 'statistics'` and Chart is defined: destroys existing charts; builds attendance (with forecast), points, visit frequency, degree, prize demand, prize category, size distribution charts; returns cleanup that destroys all chart instances. Uses 200ms timeout before render. |

---

### B.5 Event Handlers & Business Logic

#### `showAlert(message, type)`

**Parameters:** `message` — String; `type` — `'success' | 'error' | 'warning' | 'info'`

**Logic:** Sets `alert` state; clears after 5 seconds.

---

#### `getTodaysDate()`

**Returns:** String — `YYYY-MM-DD` for today

---

#### `hasSpunToday(id)`

**Parameters:** `id` — Student ID

**Returns:** Boolean — True if any swipe exists for this student today with `pointsEarned > 0`

---

#### `calculateCumulativePoints(id)`

**Parameters:** `id` — Student ID

**Returns:** Number — Sum of `pointsEarned` minus sum of `pointsRedeemed` for that student

---

#### `lookupStudent(query)`

**Parameters:** `query` — Student ID or email string

**Returns:** Student object with `cumulativePoints`, `isFirstTime`, `visitCount`, `alreadySpunToday`, or `null`

**Logic:** If query contains `@`, matches by email; otherwise by exact ID. Shows error alert if not found.

---

#### `handleStudentIdChange(e)`

**Logic:** Updates `studentId` from input. If input looks like email, allows full string; otherwise strips non-digits and limits to 9. When 9 digits entered, calls `lookupStudent` and sets `studentInfo`; shows warning if already spun today.

---

#### `handleEmailLookup(e)`

**Logic:** On Enter key, if `studentId` contains `@`, calls `lookupStudent`, sets `studentId` to student's ID and `studentInfo`; shows warning if already spun today.

---

#### `togglePoint(pts)`

**Parameters:** `pts` — Point value (1, 2, 3, 5, or 10)

**Logic:** Toggles `pts` in `selectedPointsList` (add if absent, remove if present).

---

#### `handleFreeSpinClick()`

**Logic:** If not already active: sets `freeSpinActive` true, `firstSpinPoints` 2, clears `selectedPointsList`, shows info alert. Disabled when already active.

---

#### `handleCheckIn()`

**Logic:**
- Validates: `studentInfo` present, not already spun today, at least one point selected.
- Builds `newSwipe` with student data, `pointsEarned` = `totalSelectedPoints`, `pointsRedeemed` 0, today's date.
- Appends to `swipes`, prepends to `recentActivities`, shows success alert, calls `resetForm()`.
- If `SYNC_ENABLED`, calls `SheetsAPI.addSwipe(newSwipe)` and updates sync status.

---

#### `handlePrizeRedemption()`

**Logic:**
- Validates: `studentInfo`, `selectedPrize`, sufficient points.
- Prompts for size (if applicable).
- Builds `redemptionSwipe` with `pointsRedeemed`, `prizeRedeemed`, `size`.
- Appends to `swipes`, prepends to `recentActivities`, shows success, `resetForm()`.
- If `SYNC_ENABLED`, posts to Sheets.

---

#### `handleDeleteTodayEntry(sid)`

**Parameters:** `sid` — Student ID

**Logic:** Confirms via `window.confirm`; removes all swipes for `sid` and today from `swipes`; updates `recentActivities`; refreshes `studentInfo` via `lookupStudent`; if `SYNC_ENABLED`, calls `SheetsAPI.deleteSwipes(sid, today)`.

---

#### `resetForm()`

**Logic:** Clears `studentId`, `selectedPointsList`, `freeSpinActive`, `firstSpinPoints`, `studentInfo`, `selectedPrize`; focuses `inputRef`.

---

#### `handleImportRoster(e)`

**Logic:** Reads file via FileReader; parses Excel with XLSX; expects sheet named `"Students"`; maps columns `Nonunique Alternate Id`, `First Name`, `Preferred FN`, `Last Name`, `Email`, `Primary Degree Link: Degree Level`, `Pref Year`; filters to 9-digit IDs; sets `students`; shows success alert.

---

#### `handleImportSwipes(e)`

**Logic:** Reads Excel; expects `"Swipes"` sheet; maps columns `ID`, `Points Earned`, `Points Redeemed`, `Date Visited`, `Prize Redeemed`, `Size`, `First`, `Last`, `Degree level`, `Email`; validates 9-digit IDs; appends to `swipes`; if `SYNC_ENABLED`, calls `SheetsAPI.bulkAddSwipes`; shows success/skip count.

---

#### `handleExportData()`

**Logic:** Maps `swipes` to export format with `calculateCumulativePoints`; creates Excel via XLSX; downloads as `Tartan_Tuesday_Export_YYYY-MM-DD.xlsx`; shows success alert.

---

#### `getStatistics()`

**Returns:** `{ uniqueStudents, totalVisits, todayVisits, totalPointsEarned, totalPointsRedeemed, prizesRedeemed }`

**Logic:** Computes from `swipes` and `getTodaysDate()`.

---

#### `getStudentHistory()`

**Returns:** Array of `{ id, firstName, lastName, email, visits, totalEarned, totalRedeemed, lastVisit, cumulativePoints }`

**Logic:** Aggregates swipes per student; `visits` counts swipes with `pointsEarned > 0`; `cumulativePoints = totalEarned - totalRedeemed`.

---

#### `handleSort(field)`

**Parameters:** `field` — Sort column key

**Logic:** Toggles `sortOrder` if same field; otherwise sets `sortBy` to field and `sortOrder` to `'desc'`.

---

### B.6 Derived Computations

The `derivedStats` block runs only when `activeTab === 'statistics'`. It computes:

| Property | Description |
|----------|-------------|
| `redemptionRate` | `(prizesRedeemed / totalVisits * 100).toFixed(1)` |
| `avgPointsHeld` | `(surplus / uniqueStudents).toFixed(1)` |
| `returnRate` | `(returningStudents / totalStudents * 100).toFixed(0)` |
| `forecast` | Ensemble forecast value (or null if &lt; 4 weeks) |
| `ensembleResult` | Full `ensembleForecast()` output (models, low, high, etc.) |
| `attendance` | `getAttendanceByDate(swipes)` |
| `lastWeek`, `prevWeek` | Last two attendance entries |
| `weekDelta` | Percent change from prev week to last week |
| `prizeStats` | `getPrizeStats(swipes)` |
| `ledger` | `buildInventoryLedger(prizeStats, inventory)` |
| `totalPrizesGiven` | Sum of `prizeStats.byCategory` |
| `totalRemaining` | Sum of `remaining` in ledger |
| `orderRecs` | Ledger rows with `usageRate`, `weeksLeft`, `usagePct`; sorted by `weeksLeft` |
| `slowMovers` | `orderRecs` with `usagePct < 15` and `remaining > 10` |
| `fastMovers` | `orderRecs` with `usagePct > 60` or `weeksLeft < 6` |
| `insights` | `generateInsights(swipes, stats, attendance, inventory)` |

---

### B.7 UI Sections

#### Check-In Tab

- **Student ID/Email input** — Text input with `handleStudentIdChange`, `handleEmailLookup`; hint to press Enter for email lookup.
- **Student Information** — Shows name, email, degree, points, status (First Visit / Visit #N / Already checked in); "Delete Today's Entry" button when already spun.
- **Points from Wheel Spin** — Multi-select buttons (1, 2, 3, 5, 10 pts) and "Free Spin" (adds 2 pts + second spin); live total display.
- **Requirements checklist** — Two items: student valid and not already spun; points selected.
- **Complete Check-In** — Primary button; disabled when invalid or already spun.
- **Clear Form** — Secondary button.
- **Recent Activity** — List of last 50 activities (check-ins, redemptions, deletions).

---

#### Redeem Tab

- **Student ID/Email input** — Same as check-in.
- **Student Information** — Name and balance (points).
- **Select Prize** — Grid of `PRIZES` (30, 25, 20, 10 pts); click to select.
- **Redeem Prize** — Primary button; prompts for size; disabled without student and prize.
- **Clear Form** — Secondary button.
- **Prize Catalog** — Read-only list of prizes with points and tier.

---

#### Statistics Tab

- **At a Glance** — Hero cards: students served, last week count + delta, forecast (next Tuesday), return rate + avg points held.
- **Attendance** — Bar chart with trend line and ensemble forecast; expandable model breakdown.
- **Inventory & Prizes** — Metric pills (given, in stock, redemption rate); ledger table (product, given, left, stock used %, sizes, status); ordering recommendations (fast movers / slow movers).
- **What's Popular** — Prize demand stacked bar; category donut; size distribution bar.
- **Points & Engagement** — Points earned/redeemed bar chart; visit frequency donut; degree breakdown donut.
- **Insights** — List of generated insights (positive, negative, warning, neutral).

---

#### History Tab

- **Search bar** — Filters by first name, last name, or ID.
- **Sortable table** — Columns: ID, Name, Email, Visits, Earned, Redeemed, Balance, Last Visit; click header to sort (except Email).

---

#### Data Management Tab

- **Import Student Roster** — File input for Excel with "Students" sheet.
- **Import Existing Swipes** — File input for Excel with "Swipes" sheet; appends to current data.
- **Export All Data to Excel** — Downloads swipes as Excel.
- **Refresh from Google Sheets** — Calls `SheetsAPI.loadAllData()`, updates students and swipes.
- **Current Data Status** — Displays counts: students, swipes, recent activities, sync status.
- **Data Comparison Sheet** — Info box + "Rebuild Comparison Sheet from All Swipes" button; POSTs to `/api/comparison/sync`.
- **Important Notes** — Bullet list of sync and import behavior.

---

#### Global UI Elements

- **Loading overlay** — Shown during `isInitialLoading`.
- **Sync toast** — Shows status/message when `syncStatus !== 'idle'`.
- **Topbar** — Logo, title, today's check-ins count, link to `/charts.html`.
- **Hero** — Title, subtitle, four stat boxes (unique students, total visits, points earned, prizes redeemed).
- **Tab buttons** — Check-In, Redeem Prize, Statistics, Student History, Data Management.
- **Alert** — Toast for success/error/warning/info.
- **Footer** — Copyright and attribution.
