const { useState, useEffect, useRef } = React;

const PRIZES = [
    { points: 30, name: "Vest / Chair", tier: "Tier 1" },
    { points: 25, name: "Blanket / Tent / Mug", tier: "Tier 2" },
    { points: 20, name: "Mousepad / Towel", tier: "Tier 3" },
    { points: 10, name: "Sunglasses / Tumbler / Notepad", tier: "Tier 4" }
];

const POINT_OPTIONS = [1, 2, 3, 5, 10];

async function apiFetch(path, opts = {}) {
    const res = await fetch(path, opts);
    if (res.status === 401) {
        window.location.reload();
        throw new Error('Session expired');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

// ── Privacy Utilities ──

function maskId(id) {
    if (!id || id.length < 4) return '***';
    return '***' + id.slice(-3);
}

function maskEmail(email) {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return local.slice(0, 2) + '***@' + domain;
}

function maskName(first, last) {
    const f = first ? first.charAt(0) + '.' : '';
    const l = last || '';
    return `${f} ${l}`;
}

// ── ML Utilities ──

function linearRegression(ys) {
    const n = ys.length;
    if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0, predict: () => ys[0] || 0 };
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += ys[i]; sxy += i * ys[i]; sxx += i * i; }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    const mean = sy / n;
    const ssTot = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { slope, intercept, r2, predict: (x) => Math.max(0, Math.round(slope * x + intercept)) };
}

function exponentialSmoothing(series, alpha = 0.3) {
    if (!series.length) return 0;
    let s = series[0];
    for (let i = 1; i < series.length; i++) s = alpha * series[i] + (1 - alpha) * s;
    return Math.max(0, Math.round(s));
}

function holtDoubleSmoothing(series, alpha = 0.35, beta = 0.15) {
    if (series.length < 2) return { forecast: series[0] || 0, predictAhead: () => series[0] || 0 };
    let level = series[0];
    let trend = series[1] - series[0];
    for (let i = 1; i < series.length; i++) {
        const prev = level;
        level = alpha * series[i] + (1 - alpha) * (prev + trend);
        trend = beta * (level - prev) + (1 - beta) * trend;
    }
    return {
        forecast: Math.max(0, Math.round(level + trend)),
        level, trend,
        predictAhead: (k) => Math.max(0, Math.round(level + k * trend))
    };
}

function polyRegression(ys, degree = 2) {
    const n = ys.length;
    if (n <= degree) return linearRegression(ys);
    const d = degree + 1;
    const sums = new Array(2 * degree + 1).fill(0);
    const rhs = new Array(d).fill(0);
    for (let i = 0; i < n; i++) {
        let xp = 1;
        for (let j = 0; j < 2 * degree + 1; j++) { sums[j] += xp; xp *= i; }
        xp = 1;
        for (let j = 0; j < d; j++) { rhs[j] += xp * ys[i]; xp *= i; }
    }
    const mat = [];
    for (let i = 0; i < d; i++) {
        mat[i] = [];
        for (let j = 0; j < d; j++) mat[i][j] = sums[i + j];
        mat[i][d] = rhs[i];
    }
    for (let i = 0; i < d; i++) {
        let maxR = i;
        for (let k = i + 1; k < d; k++) { if (Math.abs(mat[k][i]) > Math.abs(mat[maxR][i])) maxR = k; }
        [mat[i], mat[maxR]] = [mat[maxR], mat[i]];
        if (Math.abs(mat[i][i]) < 1e-12) continue;
        for (let k = i + 1; k < d; k++) {
            const f = mat[k][i] / mat[i][i];
            for (let j = i; j <= d; j++) mat[k][j] -= f * mat[i][j];
        }
    }
    const coeffs = new Array(d).fill(0);
    for (let i = d - 1; i >= 0; i--) {
        if (Math.abs(mat[i][i]) < 1e-12) continue;
        coeffs[i] = mat[i][d];
        for (let j = i + 1; j < d; j++) coeffs[i] -= mat[i][j] * coeffs[j];
        coeffs[i] /= mat[i][i];
    }
    const predict = (x) => {
        let val = 0, xp = 1;
        for (let j = 0; j < d; j++) { val += coeffs[j] * xp; xp *= x; }
        return Math.max(0, Math.round(val));
    };
    const mean = ys.reduce((s, y) => s + y, 0) / n;
    const ssTot = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
    const ssRes = ys.reduce((s, y, i) => s + (y - predict(i)) ** 2, 0);
    return { coeffs, r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot, predict };
}

function weightedMovingAvg(series, decay = 0.75) {
    if (!series.length) return 0;
    let ws = 0, vs = 0;
    for (let i = 0; i < series.length; i++) {
        const w = Math.pow(decay, series.length - 1 - i);
        vs += w * series[i]; ws += w;
    }
    return Math.max(0, Math.round(vs / ws));
}

function ensembleForecast(series) {
    if (series.length < 4) {
        const v = exponentialSmoothing(series, 0.3);
        return { forecast: v, low: Math.max(0, v - 5), high: v + 5, models: [], method: 'Simple smoothing (limited data)' };
    }
    const models = [
        { name: 'Holt-Winters', fn: (tr) => holtDoubleSmoothing(tr, 0.35, 0.15).forecast },
        { name: 'Quadratic Regression', fn: (tr) => polyRegression(tr, Math.min(2, tr.length - 2)).predict(tr.length) },
        { name: 'Weighted Moving Avg', fn: (tr) => weightedMovingAvg(tr, 0.75) }
    ];
    const testSize = Math.min(4, Math.floor(series.length / 2));
    const errors = models.map(() => []);
    for (let t = series.length - testSize; t < series.length; t++) {
        const train = series.slice(0, t);
        const actual = series[t];
        models.forEach((m, mi) => { try { errors[mi].push((m.fn(train) - actual) ** 2); } catch(e) { errors[mi].push(1e6); } });
    }
    const rmses = errors.map(errs => Math.sqrt(errs.reduce((s, e) => s + e, 0) / Math.max(errs.length, 1)));
    const invR = rmses.map(r => r < 0.01 ? 1000 : 1 / r);
    const totW = invR.reduce((s, w) => s + w, 0);
    const weights = invR.map(w => w / totW);
    const preds = models.map(m => { try { return m.fn(series); } catch(e) { return series[series.length - 1]; } });
    const forecast = Math.max(0, Math.round(preds.reduce((s, p, i) => s + p * weights[i], 0)));
    const avgRmse = rmses.reduce((s, r) => s + r, 0) / rmses.length;
    const spread = Math.max(...preds) - Math.min(...preds);
    const unc = Math.max(avgRmse * 1.5, spread / 2, 2);
    const details = models.map((m, i) => ({ name: m.name, prediction: preds[i], rmse: rmses[i].toFixed(1), weight: (weights[i] * 100).toFixed(0) + '%' }));
    const best = details.reduce((b, d) => parseFloat(d.rmse) < parseFloat(b.rmse) ? d : b, details[0]);
    return {
        forecast, low: Math.max(0, Math.round(forecast - unc)), high: Math.round(forecast + unc),
        models: details, bestModel: best.name,
        method: `Ensemble of ${models.length} models (best: ${best.name}, RMSE ${best.rmse})`
    };
}

function getContiguousRun(sorted) {
    if (sorted.length <= 1) return sorted;
    const result = [sorted[sorted.length - 1]];
    for (let i = sorted.length - 2; i >= 0; i--) {
        const gap = (new Date(sorted[i + 1].date) - new Date(sorted[i].date)) / 86400000;
        if (gap > 21) break;
        result.unshift(sorted[i]);
    }
    return result;
}

function getNextTuesday() {
    const d = new Date();
    d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7));
    return d.toISOString().split('T')[0];
}

function fmtDateLabel(s) {
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Data Processing ──

function getAttendanceByDate(swipes) {
    const m = {};
    swipes.forEach(s => { if (s.pointsEarned > 0) { if (!m[s.date]) m[s.date] = new Set(); m[s.date].add(s.studentId); } });
    return Object.entries(m).map(([date, set]) => ({ date, count: set.size })).sort((a, b) => a.date.localeCompare(b.date));
}

function getPointsByDate(swipes) {
    const m = {};
    swipes.forEach(s => {
        if (!m[s.date]) m[s.date] = { earned: 0, redeemed: 0 };
        m[s.date].earned += s.pointsEarned || 0;
        m[s.date].redeemed += s.pointsRedeemed || 0;
    });
    return Object.entries(m).map(([date, p]) => ({ date, ...p })).sort((a, b) => a.date.localeCompare(b.date));
}

function getVisitBuckets(swipes) {
    const v = {};
    swipes.forEach(s => { if (s.pointsEarned > 0) v[s.studentId] = (v[s.studentId] || 0) + 1; });
    const b = { '1 visit': 0, '2-3 visits': 0, '4-6 visits': 0, '7+ visits': 0 };
    Object.values(v).forEach(n => { if (n === 1) b['1 visit']++; else if (n <= 3) b['2-3 visits']++; else if (n <= 6) b['4-6 visits']++; else b['7+ visits']++; });
    return b;
}

function getDegreeBreakdown(swipes) {
    const d = {}, seen = new Set();
    swipes.forEach(s => { if (!seen.has(s.studentId)) { seen.add(s.studentId); d[s.degreeLevel || 'Unknown'] = (d[s.degreeLevel || 'Unknown'] || 0) + 1; } });
    return d;
}

const PRIZE_RULES = [
    { name: 'Sunglasses',       keywords: ['sunglasses', 'sunglass', 'shades'],                                    category: 'Accessories', sized: false },
    { name: 'Vintage Hoodie',   keywords: ['vintage hoodie', 'vintage', 'older hoodie', 'older black hoodie', 'full size logo', 'old hoodie'], category: 'Apparel', sized: true },
    { name: 'Black Hoodie',     keywords: ['black hoodie', 'hoodie'],                                              category: 'Apparel', sized: true },
    { name: 'Crew Neck Sweater',keywords: ['crew neck', 'crewneck', 'sweater', 'sweatshirt'],                      category: 'Apparel', sized: true },
    { name: 'CMU T-Shirt',      keywords: ['t-shirt', 'tshirt', 't shirt', 'tee shirt', 'tee'],                    category: 'Apparel', sized: true },
    { name: '1/4 Zip',          keywords: ['1/4 zip', 'quarter zip', '1/4zip', 'zip up', 'zip-up', 'zipup', 'zip'],category: 'Apparel', sized: true },
    { name: 'Picnic Blanket',   keywords: ['picnic', 'blanket', 'picnic blanket'],                                 category: 'Outdoor', sized: false },
    { name: 'Umbrella',         keywords: ['umbrella'],                                                             category: 'Outdoor', sized: false },
    { name: 'Chair',            keywords: ['chair', 'folding chair', 'lawn chair', 'camping chair'],               category: 'Outdoor', sized: false },
    { name: 'Pin',              keywords: ['pin', 'lapel pin', 'enamel pin', 'badge pin'],                         category: 'Accessories', sized: false },
    { name: 'Bottle',           keywords: ['bottle', 'water bottle', 'tumbler', 'flask'],                           category: 'Accessories', sized: false }
];

function fuzzyMatchPrize(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase().trim();
    if (!lower) return null;
    for (const rule of PRIZE_RULES) {
        if (rule.keywords.some(kw => lower.includes(kw))) return rule;
    }
    return null;
}

function extractSize(swipeRow) {
    if (swipeRow.size) {
        const s = swipeRow.size.toString().trim().toUpperCase();
        if (/^(XXS|XS|S|M|L|XL|XXL|2XL|3XL)$/i.test(s)) return s;
    }
    const text = (swipeRow.prizeRedeemed || '').trim();
    const m = text.match(/[-\s](XXS|XS|S|M|L|XL|XXL|2XL|3XL)\s*$/i);
    return m ? m[1].toUpperCase() : null;
}

function getPrizeStats(swipes) {
    const byProduct = {}, bySize = {}, byCategory = {}, byRaw = {};
    let totalMatched = 0;
    swipes.forEach(s => {
        if (!s.prizeRedeemed) return;
        const rule = fuzzyMatchPrize(s.prizeRedeemed);
        if (!rule) return;
        totalMatched++;
        const name = rule.name;
        if (!byProduct[name]) byProduct[name] = {};
        const sz = rule.sized ? (extractSize(s) || 'Unknown') : 'One Size';
        byProduct[name][sz] = (byProduct[name][sz] || 0) + 1;
        if (rule.sized && sz !== 'Unknown') bySize[sz] = (bySize[sz] || 0) + 1;
        byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
        const rawKey = s.prizeRedeemed.trim();
        byRaw[rawKey] = (byRaw[rawKey] || 0) + 1;
    });
    return { byProduct, bySize, byCategory, byRaw, totalMatched };
}

function buildInventoryLedger(prizeStats, inventory) {
    const ledger = [];
    const invLookup = {};
    inventory.forEach(item => {
        const key = item.item.toLowerCase().trim();
        invLookup[key] = item;
    });

    function findInventoryMatch(prizeName) {
        const lower = prizeName.toLowerCase();
        for (const [key, item] of Object.entries(invLookup)) {
            if (key.includes(lower) || lower.includes(key)) return item;
            const words = lower.split(/\s+/);
            const keyWords = key.split(/\s+/);
            const overlap = words.filter(w => w.length > 2 && keyWords.some(kw => kw.includes(w) || w.includes(kw)));
            if (overlap.length >= 1 && overlap.length >= Math.min(words.length, keyWords.length) * 0.5) return item;
        }
        return null;
    }

    for (const [product, sizes] of Object.entries(prizeStats.byProduct)) {
        const totalRedeemed = Object.values(sizes).reduce((s, v) => s + v, 0);
        const invItem = findInventoryMatch(product);
        const initialStock = invItem ? invItem.quantity + totalRedeemed : null;
        const remaining = invItem ? invItem.quantity : null;
        ledger.push({
            product,
            redeemed: totalRedeemed,
            sizeBreakdown: sizes,
            initialStock,
            remaining,
            inventoryItem: invItem ? invItem.item : null,
            location: invItem ? invItem.location : null
        });
    }

    PRIZE_RULES.forEach(rule => {
        if (!prizeStats.byProduct[rule.name]) {
            const invItem = findInventoryMatch(rule.name);
            if (invItem && invItem.quantity > 0) {
                ledger.push({
                    product: rule.name,
                    redeemed: 0,
                    sizeBreakdown: {},
                    initialStock: invItem.quantity,
                    remaining: invItem.quantity,
                    inventoryItem: invItem.item,
                    location: invItem.location
                });
            }
        }
    });

    ledger.sort((a, b) => b.redeemed - a.redeemed);
    return ledger;
}

function generateInsights(swipes, stats, attendance, inventory) {
    const ins = [];
    if (attendance.length >= 4) {
        const r4 = attendance.slice(-4), p4 = attendance.slice(-8, -4);
        const rAvg = r4.reduce((s, a) => s + a.count, 0) / 4;
        if (p4.length >= 4) {
            const pAvg = p4.reduce((s, a) => s + a.count, 0) / 4;
            const chg = ((rAvg - pAvg) / pAvg * 100).toFixed(0);
            if (chg > 5) ins.push({ type: 'positive', text: `Attendance is up ${chg}% over the last 4 weeks (avg ${rAvg.toFixed(0)} vs prior ${pAvg.toFixed(0)})` });
            else if (chg < -5) ins.push({ type: 'negative', text: `Attendance has dipped ${Math.abs(chg)}% over the last 4 weeks` });
            else ins.push({ type: 'neutral', text: `Attendance has been stable over the last 4 weeks (avg ~${rAvg.toFixed(0)} students)` });
        }
    }
    const sv = {};
    swipes.forEach(s => { if (s.pointsEarned > 0) sv[s.studentId] = (sv[s.studentId] || 0) + 1; });
    const total = Object.keys(sv).length, ret = Object.values(sv).filter(v => v > 1).length;
    if (total > 0) {
        const pct = (ret / total * 100).toFixed(0);
        if (pct < 40) ins.push({ type: 'warning', text: `Only ${pct}% of students return after their first visit — consider engagement strategies` });
        else if (pct >= 60) ins.push({ type: 'positive', text: `Strong retention: ${pct}% of students have visited more than once` });
        else ins.push({ type: 'neutral', text: `${pct}% of students have returned for multiple visits` });
    }
    if (stats.totalPointsEarned > 0) {
        const surplus = stats.totalPointsEarned - stats.totalPointsRedeemed;
        const avg = total > 0 ? (surplus / total).toFixed(1) : 0;
        ins.push({ type: 'neutral', text: `Students collectively hold ${surplus} unredeemed points (avg ${avg} per student)` });
    }
    if (inventory?.length > 0) {
        const low = inventory.filter(i => i.quantity > 0 && i.quantity <= 3);
        if (low.length > 0) ins.push({ type: 'warning', text: `${low.length} inventory item${low.length > 1 ? 's' : ''} running low: ${low.map(i => i.item).slice(0, 5).join(', ')}` });
        const out = inventory.filter(i => i.quantity === 0);
        if (out.length > 0) ins.push({ type: 'negative', text: `${out.length} item${out.length > 1 ? 's' : ''} out of stock` });
    }
    if (attendance.length >= 3) {
        const peak = attendance.reduce((m, a) => a.count > m.count ? a : m, attendance[0]);
        ins.push({ type: 'neutral', text: `Peak attendance: ${peak.count} students on ${fmtDateLabel(peak.date)}` });
    }
    if (stats.totalVisits > 0) {
        ins.push({ type: 'neutral', text: `${(stats.prizesRedeemed / stats.totalVisits * 100).toFixed(1)}% of check-ins have led to prize redemptions` });
    }
    if (inventory?.length > 0 && attendance.length >= 2) {
        const weeklyR = stats.prizesRedeemed / attendance.length;
        if (weeklyR > 0) {
            const stock = inventory.filter(i => i.category === 'Prizes' || i.category === 'Giveaways').reduce((s, i) => s + i.quantity, 0);
            const recentWeeks = Math.min(4, attendance.length);
            const recentSwipes = swipes.filter(s => {
                const recent = attendance.slice(-recentWeeks).map(a => a.date);
                return s.pointsRedeemed > 0 && recent.includes(s.date);
            });
            const recentRate = recentSwipes.length / recentWeeks;
            const rate = recentRate > 0 ? recentRate : weeklyR;
            const wks = Math.round(stock / rate);
            const trendNote = recentRate > weeklyR * 1.2 ? ' (redemptions accelerating)' : recentRate < weeklyR * 0.8 ? ' (redemptions slowing)' : '';
            if (wks < 4) ins.push({ type: 'negative', text: `At current pace, prize/giveaway stock could run out in ~${wks} weeks${trendNote}` });
            else if (wks < 8) ins.push({ type: 'warning', text: `Prize/giveaway inventory estimated to last ~${wks} more weeks${trendNote}` });
            else ins.push({ type: 'positive', text: `Prize/giveaway inventory looks healthy (~${wks} weeks at current pace)${trendNote}` });
        }
    }
    return ins;
}

function TartanTuesdayApp() {
    const [activeTab, setActiveTab] = useState('check-in');
    const [studentId, setStudentId] = useState('');
    const [selectedPointsList, setSelectedPointsList] = useState([]);   // multi-select
    const [freeSpinActive, setFreeSpinActive] = useState(false);
    const [firstSpinPoints, setFirstSpinPoints] = useState(0);
    const [studentInfo, setStudentInfo] = useState(null);
    const [selectedPrize, setSelectedPrize] = useState(null);
    const [alert, setAlert] = useState(null);
    const [students, setStudents] = useState([]);
    const [swipes, setSwipes] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const inputRef = useRef(null);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [syncMessage, setSyncMessage] = useState('');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const attendanceChartRef = useRef(null);
    const pointsChartRef = useRef(null);
    const visitFreqChartRef = useRef(null);
    const degreeChartRef = useRef(null);
    const prizeChartRef = useRef(null);
    const prizeCategoryChartRef = useRef(null);
    const sizeDistChartRef = useRef(null);
    const chartInstances = useRef({});

    useEffect(() => {
        try {
            const savedStudents = localStorage.getItem('tartanStudents');
            const savedSwipes = localStorage.getItem('tartanSwipes');
            const savedActivities = localStorage.getItem('tartanActivities');
            if (savedStudents) setStudents(JSON.parse(savedStudents));
            if (savedSwipes) setSwipes(JSON.parse(savedSwipes));
            if (savedActivities) setRecentActivities(JSON.parse(savedActivities));
        } catch (e) { console.error('localStorage load error:', e); }

        setSyncStatus('loading');
        setSyncMessage('Loading from Google Sheets...');
        apiFetch('/api/data')
            .then(data => {
                if (data && !data.error) {
                    if (data.students?.length > 0) setStudents(data.students);
                    if (data.swipes) setSwipes(data.swipes);
                    setSyncStatus('success');
                    setSyncMessage('Synced with Google Sheets');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                }
            })
            .catch(err => {
                console.error('Sheets load failed:', err);
                setSyncStatus('error');
                setSyncMessage('Offline mode — using local data');
            })
            .finally(() => setIsInitialLoading(false));
    }, []);

    useEffect(() => { localStorage.setItem('tartanStudents', JSON.stringify(students)); }, [students]);

    useEffect(() => {
        if (swipes.length > 100) {
            const t = setTimeout(() => {
                try { localStorage.setItem('tartanSwipes', JSON.stringify(swipes)); } catch (e) {}
            }, 1000);
            return () => clearTimeout(t);
        } else {
            localStorage.setItem('tartanSwipes', JSON.stringify(swipes));
        }
    }, [swipes]);

    useEffect(() => {
        if (recentActivities.length > 20) {
            const t = setTimeout(() => localStorage.setItem('tartanActivities', JSON.stringify(recentActivities)), 500);
            return () => clearTimeout(t);
        } else {
            localStorage.setItem('tartanActivities', JSON.stringify(recentActivities));
        }
    }, [recentActivities]);

    useEffect(() => {
        if (activeTab === 'check-in' && inputRef.current) inputRef.current.focus();
    }, [activeTab]);

    useEffect(() => {
        apiFetch('/api/inventory')
            .then(data => { if (Array.isArray(data)) setInventory(data); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (activeTab !== 'statistics' || typeof Chart === 'undefined') return;
        Chart.defaults.font.family = "'Open Sans', sans-serif";
        Chart.defaults.color = '#555';

        const timer = setTimeout(() => {
            Object.values(chartInstances.current).forEach(c => c?.destroy());
            chartInstances.current = {};

            const attendance = getAttendanceByDate(swipes);
            const pointsData = getPointsByDate(swipes);
            const buckets = getVisitBuckets(swipes);
            const degrees = getDegreeBreakdown(swipes);
            const prizes = getPrizeStats(swipes);

            // Attendance Trend + Ensemble Forecast
            if (attendanceChartRef.current && attendance.length >= 2) {
                const run = getContiguousRun(attendance);
                const counts = run.map(a => a.count);
                const labels = run.map(a => fmtDateLabel(a.date));

                const hw = holtDoubleSmoothing(counts, 0.35, 0.15);
                const trendLine = counts.map((_, i) => Math.max(0, Math.round(hw.level - hw.trend * (counts.length - 1 - i) + hw.trend * i)));
                const smoothTrend = counts.map((_, i) => linearRegression(counts).predict(i));

                const hasForecast = counts.length >= 4;
                const ens = hasForecast ? ensembleForecast(counts) : null;

                const allLabels = [...labels];
                const actualData = [...counts];
                const trendData = [...smoothTrend];
                const forecastData = counts.map(() => null);
                const rangeLow = counts.map(() => null);
                const rangeHigh = counts.map(() => null);

                if (ens) {
                    allLabels.push(fmtDateLabel(getNextTuesday()));
                    actualData.push(null);
                    trendData.push(linearRegression(counts).predict(counts.length));
                    forecastData.push(ens.forecast);
                    rangeLow.push(ens.low);
                    rangeHigh.push(ens.high);
                }

                chartInstances.current.attendance = new Chart(attendanceChartRef.current, {
                    type: 'bar',
                    data: {
                        labels: allLabels,
                        datasets: [
                            { label: 'Attendance', data: actualData, backgroundColor: 'rgba(155,27,48,0.75)', borderRadius: 4, order: 3 },
                            ...(ens ? [
                                { label: `Forecast (${ens.low}-${ens.high})`, data: forecastData, backgroundColor: 'rgba(212,168,67,0.8)', borderColor: '#D4A843', borderWidth: 2, borderDash: [5,5], borderRadius: 4, order: 2 },
                                { label: 'Confidence Range', data: rangeHigh, type: 'line', borderColor: 'rgba(212,168,67,0.3)', backgroundColor: 'rgba(212,168,67,0.08)', borderWidth: 1, borderDash: [3,3], pointRadius: 0, fill: '+1', order: 0 },
                                { label: '', data: rangeLow, type: 'line', borderColor: 'rgba(212,168,67,0.3)', borderWidth: 1, borderDash: [3,3], pointRadius: 0, fill: false, order: 0 }
                            ] : []),
                            { label: 'Trend', data: trendData, type: 'line', borderColor: '#1E3A5F', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false, order: 1 }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, filter: (item) => item.text !== '' } }
                        },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Unique Students' } } }
                    }
                });
            }

            // Points Economy
            if (pointsChartRef.current && pointsData.length >= 2) {
                chartInstances.current.points = new Chart(pointsChartRef.current, {
                    type: 'bar',
                    data: {
                        labels: pointsData.map(p => fmtDateLabel(p.date)),
                        datasets: [
                            { label: 'Earned', data: pointsData.map(p => p.earned), backgroundColor: 'rgba(45,106,79,0.75)', borderRadius: 4 },
                            { label: 'Redeemed', data: pointsData.map(p => p.redeemed), backgroundColor: 'rgba(155,27,48,0.75)', borderRadius: 4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Points' } } } }
                });
            }

            // Visit Frequency Donut
            if (visitFreqChartRef.current) {
                const bKeys = Object.keys(buckets), bVals = Object.values(buckets);
                if (bVals.some(v => v > 0)) {
                    chartInstances.current.visitFreq = new Chart(visitFreqChartRef.current, {
                        type: 'doughnut',
                        data: { labels: bKeys, datasets: [{ data: bVals, backgroundColor: ['#9B1B30', '#1E3A5F', '#2D6A4F', '#D4A843'], borderWidth: 2, borderColor: '#fff' }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } } }
                    });
                }
            }

            // Degree Breakdown Donut
            if (degreeChartRef.current) {
                const dKeys = Object.keys(degrees), dVals = Object.values(degrees);
                if (dVals.some(v => v > 0)) {
                    chartInstances.current.degree = new Chart(degreeChartRef.current, {
                        type: 'doughnut',
                        data: { labels: dKeys, datasets: [{ data: dVals, backgroundColor: ['#9B1B30', '#1E3A5F', '#2D6A4F', '#D4A843', '#6B2FA0', '#1A8A7D', '#D45B20', '#64748b'], borderWidth: 2, borderColor: '#fff' }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } } }
                    });
                }
            }

            // Prize Demand by Product (stacked horizontal bar — sizes stacked per product)
            if (prizeChartRef.current && Object.keys(prizes.byProduct).length > 0) {
                const products = Object.keys(prizes.byProduct).sort((a, b) => {
                    const ta = Object.values(prizes.byProduct[a]).reduce((s, v) => s + v, 0);
                    const tb = Object.values(prizes.byProduct[b]).reduce((s, v) => s + v, 0);
                    return tb - ta;
                });
                const allSizes = [...new Set(products.flatMap(p => Object.keys(prizes.byProduct[p])))];
                const sizeOrder = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL','One Size'];
                allSizes.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
                const sizeColors = { 'XXS': '#fca5a5', 'XS': '#f87171', 'S': '#ef4444', 'M': '#dc2626', 'L': '#b91c1c', 'XL': '#991b1b', 'XXL': '#7f1d1d', '2XL': '#5c1010', '3XL': '#3b0808', 'One Size': '#D4A843', 'Unknown': '#ccc' };
                const datasets = allSizes.map(sz => ({
                    label: sz,
                    data: products.map(p => prizes.byProduct[p][sz] || 0),
                    backgroundColor: sizeColors[sz] || '#999',
                    borderRadius: 3
                }));
                chartInstances.current.prize = new Chart(prizeChartRef.current, {
                    type: 'bar',
                    data: { labels: products.map(p => p.length > 30 ? p.slice(0, 27) + '...' : p), datasets },
                    options: {
                        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14, font: { size: 11 } } },
                            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} redeemed` } } },
                        scales: { x: { stacked: true, beginAtZero: true, title: { display: true, text: 'Redemptions' }, ticks: { stepSize: 1 } }, y: { stacked: true } }
                    }
                });
            }

            // Prize Category Breakdown (donut)
            if (prizeCategoryChartRef.current && Object.keys(prizes.byCategory).length > 0) {
                const catKeys = Object.keys(prizes.byCategory);
                const catVals = catKeys.map(k => prizes.byCategory[k]);
                const catColors = { 'Apparel': '#9B1B30', 'Accessories': '#D4A843', 'Outdoor': '#1E3A5F', 'Food': '#2d6a4f' };
                chartInstances.current.prizeCategory = new Chart(prizeCategoryChartRef.current, {
                    type: 'doughnut',
                    data: { labels: catKeys, datasets: [{ data: catVals, backgroundColor: catKeys.map(k => catColors[k] || '#888'), borderWidth: 2, borderColor: '#fff' }] },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '55%',
                        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } },
                            tooltip: { callbacks: { label: (ctx) => { const t = catVals.reduce((s, v) => s + v, 0); return `${ctx.label}: ${ctx.raw} (${(ctx.raw / t * 100).toFixed(0)}%)`; } } } } }
                });
            }

            // Size Distribution (apparel only — bar chart)
            if (sizeDistChartRef.current && Object.keys(prizes.bySize).length > 0) {
                const sizeOrder = ['XXS','XS','S','M','L','XL','XXL','2XL','3XL'];
                const sKeys = Object.keys(prizes.bySize).sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
                const sVals = sKeys.map(k => prizes.bySize[k]);
                const maxVal = Math.max(...sVals);
                chartInstances.current.sizeDist = new Chart(sizeDistChartRef.current, {
                    type: 'bar',
                    data: { labels: sKeys, datasets: [{ label: 'Redeemed', data: sVals, backgroundColor: sVals.map(v => v === maxVal ? '#9B1B30' : 'rgba(155,27,48,0.45)'), borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false },
                            tooltip: { callbacks: { label: (ctx) => { const t = sVals.reduce((s, v) => s + v, 0); return `${ctx.raw} redeemed (${(ctx.raw / t * 100).toFixed(0)}% of sized items)`; } } } },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Redemptions' }, ticks: { stepSize: 1 } } } }
                });
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            Object.values(chartInstances.current).forEach(c => c?.destroy());
            chartInstances.current = {};
        };
    }, [activeTab, swipes, inventory]);

    const showAlert = (message, type) => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 5000);
    };

    const getTodaysDate = () => new Date().toISOString().split('T')[0];

    const hasSpunToday = (id) => {
        const today = getTodaysDate();
        return swipes.some(s => s.studentId === id && s.date === today && s.pointsEarned > 0);
    };

    const calculateCumulativePoints = (id) => {
        const ss = swipes.filter(s => s.studentId === id);
        return ss.reduce((sum, s) => sum + (s.pointsEarned || 0), 0)
             - ss.reduce((sum, s) => sum + (s.pointsRedeemed || 0), 0);
    };

    const lookupStudent = (query) => {
        const q = query.trim().toLowerCase();
        const student = q.includes('@')
            ? students.find(s => s.email.toLowerCase() === q)
            : students.find(s => s.id === query);
        if (student) {
            return {
                ...student,
                cumulativePoints: calculateCumulativePoints(student.id),
                isFirstTime: !swipes.some(s => s.studentId === student.id),
                visitCount: swipes.filter(s => s.studentId === student.id && s.pointsEarned > 0).length,
                alreadySpunToday: hasSpunToday(student.id)
            };
        }
        showAlert('Student not found in roster. Please check the ID or email.', 'error');
        return null;
    };

    const handleStudentIdChange = (e) => {
        const raw = e.target.value;
        const isEmail = raw.includes('@') || /[a-zA-Z]/.test(raw);

        if (isEmail) {
            setStudentId(raw);
        } else {
            const digits = raw.replace(/\D/g, '');
            if (digits.length <= 9) setStudentId(digits);
            if (digits.length === 9) {
                const student = lookupStudent(digits);
                if (student) {
                    setStudentId(maskId(student.id));
                    setStudentInfo(student);
                    if (student.alreadySpunToday) showAlert('This student has already spun the wheel today!', 'warning');
                }
            }
        }
    };

    const handleEmailLookup = (e) => {
        if (e.key === 'Enter' && studentId.includes('@')) {
            const student = lookupStudent(studentId);
            if (student) {
                setStudentId(maskId(student.id));
                setStudentInfo(student);
                if (student.alreadySpunToday) showAlert('This student has already spun the wheel today!', 'warning');
            }
        }
    };

    // Derived: sum of all toggled point buttons (+ free spin bonus if active)
    const spinPoints = selectedPointsList.reduce((sum, p) => sum + p, 0);
    const totalSelectedPoints = freeSpinActive ? firstSpinPoints + spinPoints : spinPoints;

    const togglePoint = (pts) => {
        setSelectedPointsList(prev =>
            prev.includes(pts) ? prev.filter(p => p !== pts) : [...prev, pts]
        );
    };

    const handleFreeSpinClick = () => {
        if (freeSpinActive) return;
        setFreeSpinActive(true);
        setFirstSpinPoints(2);
        setSelectedPointsList([]);
        showAlert('FREE SPIN! Student gets 2 points + another spin. Select the second spin result(s) now.', 'info');
    };

    const handleCheckIn = () => {
        if (!studentInfo) { showAlert('Please enter a valid student ID', 'error'); return; }
        if (studentInfo.alreadySpunToday) { showAlert('Cannot check in — student has already spun today!', 'error'); return; }
        if (selectedPointsList.length === 0) { showAlert('Please select at least one points value from the wheel spin', 'error'); return; }

        let totalPoints = totalSelectedPoints;
        let message = '';
        if (freeSpinActive) {
            message = ` (2 from Free Spin + ${spinPoints} from wheel)`;
        } else if (selectedPointsList.length > 1) {
            message = ` (${selectedPointsList.join(' + ')} = ${totalPoints})`;
        }

        const newSwipe = {
            studentId: studentInfo.id, firstName: studentInfo.firstName,
            lastName: studentInfo.lastName, email: studentInfo.email,
            degreeLevel: studentInfo.degreeLevel, pointsEarned: totalPoints,
            pointsRedeemed: 0, prizeRedeemed: null, size: null,
            date: getTodaysDate(), timestamp: new Date().toISOString()
        };

        setSwipes([...swipes, newSwipe]);
        setRecentActivities([{
            timestamp: new Date().toISOString(), type: 'check-in',
            message: `${maskName(studentInfo.firstName, studentInfo.lastName)} earned ${totalPoints} pts${message}${studentInfo.isFirstTime ? ' — First Visit!' : ''}`
        }, ...recentActivities.slice(0, 49)]);

        showAlert(`✓ Check-in successful! ${maskName(studentInfo.firstName, studentInfo.lastName)} earned ${totalPoints} points${message}`, 'success');
        resetForm();

        setSyncStatus('syncing'); setSyncMessage('Saving to Google Sheets...');
        apiFetch('/api/swipes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(newSwipe) })
            .then(() => { setSyncStatus('success'); setSyncMessage('Saved to Google Sheets'); setTimeout(() => setSyncStatus('idle'), 2000); })
            .catch(() => { setSyncStatus('error'); setSyncMessage('Failed to save to Sheets — data saved locally'); });
    };

    const handlePrizeRedemption = () => {
        if (!studentInfo) { showAlert('Please enter a valid student ID', 'error'); return; }
        if (!selectedPrize) { showAlert('Please select a prize', 'error'); return; }

        const currentPoints = calculateCumulativePoints(studentInfo.id);
        if (currentPoints < selectedPrize.points) {
            showAlert(`Insufficient points! Student has ${currentPoints} pts but needs ${selectedPrize.points}`, 'error');
            return;
        }

        const prizeSize = prompt('Enter size (if applicable, e.g. S/M/L) or press OK:');
        const redemptionSwipe = {
            studentId: studentInfo.id, firstName: studentInfo.firstName,
            lastName: studentInfo.lastName, email: studentInfo.email,
            degreeLevel: studentInfo.degreeLevel, pointsEarned: 0,
            pointsRedeemed: selectedPrize.points, prizeRedeemed: selectedPrize.name,
            size: prizeSize || null, date: getTodaysDate(), timestamp: new Date().toISOString()
        };

        setSwipes([...swipes, redemptionSwipe]);
        setRecentActivities([{
            timestamp: new Date().toISOString(), type: 'redemption',
            message: `${maskName(studentInfo.firstName, studentInfo.lastName)} redeemed ${selectedPrize.name} (${selectedPrize.points} pts)`
        }, ...recentActivities.slice(0, 49)]);

        showAlert(`✓ Prize redeemed! ${selectedPrize.points} pts deducted. Remaining: ${currentPoints - selectedPrize.points}`, 'success');
        resetForm();

        setSyncStatus('syncing'); setSyncMessage('Saving redemption to Google Sheets...');
        apiFetch('/api/swipes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(redemptionSwipe) })
            .then(() => { setSyncStatus('success'); setSyncMessage('Saved to Google Sheets'); setTimeout(() => setSyncStatus('idle'), 2000); })
            .catch(() => { setSyncStatus('error'); setSyncMessage('Failed to save to Sheets — data saved locally'); });
    };

    const handleDeleteTodayEntry = (sid) => {
        if (!sid) { showAlert('Please enter a student ID first', 'error'); return; }
        const today = getTodaysDate();
        const todayEntries = swipes.filter(s => s.studentId === sid && s.date === today);
        if (todayEntries.length === 0) { showAlert('No entries found for this student today', 'warning'); return; }

        if (!window.confirm(`Delete today's entry for ${studentInfo?.firstName} ${studentInfo?.lastName}? This removes ${todayEntries.length} transaction(s).`)) return;

        setSwipes(swipes.filter(s => !(s.studentId === sid && s.date === today)));
        setRecentActivities([{
            timestamp: new Date().toISOString(), type: 'deletion',
            message: `Deleted today's entry for ${studentInfo?.firstName} ${studentInfo?.lastName}`
        }, ...recentActivities.slice(0, 49)]);

        showAlert("✓ Successfully deleted today's entry", 'success');

        if (sid.length === 9) {
            const s = lookupStudent(sid);
            if (s) setStudentInfo(s);
        }

        setSyncStatus('syncing'); setSyncMessage('Deleting from Google Sheets...');
        apiFetch(`/api/swipes/${encodeURIComponent(sid)}/${encodeURIComponent(today)}`, { method: 'DELETE' })
            .then(() => { setSyncStatus('success'); setSyncMessage('Deleted from Google Sheets'); setTimeout(() => setSyncStatus('idle'), 2000); })
            .catch(() => { setSyncStatus('error'); setSyncMessage('Failed to delete from Sheets — deleted locally only'); });
    };

    const resetForm = () => {
        setStudentId(''); setSelectedPointsList([]); setFreeSpinActive(false);
        setFirstSpinPoints(0); setStudentInfo(null); setSelectedPrize(null);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleImportRoster = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const workbook = XLSX.read(event.target.result, { type: 'binary' });
            const worksheet = workbook.Sheets['Students'];
            if (!worksheet) { showAlert('No "Students" sheet found in Excel file', 'error'); return; }
            const data = XLSX.utils.sheet_to_json(worksheet);
            const formattedStudents = data.map(row => ({
                id: String(row['Nonunique Alternate Id'] || '').trim(),
                firstName: row['First Name'] || row['Preferred FN'] || '',
                lastName: row['Last Name'] || '',
                email: row['Email'] || '',
                degreeLevel: row['Primary Degree Link: Degree Level'] || '',
                preferredYear: row['Pref Year'] || ''
            })).filter(s => s.id && s.id.length === 9);
            setStudents(formattedStudents);
            showAlert(`✓ Imported ${formattedStudents.length} students`, 'success');
        };
        reader.readAsBinaryString(file);
    };

    const handleImportSwipes = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showAlert('Importing data... Please wait.', 'info');
        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                setTimeout(() => {
                    try {
                        const workbook = XLSX.read(event.target.result, { type: 'binary' });
                        if (!workbook.SheetNames.includes('Swipes')) { showAlert('No "Swipes" sheet found', 'error'); return; }
                        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets['Swipes'], { range: 2, defval: null, raw: false });
                        if (jsonData.length === 0) { showAlert('No data found in Swipes sheet', 'warning'); return; }

                        const importedSwipes = [];
                        let skipped = 0;

                        for (const row of jsonData) {
                            let sid = '';
                            if (row['ID'] !== null && row['ID'] !== undefined && row['ID'] !== '') sid = String(row['ID']).trim();
                            if (!sid || sid.length !== 9 || sid === 'NaN' || sid === 'null') { skipped++; continue; }

                            let dateStr = getTodaysDate();
                            if (row['Date Visited']) {
                                const parsed = new Date(row['Date Visited']);
                                if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString().split('T')[0];
                            }

                            importedSwipes.push({
                                studentId: sid,
                                pointsEarned: parseFloat(row['Points Earned']) || 0,
                                pointsRedeemed: parseFloat(row['Points Redeemed']) || 0,
                                date: dateStr,
                                prizeRedeemed: row['Prize Redeemed'] || null,
                                size: row['Size'] || null,
                                firstName: row['First'] || '',
                                lastName: row['Last'] || '',
                                degreeLevel: row['Degree level'] || '',
                                email: row['Email'] || '',
                                timestamp: new Date().toISOString()
                            });
                        }

                        if (importedSwipes.length === 0) { showAlert('No valid swipe records found.', 'warning'); return; }
                        setSwipes(prev => [...prev, ...importedSwipes]);
                        showAlert(`✓ Imported ${importedSwipes.length} records (${skipped} skipped)`, 'success');

                        setSyncStatus('syncing'); setSyncMessage(`Uploading ${importedSwipes.length} swipes...`);
                        apiFetch('/api/swipes/bulk', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(importedSwipes) })
                            .then(() => { setSyncStatus('success'); setSyncMessage('Swipes uploaded'); setTimeout(() => setSyncStatus('idle'), 3000); })
                            .catch(() => { setSyncStatus('error'); setSyncMessage('Failed to upload swipes'); });
                    } catch (err) { showAlert(`Error parsing file: ${err.message}`, 'error'); }
                }, 100);
            };
            reader.onerror = () => showAlert('Error reading file.', 'error');
            reader.readAsBinaryString(file);
        } catch (err) { showAlert(`Error: ${err.message}`, 'error'); }
    };

    const handleExportData = () => {
        const exportData = swipes.map(swipe => ({
            'Student': maskName(swipe.firstName, swipe.lastName),
            'Points Earned': swipe.pointsEarned || '',
            'Points Redeemed': swipe.pointsRedeemed || '',
            'Date Visited': swipe.date,
            'Prize Redeemed': swipe.prizeRedeemed || '',
            'Size': swipe.size || '',
            'Degree Level': swipe.degreeLevel
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Swipes');
        XLSX.writeFile(wb, `Tartan_Tuesday_Export_${getTodaysDate()}.xlsx`);
        showAlert('✓ Data exported successfully', 'success');
    };

    const getStatistics = () => {
        const today = getTodaysDate();
        return {
            uniqueStudents: new Set(swipes.map(s => s.studentId)).size,
            totalVisits: swipes.filter(s => s.pointsEarned > 0).length,
            todayVisits: swipes.filter(s => s.date === today && s.pointsEarned > 0).length,
            totalPointsEarned: swipes.reduce((sum, s) => sum + (s.pointsEarned || 0), 0),
            totalPointsRedeemed: swipes.reduce((sum, s) => sum + (s.pointsRedeemed || 0), 0),
            prizesRedeemed: swipes.filter(s => s.prizeRedeemed).length
        };
    };

    const stats = getStatistics();

    const derivedStats = activeTab === 'statistics' ? (() => {
        const attn = getAttendanceByDate(swipes);
        const sv = {};
        swipes.forEach(s => { if (s.pointsEarned > 0) sv[s.studentId] = (sv[s.studentId] || 0) + 1; });
        const total = Object.keys(sv).length;
        const ret = Object.values(sv).filter(v => v > 1).length;
        let forecast = null;
        let ensembleResult = null;
        if (attn.length >= 4) {
            const run = getContiguousRun(attn);
            const counts = run.map(a => a.count);
            if (counts.length >= 4) {
                ensembleResult = ensembleForecast(counts);
                forecast = ensembleResult.forecast;
            }
        }
        const lastWeek = attn.length > 0 ? attn[attn.length - 1] : null;
        const prevWeek = attn.length > 1 ? attn[attn.length - 2] : null;
        const weekDelta = lastWeek && prevWeek ? ((lastWeek.count - prevWeek.count) / prevWeek.count * 100).toFixed(0) : null;

        const ps = getPrizeStats(swipes);
        const ledger = buildInventoryLedger(ps, inventory);
        const totalPrizesGiven = Object.values(ps.byCategory).reduce((s, v) => s + v, 0);
        const totalRemaining = ledger.reduce((s, l) => s + (l.remaining || 0), 0);

        const orderRecs = ledger.map(row => {
            if (row.initialStock === null || row.initialStock === 0) return null;
            const usageRate = row.redeemed / Math.max(attn.length, 1);
            const weeksLeft = usageRate > 0 ? Math.round(row.remaining / usageRate) : 999;
            const usagePct = Math.round(row.redeemed / row.initialStock * 100);
            return { ...row, usageRate: usageRate.toFixed(1), weeksLeft, usagePct };
        }).filter(Boolean).sort((a, b) => a.weeksLeft - b.weeksLeft);

        const slowMovers = orderRecs.filter(r => r.usagePct < 15 && r.remaining > 10);
        const fastMovers = orderRecs.filter(r => r.usagePct > 60 || r.weeksLeft < 6);

        return {
            redemptionRate: stats.totalVisits > 0 ? (stats.prizesRedeemed / stats.totalVisits * 100).toFixed(1) : '0',
            avgPointsHeld: total > 0 ? ((stats.totalPointsEarned - stats.totalPointsRedeemed) / total).toFixed(1) : '0',
            returnRate: total > 0 ? (ret / total * 100).toFixed(0) : '0',
            forecast, ensembleResult, attendance: attn,
            lastWeek, prevWeek, weekDelta,
            prizeStats: ps, ledger, totalPrizesGiven, totalRemaining,
            orderRecs, slowMovers, fastMovers,
            insights: generateInsights(swipes, stats, attn, inventory)
        };
    })() : null;

    return (
        <div>
            {/* ── LOADING OVERLAY ── */}
            {isInitialLoading && (
                <div className="loading-overlay">
                    <div className="sync-spinner" style={{width: '40px', height: '40px', borderWidth: '3px', borderColor: 'rgba(155,27,48,0.3)', borderTopColor: '#9B1B30'}}></div>
                    <h2>Loading from Google Sheets...</h2>
                    <p>This may take a few seconds</p>
                </div>
            )}

            {/* ── SYNC TOAST ── */}
            {syncStatus !== 'idle' && (
                <div className={`sync-indicator ${syncStatus}`}>
                    {(syncStatus === 'syncing' || syncStatus === 'loading') && <div className="sync-spinner"></div>}
                    {syncStatus === 'success' && '✓ '}
                    {syncStatus === 'error' && '✗ '}
                    {syncMessage}
                </div>
            )}

            {/* ── TOPBAR ── */}
            <div className="topbar">
                <div className="topbar-brand">
                    <img src="/scotty-shield.png" className="topbar-logo" alt="CMU Scotty" />
                    <div>
                        <div className="topbar-title">Tartan Tuesday</div>
                        <div className="topbar-subtitle">Student Engagement Manager</div>
                    </div>
                </div>
                <div className="topbar-right">
                    <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '0.78em', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700}}>Today's Check-ins</div>
                        <div style={{fontSize: '1.5em', fontWeight: 900, color: '#9B1B30', lineHeight: 1}}>{stats.todayVisits}</div>
                    </div>
                    <a href="/charts.html" style={{padding: '8px 16px', borderRadius: '6px', fontSize: '0.82em', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', textDecoration: 'none', color: '#555', border: '2px solid #e8e8e8', background: '#fff', transition: 'all 0.2s'}}>
                    Charts
                </a>
                    <button onClick={() => { fetch('/api/logout').then(() => window.location.reload()); }}
                        style={{padding: '8px 16px', borderRadius: '6px', fontSize: '0.82em', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9B1B30', border: '2px solid #f0d0d6', background: '#fff', cursor: 'pointer', transition: 'all 0.2s'}}>
                        Logout
                    </button>
                </div>
            </div>

            {/* ── HERO ── */}
            <div className="hero">
                <div className="hero-inner">
                    <h1>Tartan Tuesday</h1>
                    <p>Carnegie Mellon University · Student Engagement</p>
                    <div className="hero-stats">
                        <div className="hero-stat-box">
                            <div className="stat-num">{stats.todayVisits}</div>
                            <div className="stat-lbl">Checked in today</div>
                            <div className="stat-ctx">{students.length} in roster</div>
                        </div>
                        <div className="hero-stat-box">
                            <div className="stat-num">{stats.uniqueStudents}</div>
                            <div className="stat-lbl">Students this year</div>
                            <div className="stat-ctx">{stats.totalVisits > 0 && stats.uniqueStudents > 0 ? (stats.totalVisits / stats.uniqueStudents).toFixed(1) : '0'} avg visits each</div>
                        </div>
                        <div className="hero-stat-box">
                            <div className="stat-num">{stats.totalPointsEarned - stats.totalPointsRedeemed}</div>
                            <div className="stat-lbl">Points in circulation</div>
                            <div className="stat-ctx">{stats.totalPointsRedeemed} redeemed so far</div>
                        </div>
                        <div className="hero-stat-box">
                            <div className="stat-num">{inventory.reduce((s, i) => s + (i.quantity || 0), 0)}</div>
                            <div className="stat-lbl">Prizes in stock</div>
                            <div className="stat-ctx">{stats.prizesRedeemed} given out</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="page-body">

                {alert && (
                    <div className={`alert alert-${alert.type}`}>
                        {alert.message}
                    </div>
                )}

                {/* ── TABS ── */}
                <div className="tab-buttons">
                    {[
                        { id: 'check-in', label: 'Check-In' },
                        { id: 'redeem', label: 'Redeem Prize' },
                        { id: 'statistics', label: 'Statistics' },
                        { id: 'data', label: 'Data Management' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── CHECK-IN ── */}
                {activeTab === 'check-in' && (
                    <div className="main-content">
                        <div className="card">
                            <h2>Student Check-In</h2>

                            <div className="input-group">
                                <label>Student ID or Email</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={studentId}
                                    onChange={handleStudentIdChange}
                                    onKeyDown={handleEmailLookup}
                                    placeholder="Swipe card, type ID, or enter email..."
                                    autoFocus
                                />
                                {studentId.includes('@') && !studentInfo && (
                                    <small style={{color: '#888', marginTop: '6px', display: 'block'}}>Press Enter to look up by email</small>
                                )}
                            </div>

                            {studentInfo && (
                                <div className="student-info">
                                    <h3>Student Information</h3>
                                    {studentInfo.alreadySpunToday && (
                                        <div className="already-spun-warning">
                                            This student has already spun the wheel today.
                                        </div>
                                    )}
                                    <div className="student-info-grid">
                                        <span className="student-info-label">Student</span>
                                        <span className="student-info-value">{maskName(studentInfo.firstName, studentInfo.lastName)} ({maskId(studentInfo.id)})</span>

                                        <span className="student-info-label">Degree</span>
                                        <span className="student-info-value">{studentInfo.degreeLevel}</span>

                                        <span className="student-info-label">Points</span>
                                        <span className="student-info-value" style={{fontSize: '1.8em', fontWeight: 900, color: '#9B1B30', lineHeight: 1}}>
                                            {studentInfo.cumulativePoints}
                                        </span>

                                        <span className="student-info-label">Status</span>
                                        <span className="student-info-value">
                                            {studentInfo.alreadySpunToday
                                                ? '✓ Already checked in today'
                                                : studentInfo.isFirstTime ? 'First Visit!' : `Visit #${studentInfo.visitCount + 1}`}
                                        </span>
                                    </div>
                                    {studentInfo.alreadySpunToday && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleDeleteTodayEntry(studentInfo.id)}
                                            style={{marginTop: '12px'}}
                                        >
                                            Delete Today's Entry
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="input-group">
                                <label>Points from Wheel Spin <span style={{color:'#aaa', fontWeight:500, textTransform:'none', letterSpacing:0}}>(select all that apply)</span></label>
                                {freeSpinActive && (
                                    <div className="free-spin-active-banner">
                                        FREE SPIN ACTIVE — 2 pts locked in. Select second spin result(s):
                                    </div>
                                )}
                                <div className="points-buttons">
                                    {POINT_OPTIONS.map(pts => (
                                        <button
                                            key={pts}
                                            className={`point-btn ${selectedPointsList.includes(pts) ? 'selected' : ''}`}
                                            onClick={() => togglePoint(pts)}
                                        >
                                            {pts} pt{pts !== 1 ? 's' : ''}
                                        </button>
                                    ))}
                                    <button
                                        className={`point-btn free-spin ${freeSpinActive ? 'selected' : ''}`}
                                        onClick={handleFreeSpinClick}
                                        disabled={freeSpinActive}
                                        style={freeSpinActive ? {opacity: 0.6, cursor: 'not-allowed'} : {}}
                                    >
                                        {freeSpinActive ? '+2 Locked' : 'Free Spin'}
                                    </button>
                                </div>

                                {/* Live total display */}
                                {(selectedPointsList.length > 0 || freeSpinActive) && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                                        padding: '12px 16px', background: '#fff5f5', borderRadius: '8px',
                                        border: '2px solid #9B1B30', marginTop: '10px'
                                    }}>
                                        <span style={{color:'#888', fontSize:'0.78em', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px'}}>Total:</span>
                                        {freeSpinActive && (
                                            <span style={{background:'#f59e0b', color:'#fff', padding:'3px 10px', borderRadius:'20px', fontSize:'0.82em', fontWeight:800}}>
                                                +2 Free
                                            </span>
                                        )}
                                        {freeSpinActive && selectedPointsList.length > 0 && (
                                            <span style={{color:'#aaa', fontSize:'0.9em'}}>+</span>
                                        )}
                                        {selectedPointsList.sort((a,b) => a-b).map((p, i) => (
                                            <span key={p} style={{background:'#9B1B30', color:'#fff', padding:'3px 10px', borderRadius:'20px', fontSize:'0.82em', fontWeight:700}}>
                                                {p}
                                            </span>
                                        ))}
                                        <span style={{marginLeft:'auto', fontSize:'1.4em', fontWeight:900, color:'#9B1B30'}}>
                                            = {totalSelectedPoints} pts
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Requirements checklist — shows what's still needed */}
                            <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px', padding:'12px 16px', background:'#fafafa', borderRadius:'8px', border:'1px solid #f0f0f0'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.85em', fontWeight:600, color: studentInfo && !studentInfo.alreadySpunToday ? '#16a34a' : '#9B1B30'}}>
                                    <span>{studentInfo && !studentInfo.alreadySpunToday ? '✓' : '○'}</span>
                                    <span>
                                        {studentInfo
                                            ? studentInfo.alreadySpunToday
                                                ? `${maskName(studentInfo.firstName, studentInfo.lastName)} already checked in today`
                                                : `Student: ${maskName(studentInfo.firstName, studentInfo.lastName)}`
                                            : 'Enter a student ID or email'}
                                    </span>
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'0.85em', fontWeight:600, color: selectedPointsList.length > 0 ? '#16a34a' : '#9B1B30'}}>
                                    <span>{selectedPointsList.length > 0 ? '✓' : '○'}</span>
                                    <span>{selectedPointsList.length > 0 ? `Points selected: ${totalSelectedPoints} pts` : 'Select at least one point value above'}</span>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleCheckIn}
                                disabled={!studentInfo || selectedPointsList.length === 0 || studentInfo?.alreadySpunToday}
                            >
                                {studentInfo?.alreadySpunToday
                                    ? 'Already Checked In Today'
                                    : selectedPointsList.length > 0
                                        ? `Complete Check-In — ${totalSelectedPoints} pts`
                                        : 'Complete Check-In'}
                            </button>
                            <button className="btn btn-secondary" onClick={resetForm}>Clear Form</button>
                        </div>

                        <div className="card">
                            <h2>Recent Activity</h2>
                            <div className="recent-activities">
                                {recentActivities.length === 0 ? (
                                    <p style={{color: '#bbb', textAlign: 'center', padding: '30px 0', fontSize: '0.9em'}}>No recent activity yet</p>
                                ) : (
                                    recentActivities.map((act, i) => (
                                        <div key={i} className="activity-item">
                                            <div className="activity-time">{new Date(act.timestamp).toLocaleTimeString()}</div>
                                            <div className="activity-details">{act.message}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REDEEM ── */}
                {activeTab === 'redeem' && (
                    <div className="main-content">
                        <div className="card">
                            <h2>Prize Redemption</h2>
                            <div className="input-group">
                                <label>Student ID or Email</label>
                                <input
                                    type="text"
                                    value={studentId}
                                    onChange={handleStudentIdChange}
                                    onKeyDown={handleEmailLookup}
                                    placeholder="Swipe card, type ID, or enter email..."
                                />
                                {studentId.includes('@') && !studentInfo && (
                                    <small style={{color: '#888', marginTop: '6px', display: 'block'}}>Press Enter to look up by email</small>
                                )}
                            </div>

                            {studentInfo && (
                                <div className="student-info">
                                    <h3>Student Information</h3>
                                    <div className="student-info-grid">
                                        <span className="student-info-label">Student</span>
                                        <span className="student-info-value">{maskName(studentInfo.firstName, studentInfo.lastName)} ({maskId(studentInfo.id)})</span>
                                        <span className="student-info-label">Balance</span>
                                        <span className="student-info-value" style={{fontSize: '1.8em', fontWeight: 900, color: '#9B1B30', lineHeight: 1}}>
                                            {studentInfo.cumulativePoints} pts
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="input-group">
                                <label>Select Prize</label>
                                <div className="prize-grid">
                                    {PRIZES.map((prize, i) => (
                                        <div
                                            key={i}
                                            className={`prize-item ${selectedPrize === prize ? 'selected' : ''}`}
                                            onClick={() => setSelectedPrize(prize)}
                                        >
                                            <div className="prize-points">{prize.points}</div>
                                            <div style={{fontSize: '0.65em', color: selectedPrize === prize ? 'rgba(255,255,255,0.7)' : '#9B1B30', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>{prize.tier}</div>
                                            <div className="prize-name">{prize.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handlePrizeRedemption}
                                disabled={!studentInfo || !selectedPrize}
                            >
                                Redeem Prize
                            </button>
                            <button className="btn btn-secondary" onClick={resetForm}>Clear Form</button>
                        </div>

                        <div className="card">
                            <h2>Prize Catalog</h2>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                {PRIZES.map((prize, i) => (
                                    <div key={i} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0', borderLeft: '4px solid #9B1B30'}}>
                                        <div style={{fontSize: '1.8em', fontWeight: 900, color: '#9B1B30', minWidth: '50px', textAlign: 'center', lineHeight: 1}}>{prize.points}</div>
                                        <div>
                                            <div style={{fontWeight: 700, color: '#1a1a1a', fontSize: '0.95em'}}>{prize.name}</div>
                                            <div style={{fontSize: '0.75em', color: '#9B1B30', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px'}}>{prize.tier} · {prize.points} points</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STATISTICS ── */}
                {activeTab === 'statistics' && derivedStats && (
                    <div className="dash">

                        {/* ─── SECTION 1: At a Glance ─── */}
                        <section className="dash-section">
                            <div className="dash-hero-row">
                                <div className="dash-hero-card">
                                    <span className="dash-hero-num">{stats.uniqueStudents}</span>
                                    <span className="dash-hero-label">students served</span>
                                    <span className="dash-hero-sub">{stats.totalVisits} total check-ins across {derivedStats.attendance.length} Tuesdays</span>
                                </div>
                                <div className="dash-hero-card">
                                    <span className="dash-hero-num">{derivedStats.lastWeek ? derivedStats.lastWeek.count : '--'}</span>
                                    <span className="dash-hero-label">showed up last week</span>
                                    {derivedStats.weekDelta && (
                                        <span className={`dash-hero-delta ${Number(derivedStats.weekDelta) >= 0 ? 'up' : 'down'}`}>
                                            {Number(derivedStats.weekDelta) >= 0 ? '+' : ''}{derivedStats.weekDelta}% vs prior week
                                        </span>
                                    )}
                                </div>
                                <div className="dash-hero-card">
                                    {derivedStats.ensembleResult ? (
                                        <React.Fragment>
                                            <span className="dash-hero-num">~{derivedStats.ensembleResult.forecast}</span>
                                            <span className="dash-hero-label">expected next Tuesday</span>
                                            <span className="dash-hero-sub">range {derivedStats.ensembleResult.low}&ndash;{derivedStats.ensembleResult.high}</span>
                                        </React.Fragment>
                                    ) : (
                                        <React.Fragment>
                                            <span className="dash-hero-num">--</span>
                                            <span className="dash-hero-label">forecast unavailable</span>
                                            <span className="dash-hero-sub">need 4+ weeks of data</span>
                                        </React.Fragment>
                                    )}
                                </div>
                                <div className="dash-hero-card accent">
                                    <span className="dash-hero-num">{derivedStats.returnRate}%</span>
                                    <span className="dash-hero-label">return rate</span>
                                    <span className="dash-hero-sub">{derivedStats.avgPointsHeld} avg points held per student</span>
                                </div>
                            </div>
                        </section>

                        {/* ─── SECTION 2: Attendance ─── */}
                        <section className="dash-section">
                            <h2 className="dash-heading">Attendance</h2>
                            <div className="dash-card">
                                <div style={{position: 'relative', height: '320px'}}>
                                    <canvas ref={attendanceChartRef}></canvas>
                                </div>
                                {derivedStats.ensembleResult && derivedStats.ensembleResult.models.length > 0 && (
                                    <details className="model-details">
                                        <summary>Forecast model breakdown</summary>
                                        <div className="ensemble-breakdown">
                                            {derivedStats.ensembleResult.models.map((m, i) => (
                                                <div key={i} className="ensemble-model-row">
                                                    <span className="model-name">{m.name}</span>
                                                    <span className="model-pred">{m.prediction}</span>
                                                    <span className="model-rmse">RMSE {m.rmse}</span>
                                                    <span className="model-weight">{m.weight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        </section>

                        {/* ─── SECTION 3: Inventory + Stock ─── */}
                        <section className="dash-section">
                            <h2 className="dash-heading">Inventory &amp; Prizes</h2>
                            <div className="dash-hero-row compact">
                                <div className="dash-metric-pill">{derivedStats.totalPrizesGiven} <small>given out</small></div>
                                <div className="dash-metric-pill">{derivedStats.totalRemaining} <small>in stock</small></div>
                                <div className="dash-metric-pill">{derivedStats.redemptionRate}% <small>redemption rate</small></div>
                            </div>

                            {/* Inventory Ledger */}
                            {derivedStats.ledger.length > 0 && (
                                <div className="dash-card">
                                    <div className="ledger-table-wrap">
                                        <table className="ledger-table">
                                            <thead>
                                                <tr>
                                                    <th>Prize</th>
                                                    <th>Given</th>
                                                    <th>Left</th>
                                                    <th>Stock Used</th>
                                                    <th>Sizes</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {derivedStats.ledger.map((row, i) => {
                                                    const pct = row.initialStock ? Math.round(row.redeemed / row.initialStock * 100) : null;
                                                    const status = row.remaining === null ? 'no-inv' : row.remaining === 0 ? 'out' : row.remaining <= 3 ? 'low' : row.remaining <= 10 ? 'medium' : 'good';
                                                    const statusLabel = row.remaining === null ? '--' : row.remaining === 0 ? 'Out' : row.remaining <= 3 ? 'Low' : row.remaining <= 10 ? 'Moderate' : 'OK';
                                                    const sizeStr = Object.entries(row.sizeBreakdown)
                                                        .filter(([k]) => k !== 'One Size' && k !== 'Unknown')
                                                        .sort((a, b) => b[1] - a[1])
                                                        .map(([sz, ct]) => `${sz} (${ct})`)
                                                        .join(', ');
                                                    return (
                                                        <tr key={i} className={status === 'out' || status === 'low' ? 'ledger-row-alert' : ''}>
                                                            <td className="ledger-product">{row.product}</td>
                                                            <td className="ledger-num">{row.redeemed}</td>
                                                            <td className="ledger-num">{row.remaining !== null ? row.remaining : '--'}</td>
                                                            <td className="ledger-bar-cell">
                                                                {pct !== null ? (
                                                                    <div className="ledger-bar-container">
                                                                        <div className={`ledger-bar ${status}`} style={{width: Math.min(pct, 100) + '%'}}></div>
                                                                        <span className="ledger-bar-label">{pct}%</span>
                                                                    </div>
                                                                ) : '--'}
                                                            </td>
                                                            <td className="ledger-sizes">{sizeStr || '--'}</td>
                                                            <td><span className={`ledger-status ${status}`}>{statusLabel}</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Ordering Recommendations */}
                            {(derivedStats.slowMovers.length > 0 || derivedStats.fastMovers.length > 0) && (
                                <div className="dash-card">
                                    <h3 className="dash-subheading">Ordering Recommendations</h3>
                                    <div className="order-recs">
                                        {derivedStats.fastMovers.map((r, i) => (
                                            <div key={'f' + i} className="order-rec hot">
                                                <div className="order-rec-icon">!</div>
                                                <div className="order-rec-body">
                                                    <strong>{r.product}</strong>
                                                    <span>{r.usagePct}% used &middot; {r.remaining} left &middot; ~{r.weeksLeft} weeks until empty at {r.usageRate}/wk</span>
                                                </div>
                                                <span className="order-rec-tag reorder">Reorder soon</span>
                                            </div>
                                        ))}
                                        {derivedStats.slowMovers.map((r, i) => (
                                            <div key={'s' + i} className="order-rec slow">
                                                <div className="order-rec-icon slow-icon">~</div>
                                                <div className="order-rec-body">
                                                    <strong>{r.product}</strong>
                                                    <span>{r.usagePct}% used &middot; {r.remaining} left &middot; ~{r.usageRate}/wk consumption</span>
                                                </div>
                                                <span className="order-rec-tag overstocked">Overstocked</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ─── SECTION 4: What's Popular ─── */}
                        <section className="dash-section">
                            <h2 className="dash-heading">What's Popular</h2>
                            <div className="dash-card">
                                <div style={{position: 'relative', height: Math.max(220, Object.keys(derivedStats.prizeStats.byProduct).length * 55) + 'px'}}>
                                    <canvas ref={prizeChartRef}></canvas>
                                </div>
                            </div>
                            <div className="dash-two-col">
                                <div className="dash-card">
                                    <h3 className="dash-subheading">Category Mix</h3>
                                    <div style={{position: 'relative', height: '240px'}}>
                                        <canvas ref={prizeCategoryChartRef}></canvas>
                                    </div>
                                </div>
                                {Object.keys(derivedStats.prizeStats.bySize).length > 0 && (
                                    <div className="dash-card">
                                        <h3 className="dash-subheading">Size Demand</h3>
                                        <div style={{position: 'relative', height: '240px'}}>
                                            <canvas ref={sizeDistChartRef}></canvas>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ─── SECTION 5: Points & Engagement ─── */}
                        <section className="dash-section">
                            <h2 className="dash-heading">Points &amp; Engagement</h2>
                            <div className="dash-card">
                                <div style={{position: 'relative', height: '280px'}}>
                                    <canvas ref={pointsChartRef}></canvas>
                                </div>
                            </div>
                            <div className="dash-two-col">
                                <div className="dash-card">
                                    <h3 className="dash-subheading">Visit Frequency</h3>
                                    <div style={{position: 'relative', height: '250px'}}>
                                        <canvas ref={visitFreqChartRef}></canvas>
                                    </div>
                                </div>
                                <div className="dash-card">
                                    <h3 className="dash-subheading">Student Demographics</h3>
                                    <div style={{position: 'relative', height: '250px'}}>
                                        <canvas ref={degreeChartRef}></canvas>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ─── SECTION 6: Insights ─── */}
                        {derivedStats.insights.length > 0 && (
                            <section className="dash-section">
                                <h2 className="dash-heading">Insights</h2>
                                <div className="dash-card">
                                    <div className="insights-list">
                                        {derivedStats.insights.map((ins, i) => (
                                            <div key={i} className={`insight-item insight-${ins.type}`}>
                                                <span className="insight-icon">
                                                    {ins.type === 'positive' ? '▲' : ins.type === 'negative' ? '▼' : ins.type === 'warning' ? '!' : '--'}
                                                </span>
                                                <span>{ins.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* ── HISTORY ── */}

                {/* ── DATA MANAGEMENT ── */}
                {activeTab === 'data' && (
                    <div className="card full-width">
                        <h2>Data Management</h2>
                        <div className="data-management">
                            <div className="file-input-wrapper">
                                <input type="file" id="roster-import" accept=".xlsx,.xls" onChange={handleImportRoster} />
                                <label htmlFor="roster-import" className="file-input-label">
                                    Import Student Roster
                                    <small style={{fontWeight: 500, opacity: 0.7}}>Excel · Students sheet</small>
                                </label>
                            </div>
                            <div className="file-input-wrapper">
                                <input type="file" id="swipes-import" accept=".xlsx,.xls" onChange={handleImportSwipes} />
                                <label htmlFor="swipes-import" className="file-input-label">
                                    Import Existing Swipes
                                    <small style={{fontWeight: 500, opacity: 0.7}}>Excel · Swipes sheet · Appends</small>
                                </label>
                            </div>
                            <button className="btn btn-primary" onClick={handleExportData} style={{gridColumn: '1 / -1'}}>
                                Export All Data to Excel
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{gridColumn: '1 / -1'}}
                                onClick={async () => {
                                    setSyncStatus('loading'); setSyncMessage('Refreshing from Google Sheets...');
                                    try {
                                        const data = await apiFetch('/api/data');
                                        if (data && !data.error) {
                                            if (data.students?.length > 0) setStudents(data.students);
                                            if (data.swipes) setSwipes(data.swipes);
                                            showAlert(`Refreshed: ${data.students?.length || 0} students, ${data.swipes?.length || 0} swipes`, 'success');
                                            setSyncStatus('success'); setSyncMessage('Synced');
                                            setTimeout(() => setSyncStatus('idle'), 2000);
                                        }
                                    } catch (err) {
                                        showAlert('Failed to refresh: ' + err.message, 'error');
                                        setSyncStatus('error'); setSyncMessage('Refresh failed');
                                    }
                                }}
                            >
                                Refresh from Google Sheets
                            </button>
                        </div>

                        <div className="info-box">
                            <h3>Current Data Status</h3>
                            <p>Students in Roster: <strong>{students.length}</strong></p>
                            <p>Total Swipes / Transactions: <strong>{swipes.length}</strong></p>
                            <p>Recent Activities Logged: <strong>{recentActivities.length}</strong></p>
                            <p>Google Sheets Sync: <strong style={{color: '#16a34a'}}>● Enabled</strong></p>
                        </div>

                    <div className="info-box" style={{borderLeftColor: '#16a34a', background: '#f0fdf4', marginTop: '12px'}}>
                        <h3 style={{color: '#166534'}}>Data Comparison Sheet — Auto-Sync</h3>
                        <p style={{marginBottom: '10px', lineHeight: 1.7}}>
                            Every time a student checks in, the <strong>Data Comparison</strong> tab in Google Sheets
                            is updated automatically. Each unique event date gets its own <strong>Week N</strong> row
                            in the current semester's column, with the count of unique students who attended that day.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{marginTop: '4px', background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.3)'}}
                            onClick={async () => {
                                setSyncStatus('syncing');
                                setSyncMessage('Rebuilding Data Comparison sheet...');
                                try {
                                    const res = await fetch('/api/comparison/sync', { method: 'POST' });
                                    const data = await res.json();
                                    if (data.error) throw new Error(data.error);
                                    showAlert(`Comparison sheet synced! ${data.processed} date${data.processed !== 1 ? 's' : ''} processed.`, 'success');
                                    setSyncStatus('success');
                                    setSyncMessage('Comparison sheet rebuilt');
                                    setTimeout(() => setSyncStatus('idle'), 3000);
                                } catch (err) {
                                    showAlert('Sync failed: ' + err.message, 'error');
                                    setSyncStatus('error');
                                    setSyncMessage('Comparison sync failed');
                                }
                            }}
                        >
                            Rebuild Comparison Sheet from All Swipes
                        </button>
                        <p style={{marginTop: '10px', fontSize: '0.82em', color: '#555', lineHeight: 1.6}}>
                            Use this once to backfill all historical dates, or if anything gets out of sync.
                            Future check-ins update the sheet automatically — no manual action needed.
                        </p>
                    </div>

                    <div className="info-box" style={{borderLeftColor: '#f59e0b', background: '#fffbeb', marginTop: '12px'}}>
                        <h3 style={{color: '#92400e'}}>Important Notes</h3>
                        <ul style={{marginLeft: '18px', color: '#555', lineHeight: 2, fontSize: '0.9em'}}>
                            <li>Data syncs to Google Sheets in real-time when connected</li>
                            <li>localStorage acts as a local cache for instant responsiveness</li>
                            <li><strong>Import Existing Swipes</strong> adds to current data — it does not replace</li>
                            <li>If Sheets sync fails, data is preserved locally</li>
                            <li>Use "Refresh from Google Sheets" to manually re-sync</li>
                        </ul>
                    </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <div className="footer">
                © <span>Ananya Shrimali</span> · Tartan Tuesday · Carnegie Mellon University
            </div>
        </div>
    );
}

function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                onLogin();
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <img src="/scotty-shield.png" className="login-logo" alt="CMU Scotty" />
                <h1 className="login-title">Tartan Tuesday</h1>
                <p className="login-subtitle">Admin Login</p>
                <form onSubmit={handleSubmit} className="login-form">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="Email" required autoFocus className="login-input" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Password" required className="login-input" />
                    {error && <div className="login-error">{error}</div>}
                    <button type="submit" disabled={loading} className="login-btn">
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function AppRoot() {
    const [authState, setAuthState] = useState('checking');

    useEffect(() => {
        fetch('/api/me')
            .then(r => r.json())
            .then(data => setAuthState(data.authenticated ? 'authenticated' : 'login'))
            .catch(() => setAuthState('login'));
    }, []);

    if (authState === 'checking') {
        return (
            <div className="login-page">
                <div className="sync-spinner" style={{width: '40px', height: '40px', borderWidth: '3px', borderColor: 'rgba(155,27,48,0.3)', borderTopColor: '#9B1B30'}}></div>
            </div>
        );
    }

    if (authState === 'login') {
        return <LoginScreen onLogin={() => setAuthState('authenticated')} />;
    }

    return <TartanTuesdayApp />;
}

ReactDOM.render(<AppRoot />, document.getElementById('root'));
