import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    LayoutDashboard, FileText, Search, GitBranch, FileDown,
    X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
    AlertCircle, CheckCircle, AlertTriangle, Info, Loader2,
    Download, Eye, Zap, ArrowLeft, BarChart2, Layers, RefreshCw,
    Copy, Trash2, Filter, Plus, Terminal, Send, MessageSquare,
    ChevronsDown, Database, Cpu
} from 'lucide-react';
// ── Inline SVG Charts with effects ────────────────────────────────────────────
function SvgBar({ data }) {
    const [hovered, setHovered] = useState(-1);
    const max = Math.max(...data.map(d => d.count), 1);
    const W = 340, H = 180, pad = 32, barW = 40, gap = 14;
    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H + 32}`} style={{ overflow: 'visible' }}>
            <defs>
                {data.map((d, i) => (
                    <linearGradient key={`grad-${i}`} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d.fill} stopOpacity="1" />
                        <stop offset="100%" stopColor={d.fill} stopOpacity="0.4" />
                    </linearGradient>
                ))}
                <filter id="barGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {data.map((d, i) => {
                const x = pad + i * (barW + gap);
                const bh = Math.max(6, Math.round((d.count / max) * (H - 24)));
                const y = H - bh;
                const isH = hovered === i;
                return (<g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(-1)} style={{ cursor: 'pointer' }}>
                    {/* Shadow */}
                    <rect x={x + 2} y={y + 2} width={barW} height={bh} rx={6} fill="#000" opacity={0.3} />
                    {/* Main bar */}
                    <rect x={x} y={y} width={barW} height={bh} rx={6}
                        fill={`url(#barGrad${i})`}
                        filter={isH ? 'url(#barGlow)' : ''}
                        style={{ transition: 'all 0.3s ease', transform: isH ? 'scaleY(1.05)' : 'scaleY(1)', transformOrigin: `${x + barW / 2}px ${H}px` }} />
                    {/* Value */}
                    <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize={isH ? 13 : 11}
                        fill={d.fill} fontFamily="JetBrains Mono,monospace" fontWeight={isH ? 'bold' : 'normal'}
                        style={{ transition: 'all 0.2s ease' }}>{d.count.toLocaleString()}</text>
                    {/* Label */}
                    <text x={x + barW / 2} y={H + 18} textAnchor="middle" fontSize={10}
                        fill={isH ? '#ffe5e5' : '#a37c7c'} fontFamily="IBM Plex Sans,sans-serif"
                        style={{ transition: 'fill 0.2s' }}>{d.name}</text>
                </g>);
            })}
        </svg>
    );
}
function SvgPie({ data }) {
    const [hovered, setHovered] = useState(-1);
    if (!data.length) return <p style={{ color: '#a37c7c', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>No data</p>;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = 100, cy = 85, r = 68;
    let angle = -Math.PI / 2;
    const slices = data.map((d, idx) => {
        const sweep = (d.value / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        angle += sweep;
        const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const midAngle = angle - sweep / 2;
        return { path: `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2}Z`, midAngle, ...d, idx };
    });
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width={210} height={170} viewBox="0 0 200 170">
                <defs>
                    <filter id="pieGlow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                {slices.map((s) => {
                    const isH = hovered === s.idx;
                    const offset = isH ? 6 : 0;
                    const dx = offset * Math.cos(s.midAngle);
                    const dy = offset * Math.sin(s.midAngle);
                    return <path key={s.idx} d={s.path} fill={s.color}
                        opacity={hovered === -1 ? 0.9 : isH ? 1 : 0.5}
                        filter={isH ? 'url(#pieGlow)' : ''}
                        transform={`translate(${dx},${dy})`}
                        onMouseEnter={() => setHovered(s.idx)} onMouseLeave={() => setHovered(-1)}
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />;
                })}
                {/* Center hole for donut */}
                <circle cx={cx} cy={cy} r={30} fill="#0f0202" />
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fill="#a37c7c" fontFamily="IBM Plex Sans">Total</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize={14} fill="#ffe5e5" fontFamily="JetBrains Mono" fontWeight="bold">{total.toLocaleString()}</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.map((d, i) => (
                    <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(-1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: hovered === i ? '#ffe5e5' : '#a37c7c', fontFamily: 'IBM Plex Sans,sans-serif', cursor: 'pointer', transition: 'color 0.2s' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block', boxShadow: hovered === i ? `0 0 8px ${d.color}` : 'none', transition: 'box-shadow 0.2s' }} />
                        {d.name}: <strong style={{ color: '#ffe5e5' }}>{d.value.toLocaleString()}</strong>
                        <span style={{ fontSize: 10, color: '#662222' }}>({Math.round(d.value / total * 100)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Base URL ─────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:5000';

// ── Severity normalizer ───────────────────────────────────────────────────────
const normSev = (s = '') => {
    const m = { blocker: 'Critical', critical: 'Critical', major: 'High', high: 'High', normal: 'Medium', medium: 'Medium', minor: 'Low', low: 'Low', trivial: 'Low' };
    return m[s.toLowerCase()] || s || 'Unknown';
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_DEFECTS = Array.from({ length: 15 }, (_, i) => ({
    defect_id: `DEF-${String(i + 1).padStart(5, '0')}`,
    title: ['Login button unresponsive on mobile', 'Dashboard crashes on load', 'Slow query performance', 'UI misaligned on Firefox', 'Auth token expiry issue', 'Search returns wrong results', 'File upload fails silently', 'Dark mode colors broken', 'Export CSV missing columns', 'Notification not sending', 'Password reset link expired', 'Profile photo not saving', 'Session timeout too short', 'Map rendering glitch', 'API rate limit not enforced'][i],
    severity: ['blocker', 'critical', 'major', 'normal', 'minor', 'critical', 'major', 'minor', 'normal', 'major', 'critical', 'normal', 'minor', 'major', 'blocker'][i],
    cluster_id: i < 5 ? 0 : i < 9 ? 1 : i < 12 ? 2 : 3,
    missing_fields: i % 3 === 0 ? ['steps', 'environment'] : i % 3 === 1 ? ['expected', 'actual'] : [],
    improved_summary: 'AI-generated summary of this defect report.',
    raw_description: 'Detailed description of the issue goes here. Users report this occurring consistently.',
    confidence: parseFloat((0.5 + Math.random() * 0.49).toFixed(2)),
    decision: i < 4 ? 'duplicate' : i < 8 ? 'possible_duplicate' : 'new_defect',
    date: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    steps: '1. Open app\n2. Navigate to feature\n3. Observe issue',
    expected: 'Feature should work correctly',
    actual: 'Feature fails with error',
    environment: i % 2 === 0 ? 'Chrome 121, Windows 11' : '',
    logs: i % 4 === 0 ? 'Error: Cannot read property of undefined at line 42' : '',
}));

const MOCK_CLUSTERS = {
    total_records: 9996, total_clusters: 4, noise_points: 4,
    cluster_distribution: { 'cluster_0': 5, 'cluster_1': 4, 'cluster_2': 3, 'cluster_3': 3 },
    severity_distribution: { normal: 6937, major: 1372, critical: 757, minor: 465, blocker: 262, trivial: 203 }
};

const MOCK_STATS = {
    total_defects: 9996,
    severity_distribution: { normal: 6937, major: 1372, critical: 757, minor: 465, blocker: 262, trivial: 203 },
    cluster_distribution: { '0': 9992, '-1': 4 },
    total_clusters: 1
};

const MOCK_RESULT = {
    decision: 'duplicate', confidence: 0.87,
    top_matches: [
        { defect_id: 'DEF-00001', title: 'Login button unresponsive on mobile', similarity_score: 0.92, improved_summary: 'Touch events not firing on iOS Safari.', cluster_id: 0 },
        { defect_id: 'DEF-00002', title: 'Login fails on iPhone browser', similarity_score: 0.81, improved_summary: 'Mobile Safari authentication broken.', cluster_id: 0 },
        { defect_id: 'DEF-00003', title: 'Auth broken on Safari mobile', similarity_score: 0.74, improved_summary: 'Safari users cannot authenticate.', cluster_id: 0 },
        { defect_id: 'DEF-00007', title: 'Sign in page not working mobile', similarity_score: 0.61, improved_summary: 'Mobile sign-in completely broken.', cluster_id: 0 },
        { defect_id: 'DEF-00009', title: 'Mobile login error iOS 16', similarity_score: 0.54, improved_summary: 'iOS 16 specific login failures.', cluster_id: 0 },
    ],
    cluster_id: 0,
    improved_report: {
        title: 'Login button unresponsive on iOS Safari mobile browser',
        summary: 'The login button fails to respond to touch events on iOS Safari. Users are completely blocked from authenticating on mobile devices.',
        missing_fields: [{ field: 'steps' }, { field: 'environment' }, { field: 'logs' }],
        suggested_severity: 'Critical'
    },
    missing_fields: [{ field: 'steps' }, { field: 'environment' }, { field: 'logs' }]
};

const MOCK_ENHANCED = {
    improved_report: {
        title: '[ENHANCED] Login button unresponsive on iOS Safari mobile browser',
        summary: 'Touch events are not firing on the login button when accessed via iOS Safari 16+. Affects all mobile users on iPhone/iPad. Severity: Critical. Requires immediate hotfix.',
        missing_fields: [{ field: 'environment' }, { field: 'logs' }],
        suggested_severity: 'Critical'
    }
};

// ── API Layer ─────────────────────────────────────────────────────────────────
const API = {
    analyze: async (data) => { try { const r = await axios.post(`${BASE}/api/analyze`, data); return r.data; } catch { return MOCK_RESULT; } },
    enhance: async (data) => { try { const r = await axios.post(`${BASE}/api/enhance-report`, data); return r.data; } catch { return MOCK_ENHANCED; } },
    defects: async (params = {}) => { try { const r = await axios.get(`${BASE}/api/defects`, { params }); return r.data; } catch { return { defects: MOCK_DEFECTS, total: MOCK_DEFECTS.length, page: 1, per_page: 10, total_pages: 2 }; } },
    defect: async (id) => { try { const r = await axios.get(`${BASE}/api/defect/${id}`); return r.data; } catch { return MOCK_DEFECTS.find(d => d.defect_id === id) || MOCK_DEFECTS[0]; } },
    clusters: async () => { try { const r = await axios.get(`${BASE}/api/clusters`); return r.data; } catch { return MOCK_CLUSTERS; } },
    stats: async () => { try { const r = await axios.get(`${BASE}/api/stats`); return r.data; } catch { return MOCK_STATS; } },
    search: async (query, k = 10) => { try { const r = await axios.post(`${BASE}/api/search`, { query, k }); return r.data; } catch { return { results: MOCK_DEFECTS.slice(0, 5).map(d => ({ ...d, similarity_score: 0.7 })) }; } },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} style={{ animation: `toastIn 0.3s ease` }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-ui pointer-events-auto min-w-[260px] max-w-sm
            ${t.type === 'success' ? 'bg-[#1f4a2e] border border-[#3FB950]' : t.type === 'error' ? 'bg-[#4a1f1f] border border-[#F85149]' : 'bg-[#2a0505] border border-[#ff2a2a]'}`}>
                    {t.type === 'success' ? <CheckCircle size={16} className="text-[#3FB950] shrink-0" /> : t.type === 'error' ? <AlertCircle size={16} className="text-[#F85149] shrink-0" /> : <Info size={16} className="text-[#ff2a2a] shrink-0" />}
                    <span className="text-[#ffe5e5]">{t.message}</span>
                </div>
            ))}
        </div>
    );
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ text = 'Processing...' }) {
    return (
        <div className="fixed inset-0 bg-[#050000]/80 z-[9998] flex flex-col items-center justify-center gap-3">
            <Loader2 size={40} className="text-[#ff2a2a]" style={{ animation: 'spin 1s linear infinite' }} />
            <span className="text-[#a37c7c] font-ui text-sm">{text}</span>
        </div>
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide = false }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-[9990] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`bg-[#0f0202] border border-[#3a0909] rounded-xl shadow-2xl overflow-hidden flex flex-col ${wide ? 'max-w-4xl' : 'max-w-2xl'} w-full max-h-[90vh]`}>
                <div className="flex items-center justify-between p-4 border-b border-[#3a0909]">
                    <h3 className="font-ui font-semibold text-[#ffe5e5]">{title}</h3>
                    <button onClick={onClose} className="text-[#a37c7c] hover:text-[#ffe5e5] transition-colors"><X size={20} /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
}

// ── Side Drawer ───────────────────────────────────────────────────────────────
function SideDrawer({ open, onClose, title, children }) {
    return (
        <div className={`fixed inset-0 z-[9980] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
            <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-[#0f0202] border-l border-[#3a0909] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b border-[#3a0909]">
                    <h3 className="font-ui font-semibold text-[#ffe5e5]">{title}</h3>
                    <button onClick={onClose} className="text-[#a37c7c] hover:text-[#ffe5e5]"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
        </div>
    );
}

// ── Badges ────────────────────────────────────────────────────────────────────
const SEV_COLORS = { Critical: 'bg-[#4a1f1f] text-[#F85149] border-[#F85149]', High: 'bg-[#4a3020] text-[#f0883e] border-[#f0883e]', Medium: 'bg-[#3a3210] text-[#D29922] border-[#D29922]', Low: 'bg-[#1f3a20] text-[#3FB950] border-[#3FB950]', Unknown: 'bg-[#1a0505] text-[#a37c7c] border-[#3a0909]' };
const DEC_COLORS = { duplicate: 'bg-[#4a1f1f] text-[#F85149] border-[#F85149]', possible_duplicate: 'bg-[#3a3210] text-[#D29922] border-[#D29922]', new_defect: 'bg-[#1f3a20] text-[#3FB950] border-[#3FB950]' };
function SevBadge({ sev }) { const n = normSev(sev); return <span className={`text-xs px-2 py-0.5 rounded border font-code ${SEV_COLORS[n] || SEV_COLORS.Unknown}`}>{n}</span>; }
function DecBadge({ dec }) { const labels = { duplicate: 'DUPLICATE', possible_duplicate: 'POSSIBLE DUP', new_defect: 'NEW DEFECT' }; return <span className={`text-xs px-2 py-0.5 rounded border font-code ${DEC_COLORS[dec] || 'bg-[#1a0505] text-[#a37c7c] border-[#3a0909]'}`}>{labels[dec] || dec || '—'}</span>; }
function ConfBar({ val, max = 1 }) { const pct = Math.min(100, Math.round((val || 0) * 100 / max)); const c = pct >= 85 ? '#F85149' : pct >= 50 ? '#D29922' : '#3FB950'; return <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-[#1a0505] rounded-full overflow-hidden"><div style={{ width: `${pct}%`, background: c, transition: 'width 0.6s ease' }} className="h-full rounded-full" /></div><span className="text-xs font-code text-[#a37c7c] w-10 text-right">{pct}%</span></div>; }

// ── Sidebar ───────────────────────────────────────────────────────────────────
const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'submit', label: 'Submit Report', icon: FileText },
    { id: 'reports', label: 'All Reports', icon: Search },
    { id: 'clusters', label: 'Clusters', icon: GitBranch },
    { id: 'pdf', label: 'Export PDF Report', icon: FileDown },
];
function Sidebar({ active, setPage }) {
    return (
        <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0f0202] border-r border-[#3a0909] flex flex-col z-50">
            <div className="p-5 border-b border-[#3a0909]">
                <div className="flex items-center gap-2"><Zap size={22} className="text-[#ff2a2a]" /><span className="font-ui font-bold text-xl text-[#ffe5e5]">DefectAI</span></div>
                <p className="text-[#a37c7c] text-xs mt-1">Duplicate Defect Finder</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
                {NAV.map(n => {
                    const Icon = n.icon; const isActive = active === n.id;
                    return (
                        <button key={n.id} onClick={() => setPage(n.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-ui transition-all duration-150 text-left
                ${isActive ? 'bg-[#330000] text-[#ff2a2a] border-l-2 border-[#ff2a2a] pl-[10px]' : 'text-[#a37c7c] hover:bg-[#1a0505] hover:text-[#ffe5e5]'}`}>
                            <Icon size={17} />{n.label}
                        </button>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-[#3a0909]"><span className="text-[#a37c7c] text-xs font-code">v1.0 Hackathon</span></div>
        </aside>
    );
}

// ── Field Display ─────────────────────────────────────────────────────────────
function Field({ label, value, mono = false }) {
    if (!value) return null;
    return (
        <div className="mb-3">
            <p className="text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">{label}</p>
            <p className={`text-sm text-[#ffe5e5] ${mono ? 'font-code bg-[#050000] p-2 rounded text-xs' : ''}`}>{value}</p>
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ defects, stats, setPage, setLoadedReport }) {
    // Generate Severity Chart Data from Backend Stats
    const totalDefects = stats.total_defects || 1;
    const sevDist = stats.severity_distribution || {};
    const sevData = ['Critical', 'High', 'Medium', 'Low'].map(s => {
        const key = s === 'High' ? 'major' : s === 'Medium' ? 'normal' : s === 'Low' ? 'minor' : s.toLowerCase();
        return {
            name: s, count: sevDist[key] || 0,
            fill: s === 'Critical' ? '#F85149' : s === 'High' ? '#f0883e' : s === 'Medium' ? '#D29922' : '#3FB950'
        };
    });

    // Generate Decision Distribution Chart from Backend Stats
    const decDist = stats.decision_distribution || { duplicate: 0, possible_duplicate: 0, new_defect: 0 };
    const decData = [
        { name: 'Duplicate', value: decDist.duplicate, color: '#F85149' },
        { name: 'Possible', value: decDist.possible_duplicate, color: '#D29922' },
        { name: 'New', value: decDist.new_defect, color: '#3FB950' },
    ].filter(d => d.value > 0);

    // Generate Cluster Distribution Chart from Backend Stats
    const clusterDist = stats.cluster_distribution || {};
    const clusterData = Object.keys(clusterDist).slice(0, 5).map(id => ({
        name: `Cluster ${id}`, count: clusterDist[id],
        fill: '#8a2be2' // Purple graph for clusters
    }));

    const statCards = [
        { label: 'Total Reports', val: stats.total_defects || 0, icon: FileText, color: '#ff2a2a' },
        { label: 'Duplicates Found', val: decDist.duplicate || 0, icon: Copy, color: '#F85149' },
        { label: 'New Defects', val: decDist.new_defect || 0, icon: CheckCircle, color: '#3FB950' },
        { label: 'Active Clusters', val: stats.total_clusters || 0, icon: Layers, color: '#D29922' },
    ];
    const recent = [...defects].slice(0, 5);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold font-ui text-[#ffe5e5]">Dashboard</h1><p className="text-[#a37c7c] text-sm mt-1">Real-time Defect Analysis Overview</p></div>
                <button onClick={() => setPage('submit')} className="flex items-center gap-2 bg-[#cc0000] hover:bg-[#ff5555] text-white px-4 py-2 rounded-lg text-sm font-ui transition-colors">
                    <Plus size={16} />Submit New Bug Report
                </button>
            </div>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {statCards.map(c => {
                    const I = c.icon; return (
                        <div key={c.label} className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-4 shadow-lg hover:border-[#ff2a2a]/30 transition-colors">
                            <div className="flex items-center justify-between mb-2"><span className="text-[#a37c7c] text-xs font-ui uppercase tracking-wider">{c.label}</span><I size={18} style={{ color: c.color }} /></div>
                            <p className="text-3xl font-bold font-code" style={{ color: c.color }}>{c.val.toLocaleString()}</p>
                        </div>
                    );
                })}
            </div>

            {/* Decision Distribution Prominent Section */}
            <div className="bg-[#1a0505] border border-[#3a0909] rounded-xl mb-6 p-5">
                <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-4">Database Decision Distribution (AI Triage)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0f0202] border-l-4 border-[#F85149] rounded-lg p-3">
                        <p className="text-xs text-[#a37c7c] uppercase mb-1">Duplicates</p>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-code font-bold text-[#F85149]">{decDist.duplicate.toLocaleString()}</p>
                            <span className="text-xs bg-[#4a1f1f] text-[#F85149] px-2 py-0.5 rounded-full">{totalDefects ? Math.round(decDist.duplicate / totalDefects * 100) : 0}%</span>
                        </div>
                    </div>
                    <div className="bg-[#0f0202] border-l-4 border-[#D29922] rounded-lg p-3">
                        <p className="text-xs text-[#a37c7c] uppercase mb-1">Possible Duplicates</p>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-code font-bold text-[#D29922]">{decDist.possible_duplicate.toLocaleString()}</p>
                            <span className="text-xs bg-[#3a3210] text-[#D29922] px-2 py-0.5 rounded-full">{totalDefects ? Math.round(decDist.possible_duplicate / totalDefects * 100) : 0}%</span>
                        </div>
                    </div>
                    <div className="bg-[#0f0202] border-l-4 border-[#3FB950] rounded-lg p-3">
                        <p className="text-xs text-[#a37c7c] uppercase mb-1">New Defects</p>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-code font-bold text-[#3FB950]">{decDist.new_defect.toLocaleString()}</p>
                            <span className="text-xs bg-[#1f3a20] text-[#3FB950] px-2 py-0.5 rounded-full">{totalDefects ? Math.round(decDist.new_defect / totalDefects * 100) : 0}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-4">Defects by Severity</h3>
                    <SvgBar data={sevData} />
                </div>
                <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-4">Defects by Cluster</h3>
                    <SvgBar data={clusterData} />
                </div>
                <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-4">Decision Breakdown</h3>
                    <SvgPie data={decData} />
                </div>
            </div>
            {/* Recent */}
            <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl">
                <div className="flex items-center justify-between p-4 border-b border-[#3a0909]">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5]">Recent Activity</h3>
                </div>
                <div className="divide-y divide-[#1a0505]">
                    {recent.map(d => (
                        <div key={d.defect_id} onClick={() => { setLoadedReport(d); setPage('submit'); }} className="flex items-center gap-3 p-3 hover:bg-[#1a0505] cursor-pointer transition-colors">
                            <span className="font-code text-xs text-[#a37c7c] w-24 shrink-0">{d.defect_id}</span>
                            <span className="flex-1 text-sm text-[#ffe5e5] truncate">{d.title}</span>
                            <DecBadge dec={d.decision} />
                            <span className="text-xs text-[#a37c7c] shrink-0">{d.date ? new Date(d.date).toLocaleDateString() : ''}</span>
                            <ChevronRight size={14} className="text-[#a37c7c] shrink-0" />
                        </div>
                    ))}
                    {recent.length === 0 && <p className="text-center text-[#a37c7c] text-sm py-8">No reports yet</p>}
                </div>
            </div>
        </div>
    );
}

// ── Submit Report ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { title: '', description: '', steps: '', expected: '', actual: '', environment: '', severity: 'normal', logs: '' };
function SubmitReport({ setPage, setResult, showToast, loadedReport, setLoadedReport }) {
    const [form, setForm] = useState(loadedReport ? {
        title: loadedReport.title || '', description: loadedReport.raw_description || '',
        steps: loadedReport.steps || '', expected: loadedReport.expected || '',
        actual: loadedReport.actual || '', environment: loadedReport.environment || '',
        severity: loadedReport.severity || 'normal', logs: loadedReport.logs || ''
    } : EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [enhanced, setEnhanced] = useState(null);
    const [showEnhanced, setShowEnhanced] = useState(false);

    useEffect(() => { if (loadedReport) { setForm({ title: loadedReport.title || '', description: loadedReport.raw_description || '', steps: loadedReport.steps || '', expected: loadedReport.expected || '', actual: loadedReport.actual || '', environment: loadedReport.environment || '', severity: loadedReport.severity || 'normal', logs: loadedReport.logs || '' }); } }, [loadedReport]);

    const validate = () => {
        const e = {};
        if (!form.title.trim()) e.title = 'Title is required';
        if (!form.description.trim()) e.description = 'Description is required';
        setErrors(e); return Object.keys(e).length === 0;
    };
    const inp = (f) => `w-full bg-[#050000] border rounded-lg px-3 py-2 text-sm font-ui text-[#ffe5e5] placeholder-[#662222] focus:outline-none focus:border-[#ff2a2a] transition-colors ${errors[f] ? 'border-[#F85149]' : 'border-[#3a0909]'}`;

    const handleCheck = async () => {
        if (!validate()) return;
        setLoading(true);
        const data = await API.analyze(form);
        setResult(data); setPage('results'); setLoading(false);
    };
    const handleEnhance = async () => {
        if (!validate()) return;
        setLoading(true);
        const data = await API.enhance(form);
        setEnhanced(data); setShowEnhanced(true); setLoading(false);
    };
    const handleSubmit = () => {
        if (!validate()) return;
        showToast('Report Submitted Successfully', 'success');
        setForm(EMPTY_FORM); setLoadedReport(null); setPage('reports');
    };
    const acceptEnhanced = () => {
        const r = enhanced?.improved_report || {};
        setForm(f => ({ ...f, title: r.title || f.title, description: r.summary || f.description, severity: (r.suggested_severity || 'normal').toLowerCase() }));
        setShowEnhanced(false); showToast('Enhancement Applied', 'success');
    };

    return (
        <div className="p-6 max-w-3xl">
            {loading && <LoadingOverlay />}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setPage('dashboard')} className="text-[#a37c7c] hover:text-[#ffe5e5]"><ArrowLeft size={18} /></button>
                <div><h1 className="text-2xl font-bold font-ui text-[#ffe5e5]">Submit Bug Report</h1><p className="text-[#a37c7c] text-sm mt-0.5">Fill in the details below</p></div>
            </div>
            <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-5 space-y-4">
                {/* Title */}
                <div>
                    <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Title *</label>
                    <input className={inp('title')} placeholder="Brief summary of the bug" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    {errors.title && <p className="text-[#F85149] text-xs mt-1">{errors.title}</p>}
                </div>
                {/* Description */}
                <div>
                    <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Description *</label>
                    <textarea rows={4} className={inp('description')} placeholder="Detailed description of the issue..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    {errors.description && <p className="text-[#F85149] text-xs mt-1">{errors.description}</p>}
                </div>
                {/* Steps */}
                <div>
                    <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Steps to Reproduce</label>
                    <textarea rows={3} className={inp('steps')} placeholder="1. Open app&#10;2. Click button&#10;3. Observe error" value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Expected Result</label>
                        <textarea rows={2} className={inp('')} placeholder="What should happen..." value={form.expected} onChange={e => setForm(f => ({ ...f, expected: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Actual Result</label>
                        <textarea rows={2} className={inp('')} placeholder="What actually happened..." value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Environment</label>
                        <input className={inp('')} placeholder="OS, Browser, Version..." value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Severity</label>
                        <select className={inp('')} value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                            {['blocker', 'critical', 'major', 'normal', 'minor', 'trivial'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-[#a37c7c] mb-1 uppercase tracking-wider">Logs / Stack Trace</label>
                    <textarea rows={3} className={`${inp('')} font-code text-xs`} placeholder="Paste error logs here..." value={form.logs} onChange={e => setForm(f => ({ ...f, logs: e.target.value }))} />
                </div>
                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button onClick={handleCheck} disabled={loading} className="flex-1 bg-[#cc0000] hover:bg-[#ff5555] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-ui font-medium transition-colors flex items-center justify-center gap-2">
                        <Search size={15} />Check for Duplicates
                    </button>
                    <button onClick={handleEnhance} disabled={loading} className="flex-1 bg-[#1f4a2e] hover:bg-[#2ea043] disabled:opacity-50 text-[#3FB950] py-2.5 rounded-lg text-sm font-ui font-medium border border-[#3FB950]/40 transition-colors flex items-center justify-center gap-2">
                        <Zap size={15} />Enhance My Report
                    </button>
                    <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#1a0505] hover:bg-[#3a0909] disabled:opacity-50 text-[#ffe5e5] py-2.5 rounded-lg text-sm font-ui font-medium border border-[#3a0909] transition-colors flex items-center justify-center gap-2">
                        <CheckCircle size={15} />Submit Report
                    </button>
                </div>
            </div>

            {/* Enhanced Panel */}
            {showEnhanced && enhanced && (
                <div className="mt-4 bg-[#0f0202] border border-[#3FB950]/40 rounded-xl p-5">
                    <h3 className="text-sm font-ui font-semibold text-[#3FB950] mb-4 flex items-center gap-2"><Zap size={15} />AI Enhancement Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-[#a37c7c] mb-2 uppercase tracking-wider">Original</p>
                            <div className="bg-[#050000] rounded-lg p-3 space-y-2">
                                <p className="text-xs text-[#ffe5e5]">{form.title}</p>
                                <p className="text-xs text-[#a37c7c]">{form.description?.substring(0, 200)}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-[#a37c7c] mb-2 uppercase tracking-wider">AI Enhanced</p>
                            <div className="bg-[#050000] rounded-lg p-3 space-y-2">
                                <p className="text-xs text-[#3FB950] font-medium">{enhanced.improved_report?.title}</p>
                                <p className="text-xs text-[#ffe5e5]">{enhanced.improved_report?.summary?.substring(0, 200)}</p>
                                {enhanced.improved_report?.suggested_severity && <span className="inline-block text-xs bg-[#4a3020] text-[#D29922] px-2 py-0.5 rounded border border-[#D29922]/40">Suggested: {enhanced.improved_report.suggested_severity}</span>}
                                {enhanced.improved_report?.missing_fields?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {enhanced.improved_report.missing_fields.map((mf, i) => <span key={i} className="text-xs bg-[#4a1f1f] text-[#F85149] px-2 py-0.5 rounded border border-[#F85149]/40">Missing: {mf.field || mf}</span>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={acceptEnhanced} className="bg-[#1f4a2e] hover:bg-[#2ea043] text-[#3FB950] px-4 py-2 rounded-lg text-sm font-ui border border-[#3FB950]/40 transition-colors">Accept Enhanced</button>
                        <button onClick={() => setShowEnhanced(false)} className="bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-4 py-2 rounded-lg text-sm font-ui border border-[#3a0909] transition-colors">Edit Further</button>
                        <button onClick={() => { setShowEnhanced(false); }} className="text-[#a37c7c] hover:text-[#F85149] px-4 py-2 rounded-lg text-sm font-ui transition-colors">Discard</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Results Page ──────────────────────────────────────────────────────────────
function ResultsPage({ result, setPage, setSelectedCluster, showToast, setLoadedReport }) {
    const [viewModal, setViewModal] = useState(null);
    const [markedDups, setMarkedDups] = useState(new Set());
    if (!result) return (
        <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle size={48} className="text-[#a37c7c]" />
            <p className="text-[#a37c7c]">No analysis result yet.</p>
            <button onClick={() => setPage('submit')} className="bg-[#cc0000] hover:bg-[#ff5555] text-white px-4 py-2 rounded-lg text-sm font-ui">Submit a Report</button>
        </div>
    );
    const { decision, confidence, top_matches = [], cluster_id, improved_report } = result;
    const pct = Math.round((confidence || 0) * 100);
    const bannerCfg = { duplicate: { bg: '#4a1f1f', border: '#F85149', text: '#F85149', label: 'DUPLICATE DETECTED' }, possible_duplicate: { bg: '#3a3210', border: '#D29922', text: '#D29922', label: 'POSSIBLE DUPLICATE' }, new_defect: { bg: '#1f3a20', border: '#3FB950', text: '#3FB950', label: 'NEW DEFECT' } };
    const cfg = bannerCfg[decision] || bannerCfg.new_defect;
    const simColor = (s) => s >= 0.85 ? '#F85149' : s >= 0.5 ? '#D29922' : '#3FB950';

    const markDup = (id) => { setMarkedDups(s => { const n = new Set(s); n.add(id); return n; }); showToast('Marked as Duplicate', 'success'); };

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setPage('submit')} className="flex items-center gap-1.5 text-[#a37c7c] hover:text-[#ffe5e5] text-sm"><ArrowLeft size={16} />Back</button>
                <div className="flex-1" />
                <button onClick={() => setPage('pdf')} className="flex items-center gap-2 bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-3 py-1.5 rounded-lg text-sm font-ui border border-[#3a0909]"><FileDown size={14} />Generate PDF</button>
            </div>

            {/* Decision Banner */}
            <div className="rounded-xl p-6 mb-6 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
                <p className="text-xs tracking-widest mb-1" style={{ color: cfg.text }}>ANALYSIS RESULT</p>
                <h2 className="text-3xl font-bold font-code mb-4" style={{ color: cfg.text }}>{cfg.label}</h2>
                <div className="flex items-center gap-4">
                    <span className="text-5xl font-code font-bold" style={{ color: cfg.text }}>{pct}%</span>
                    <div className="flex-1">
                        <p className="text-xs text-[#a37c7c] mb-1">Confidence Score</p>
                        <div className="h-2 bg-[#050000]/40 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%`, background: cfg.text, animation: 'progressFill 1s ease forwards', transition: 'width 1s ease' }} className="h-full rounded-full" />
                        </div>
                    </div>
                </div>
                {improved_report?.suggested_severity && <div className="mt-3"><SevBadge sev={improved_report.suggested_severity} /></div>}
            </div>

            {/* Top Matches */}
            {top_matches.length > 0 && (
                <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl mb-4">
                    <div className="p-4 border-b border-[#3a0909]"><h3 className="text-sm font-ui font-semibold text-[#ffe5e5]">Top Matching Reports</h3></div>
                    <div className="divide-y divide-[#1a0505]">
                        {top_matches.map((m, i) => (
                            <div key={i} className="p-4">
                                <div className="flex items-start gap-3 mb-2">
                                    <span className="font-code text-xs text-[#a37c7c] mt-0.5 w-24 shrink-0">{m.defect_id}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[#ffe5e5] font-medium truncate">{m.title}</p>
                                        <p className="text-xs text-[#a37c7c] mt-1 line-clamp-2">{m.improved_summary || m.snippet || 'No preview available'}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 h-1.5 bg-[#1a0505] rounded-full overflow-hidden max-w-[180px]">
                                                <div style={{ width: `${Math.round((m.similarity_score || 0) * 100)}%`, background: simColor(m.similarity_score) }} className="h-full rounded-full transition-all" />
                                            </div>
                                            <span className="text-xs font-code" style={{ color: simColor(m.similarity_score) }}>{Math.round((m.similarity_score || 0) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-[108px]">
                                    <button onClick={() => setViewModal(m)} className="text-xs bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-3 py-1 rounded border border-[#3a0909] transition-colors flex items-center gap-1"><Eye size={11} />View Full Report</button>
                                    <button onClick={() => markDup(m.defect_id)} disabled={markedDups.has(m.defect_id)} className="text-xs bg-[#4a1f1f] hover:bg-[#5a2f2f] disabled:opacity-50 text-[#F85149] px-3 py-1 rounded border border-[#F85149]/40 transition-colors">
                                        {markedDups.has(m.defect_id) ? '✓ Marked' : 'Mark as Duplicate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cluster */}
            {cluster_id != null && cluster_id >= 0 && (
                <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-[#a37c7c] mb-1">Cluster Assignment</p>
                        <p className="text-sm text-[#ffe5e5] font-medium">Cluster #{cluster_id} &mdash; <span className="text-[#a37c7c]">{top_matches.filter(m => m.cluster_id === cluster_id).length} matching reports</span></p>
                    </div>
                    <button onClick={() => { setSelectedCluster(cluster_id); setPage('clusters'); }} className="flex items-center gap-2 bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-3 py-1.5 rounded-lg text-sm font-ui border border-[#3a0909]"><GitBranch size={13} />View Cluster</button>
                </div>
            )}

            {/* Match detail modal */}
            <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.defect_id || 'Report Details'}>
                {viewModal && (<div className="space-y-3">
                    <Field label="Title" value={viewModal.title} />
                    <Field label="Description" value={viewModal.improved_summary || viewModal.raw_description} />
                    <div className="flex gap-4">
                        <div><p className="text-xs text-[#a37c7c] mb-1">Similarity</p><span className="font-code font-bold" style={{ color: simColor(viewModal.similarity_score) }}>{Math.round((viewModal.similarity_score || 0) * 100)}%</span></div>
                        <div><p className="text-xs text-[#a37c7c] mb-1">Cluster</p><span className="font-code text-[#ffe5e5]">#{viewModal.cluster_id}</span></div>
                        <div><p className="text-xs text-[#a37c7c] mb-1">Severity</p><SevBadge sev={viewModal.severity} /></div>
                    </div>
                    <button onClick={() => { setLoadedReport(viewModal); setViewModal(null); setPage('submit'); }} className="text-xs bg-[#cc0000] hover:bg-[#ff5555] text-white px-3 py-1.5 rounded-lg font-ui">Load into Form</button>
                </div>)}
            </Modal>
        </div>
    );
}

// ── All Reports ───────────────────────────────────────────────────────────────
function AllReports({ defects: initDefects, setPage, setLoadedReport, showToast }) {
    const [defects, setDefects] = useState(initDefects);
    const [search, setSearch] = useState('');
    const [filterDec, setFilterDec] = useState('all');
    const [filterSev, setFilterSev] = useState('all');
    const [page, setCurrentPage] = useState(1);
    const [drawerItem, setDrawerItem] = useState(null);
    const [enhModal, setEnhModal] = useState(null);
    const [loading, setLoading] = useState(false);
    const PER_PAGE = 10;

    useEffect(() => {
        (async () => {
            setLoading(true);
            const data = await API.defects({ per_page: 100 });
            if (data?.defects?.length > 0) setDefects(data.defects);
            setLoading(false);
        })();
    }, []);

    const filtered = defects.filter(d => {
        const q = search.toLowerCase();
        const matchQ = !q || (d.title || '').toLowerCase().includes(q) || (d.defect_id || '').toLowerCase().includes(q);
        const matchDec = filterDec === 'all' || d.decision === filterDec;
        const matchSev = filterSev === 'all' || normSev(d.severity) === filterSev;
        return matchQ && matchDec && matchSev;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const exportCSV = () => {
        const hdr = ['ID', 'Title', 'Severity', 'Decision', 'Cluster', 'Confidence', 'Date'];
        const rows = filtered.map(d => [d.defect_id, `"${(d.title || '').replace(/"/g, '""')}"`, normSev(d.severity), d.decision || '', d.cluster_id ?? '', d.confidence || '', d.date || ''].join(','));
        const blob = new Blob([[hdr.join(','), ...rows].join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'defects.csv'; a.click();
        showToast('CSV Downloaded', 'success');
    };

    const handleEnhance = async (d) => {
        setLoading(true);
        const data = await API.enhance({ title: d.title, description: d.raw_description || d.improved_summary || '' });
        setEnhModal({ defect: d, result: data }); setLoading(false);
    };

    return (
        <div className="p-6">
            {loading && <LoadingOverlay text="Loading reports..." />}
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold font-ui text-[#ffe5e5]">All Reports</h1><p className="text-[#a37c7c] text-sm mt-1">{filtered.length} reports found</p></div>
                <button onClick={exportCSV} className="flex items-center gap-2 bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-3 py-2 rounded-lg text-sm font-ui border border-[#3a0909]"><Download size={14} />Export CSV</button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search by title or ID..." className="bg-[#050000] border border-[#3a0909] rounded-lg px-3 py-1.5 text-sm font-ui text-[#ffe5e5] placeholder-[#662222] focus:outline-none focus:border-[#ff2a2a] w-64" />
                <select value={filterDec} onChange={e => { setFilterDec(e.target.value); setCurrentPage(1); }} className="bg-[#050000] border border-[#3a0909] rounded-lg px-3 py-1.5 text-sm font-ui text-[#ffe5e5] focus:outline-none focus:border-[#ff2a2a]">
                    <option value="all">All Decisions</option>
                    <option value="duplicate">Duplicate</option>
                    <option value="possible_duplicate">Possible Duplicate</option>
                    <option value="new_defect">New Defect</option>
                </select>
                <select value={filterSev} onChange={e => { setFilterSev(e.target.value); setCurrentPage(1); }} className="bg-[#050000] border border-[#3a0909] rounded-lg px-3 py-1.5 text-sm font-ui text-[#ffe5e5] focus:outline-none focus:border-[#ff2a2a]">
                    <option value="all">All Severities</option>
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-[#3a0909] text-[#a37c7c] text-xs uppercase tracking-wider">
                            {['ID', 'Title', 'Severity', 'Decision', 'Cluster', 'Confidence', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-ui">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-[#1a0505]">
                            {pageItems.map(d => (
                                <tr key={d.defect_id} className="hover:bg-[#1a0505] transition-colors">
                                    <td className="px-4 py-3 font-code text-xs text-[#a37c7c] whitespace-nowrap">{d.defect_id}</td>
                                    <td className="px-4 py-3 max-w-[200px]"><p className="truncate text-[#ffe5e5]">{d.title}</p></td>
                                    <td className="px-4 py-3 whitespace-nowrap"><SevBadge sev={d.severity} /></td>
                                    <td className="px-4 py-3 whitespace-nowrap"><DecBadge dec={d.decision} /></td>
                                    <td className="px-4 py-3 font-code text-xs text-[#a37c7c]">{d.cluster_id != null ? `#${d.cluster_id}` : '—'}</td>
                                    <td className="px-4 py-3 min-w-[120px]"><ConfBar val={d.confidence || 0} /></td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex gap-1.5">
                                            <button onClick={() => setDrawerItem(d)} className="text-xs bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-2 py-1 rounded border border-[#3a0909] flex items-center gap-1"><Eye size={10} />View</button>
                                            <button onClick={() => handleEnhance(d)} className="text-xs bg-[#1f4a2e] hover:bg-[#2ea043] text-[#3FB950] px-2 py-1 rounded border border-[#3FB950]/30 flex items-center gap-1"><Zap size={10} />Enhance</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pageItems.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-[#a37c7c]">No reports found</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-[#a37c7c] font-ui">Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setCurrentPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 bg-[#1a0505] hover:bg-[#3a0909] disabled:opacity-40 text-[#ffe5e5] rounded-lg border border-[#3a0909] text-xs font-ui"><ChevronLeft size={13} />Previous</button>
                    <span className="px-3 py-1.5 text-[#a37c7c] font-code text-xs">{page}/{totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 bg-[#1a0505] hover:bg-[#3a0909] disabled:opacity-40 text-[#ffe5e5] rounded-lg border border-[#3a0909] text-xs font-ui">Next<ChevronRight size={13} /></button>
                </div>
            </div>

            {/* Side Drawer */}
            <SideDrawer open={!!drawerItem} onClose={() => setDrawerItem(null)} title={drawerItem?.defect_id || 'Report'}>
                {drawerItem && (<div className="space-y-3">
                    <div className="flex gap-2 flex-wrap"><SevBadge sev={drawerItem.severity} /><DecBadge dec={drawerItem.decision} /></div>
                    <Field label="Title" value={drawerItem.title} />
                    <Field label="Description" value={drawerItem.raw_description || drawerItem.improved_summary} />
                    <Field label="Steps" value={drawerItem.steps} />
                    <Field label="Expected" value={drawerItem.expected} />
                    <Field label="Actual" value={drawerItem.actual} />
                    <Field label="Environment" value={drawerItem.environment} />
                    <Field label="Logs" value={drawerItem.logs} mono />
                    {drawerItem.cluster_id != null && <div><p className="text-xs text-[#a37c7c] mb-1">Cluster</p><span className="font-code text-[#ffe5e5] text-sm">#{drawerItem.cluster_id}</span></div>}
                    {drawerItem.missing_fields?.length > 0 && <div><p className="text-xs text-[#a37c7c] mb-1">Missing Fields</p><div className="flex flex-wrap gap-1">{drawerItem.missing_fields.map((f, i) => <span key={i} className="text-xs bg-[#4a1f1f] text-[#F85149] px-2 py-0.5 rounded">{f}</span>)}</div></div>}
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => { setLoadedReport(drawerItem); setDrawerItem(null); setPage('submit'); }} className="flex-1 bg-[#cc0000] hover:bg-[#ff5555] text-white py-2 rounded-lg text-xs font-ui flex items-center justify-center gap-1"><Search size={12} />Check Duplicate</button>
                        <button onClick={() => setDrawerItem(null)} className="bg-[#1a0505] hover:bg-[#3a0909] text-[#ffe5e5] px-4 py-2 rounded-lg text-xs font-ui border border-[#3a0909]">Close</button>
                    </div>
                </div>)}
            </SideDrawer>

            {/* Enhance modal */}
            <Modal open={!!enhModal} onClose={() => setEnhModal(null)} title="AI Enhancement" wide>
                {enhModal && (<div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-[#a37c7c] mb-2 uppercase tracking-wider">Original</p><div className="bg-[#050000] rounded p-3 space-y-1"><p className="text-xs text-[#ffe5e5] font-medium">{enhModal.defect.title}</p><p className="text-xs text-[#a37c7c]">{(enhModal.defect.raw_description || enhModal.defect.improved_summary || '').substring(0, 300)}</p></div></div>
                    <div><p className="text-xs text-[#a37c7c] mb-2 uppercase tracking-wider">Enhanced</p><div className="bg-[#050000] rounded p-3 space-y-1"><p className="text-xs text-[#3FB950] font-medium">{enhModal.result?.improved_report?.title}</p><p className="text-xs text-[#ffe5e5]">{enhModal.result?.improved_report?.summary?.substring(0, 300)}</p></div></div>
                </div>)}
            </Modal>
        </div>
    );
}

// ── Clusters Page ─────────────────────────────────────────────────────────────
const CLUSTER_NAMES = {
    0: 'C1: Security & Authentication Failures',
    1: 'C2: UI Rendering & Visual Layout Bugs',
    2: 'C3: Performance Degradation & Latency',
    3: 'C4: Data Corruption & Processing Errors',
    4: 'C5: Network, API & Connectivity Issues',
    5: 'C6: Build, Package & Configuration Errors',
    6: 'C7: Memory Leaks & Resource Exhaustion',
    7: 'C8: Application Crashes & System Stability',
    8: 'C9: File System & I/O Operations',
    9: 'C10: Database & Query Execution Bugs',
    10: 'C11: Concurrency, Threading & Race Conditions',
    11: 'C12: Plugin, Extension & Integration Failures',
    12: 'C13: Browser Compatibility & Web Standards',
    13: 'C14: Logging, Monitoring & Observability',
    14: 'C15: Test Failures & CI/CD Pipeline',
    15: 'C16: Mobile & Responsive Design Issues',
    16: 'C17: Dependency & Version Conflicts',
    17: 'C18: Documentation & Error Messaging',
    18: 'C19: Search & Indexing Defects',
    19: 'C20: Distributed Systems & Cluster Coordination',
};
const CLUSTER_COLORS = [
    '#F85149', '#f0883e', '#D29922', '#3FB950', '#58a6ff',
    '#8a2be2', '#ff79c6', '#a37c7c', '#00bcd4', '#e91e63',
    '#4caf50', '#ff5722', '#9c27b0', '#03a9f4', '#8bc34a',
    '#ffc107', '#607d8b', '#ff4081', '#00e5ff', '#76ff03',
];
function ClustersPage({ defects: propDefects, selectedCluster, setPage, setLoadedReport, showToast }) {
    const [stats, setStats] = useState(null);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(selectedCluster != null ? new Set([selectedCluster]) : new Set());
    const [allDefects, setAllDefects] = useState(propDefects);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [clusterData, defectsData] = await Promise.all([
                    API.clusters(),
                    API.defects({ per_page: 500 })
                ]);
                if (clusterData) setStats(clusterData);
                if (defectsData?.defects?.length > 0) setAllDefects(defectsData.defects);
            } catch { }
            setLoading(false);
        })();
    }, []);

    // Group defects by cluster
    const clusterMap = {};
    allDefects.forEach(d => {
        const cid = d.cluster_id ?? -1;
        if (cid === -1) return;
        if (!clusterMap[cid]) clusterMap[cid] = { id: cid, defects: [] };
        clusterMap[cid].defects.push(d);
    });

    const clustersArr = Object.values(clusterMap)
        .filter(c => !search || (CLUSTER_NAMES[c.id] || `Cluster #${c.id}`).toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.defects.length - a.defects.length);

    const toggle = (id) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const sevBreakdown = (defs) => {
        const counts = {};
        defs.forEach(d => { const s = normSev(d.severity); counts[s] = (counts[s] || 0) + 1; });
        return counts;
    };
    const sevColor = { Critical: '#F85149', High: '#f0883e', Medium: '#D29922', Low: '#3FB950' };

    return (
        <div className="p-6">
            {loading && <LoadingOverlay text="Loading clusters..." />}
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold font-ui text-[#ffe5e5]">Clusters</h1><p className="text-[#a37c7c] text-sm mt-1">{clustersArr.length} clusters found</p></div>
                {stats && <div className="text-right"><p className="text-xs text-[#a37c7c]">Total indexed</p><p className="font-code font-bold text-[#ff2a2a] text-xl">{stats.total_records?.toLocaleString()}</p></div>}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clusters..." className="bg-[#050000] border border-[#3a0909] rounded-lg px-3 py-1.5 text-sm font-ui text-[#ffe5e5] placeholder-[#662222] focus:outline-none focus:border-[#ff2a2a] w-72 mb-4" />

            {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {Object.entries(stats.severity_distribution || {}).map(([sev, cnt]) => (
                    <div key={sev} className="bg-[#0f0202] border border-[#3a0909] rounded-lg p-3">
                        <p className="text-xs text-[#a37c7c] capitalize">{sev}</p>
                        <p className="font-code font-bold text-lg text-[#ffe5e5]">{cnt?.toLocaleString()}</p>
                    </div>
                ))}
            </div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {clustersArr.map(cluster => {
                    const isExp = expanded.has(cluster.id);
                    const name = CLUSTER_NAMES[cluster.id] || `Cluster #${cluster.id}`;
                    const sev = sevBreakdown(cluster.defects);
                    // Extract meaningful keywords (skip generic words)
                    const stopWords = ['created', 'by', 'on', 'the', 'a', 'an', 'in', 'to', 'for', 'and', 'is', 'was', 'it', 'of', 'at', 'from', 'with'];
                    const top3 = cluster.defects.slice(0, 5)
                        .flatMap(d => (d.title || '').split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w.toLowerCase())))
                        .slice(0, 3)
                        .map(w => w.replace(/[^a-zA-Z0-9]/g, ''));

                    const color = CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length];
                    return (
                        <div key={cluster.id} className="bg-[#0f0202] border rounded-xl overflow-hidden transition-all hover:shadow-lg" style={{ borderColor: selectedCluster === cluster.id ? color : '#3a0909', boxShadow: selectedCluster === cluster.id ? `0 0 12px ${color}33` : 'none' }}>
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="inline-block text-xs font-code font-bold px-2 py-0.5 rounded mb-1" style={{ background: `${color}22`, color: color, border: `1px solid ${color}44` }}>{Object.keys(CLUSTER_NAMES)[cluster.id] !== undefined ? `C${cluster.id + 1}` : `#${cluster.id}`}</span>
                                        <h3 className="text-sm font-ui font-semibold text-[#ffe5e5]">{name}</h3>
                                        <p className="text-xs text-[#a37c7c] mt-0.5">{cluster.defects.length.toLocaleString()} Reports</p>
                                    </div>
                                    <button onClick={() => toggle(cluster.id)} className="text-[#a37c7c] hover:text-[#ffe5e5] p-1">
                                        {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                                {/* Keyword chips */}
                                {top3.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{top3.filter(Boolean).map((kw, i) => <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: `${color}15`, color: color, border: `1px solid ${color}30` }}>{kw}</span>)}</div>}
                                {/* Severity mini bar */}
                                <div className="flex gap-1 h-1.5 rounded-full overflow-hidden mb-3">
                                    {Object.entries(sev).map(([s, c]) => (
                                        <div key={s} style={{ flex: c, background: sevColor[s] || '#662222' }} title={`${s}: ${c}`} />
                                    ))}
                                    {Object.keys(sev).length === 0 && <div className="flex-1 bg-[#3a0909]" />}
                                </div>
                                {/* First 3 titles */}
                                <div className="space-y-1">
                                    {cluster.defects.slice(0, 3).map((d, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-[#a37c7c]">
                                            <span className="w-1 h-1 rounded-full bg-[#3a0909] shrink-0" />
                                            <span className="truncate flex-1">{d.title}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => toggle(cluster.id)} className="mt-3 text-xs hover:underline font-ui" style={{ color }}>
                                    {isExp ? 'Collapse' : 'Expand all reports'} ({cluster.defects.length.toLocaleString()})
                                </button>
                            </div>

                            {/* Expanded list — show up to 20 defects */}
                            {isExp && (
                                <div className="border-t border-[#3a0909]">
                                    <div className="px-4 py-2 bg-[#1a0505] text-xs text-[#a37c7c] flex justify-between">
                                        <span>Showing {Math.min(20, cluster.defects.length)} of {cluster.defects.length} reports</span>
                                        <span className="text-[#ff2a2a]">{Object.entries(sevBreakdown(cluster.defects)).map(([s, c]) => `${s}: ${c}`).join(' · ')}</span>
                                    </div>
                                    <div className="divide-y divide-[#1a0505] max-h-[500px] overflow-y-auto">
                                        {cluster.defects.slice(0, 20).map((d, i) => (
                                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a0505] transition-colors">
                                                <span className="font-code text-xs text-[#a37c7c] w-20 shrink-0">{d.defect_id}</span>
                                                <span className="flex-1 text-xs text-[#ffe5e5] truncate">{d.title}</span>
                                                <SevBadge sev={d.severity} />
                                                <DecBadge dec={d.decision} />
                                                <button onClick={() => { setLoadedReport(d); setPage('submit'); }} className="text-xs bg-[#330000] hover:bg-[#cc0000] text-[#ff2a2a] px-2 py-1 rounded border border-[#ff2a2a]/30 shrink-0">View</button>
                                            </div>
                                        ))}
                                    </div>
                                    {cluster.defects.length > 20 && <div className="px-4 py-2 text-center text-xs text-[#662222]">+{cluster.defects.length - 20} more reports...</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
                {clustersArr.length === 0 && <div className="col-span-2 text-center py-16 text-[#a37c7c]">No clusters found</div>}
            </div>
        </div>
    );
}

// ── PDF Report Page ───────────────────────────────────────────────────────────
function PDFPage({ defects: propDefects, result, setPage }) {
    const [liveStats, setLiveStats] = useState(null);
    const [liveClusters, setLiveClusters] = useState(null);
    const [liveDefects, setLiveDefects] = useState(propDefects);
    const [loading, setLoading] = useState(true);
    const now = new Date().toLocaleString();

    // Fetch real-time data from backend
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [statsData, clusterData, defectsData] = await Promise.all([
                    API.stats(),
                    API.clusters(),
                    API.defects({ per_page: 100 })
                ]);
                if (statsData) setLiveStats(statsData);
                if (clusterData) setLiveClusters(clusterData);
                if (defectsData?.defects?.length > 0) setLiveDefects(defectsData.defects);
            } catch { /* use prop defaults */ }
            setLoading(false);
        })();
    }, []);

    const defects = liveDefects;
    const stats = liveStats || {};
    const clusters = liveClusters || {};

    const totalDefects = stats.total_defects || defects.length;
    const sevDist = stats.severity_distribution || {};
    const clusterDist = stats.cluster_distribution || clusters.cluster_distribution || {};
    const totalClusters = stats.total_clusters || Object.keys(clusterDist).length;
    const decDist = stats.decision_distribution || {};
    const dupCount = decDist.duplicate || defects.filter(d => d.decision === 'duplicate').length;
    const pDupCount = decDist.possible_duplicate || 0;
    const newCount = decDist.new_defect || defects.filter(d => d.decision === 'new_defect').length;
    const dupRate = totalDefects > 0 ? Math.round(dupCount / totalDefects * 100) : 0;

    // Cluster colors
    const clusterColors = ['#F85149', '#f0883e', '#D29922', '#3FB950', '#8a2be2', '#58a6ff', '#ff79c6', '#a37c7c'];

    const generatePDF = () => {
        const area = document.getElementById('printArea');
        area.style.display = 'block';
        window.print();
        setTimeout(() => area.style.display = 'none', 1000);
    };

    // Build cluster rows for print
    const clusterRows = Object.entries(clusterDist).sort((a, b) => b[1] - a[1]).map(([id, count]) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px;font-family:monospace;font-size:11px">Cluster #${id}</td>
      <td style="padding:6px 8px;font-size:12px">${count} defects</td>
      <td style="padding:6px 8px;font-size:12px">${totalDefects > 0 ? Math.round(count / totalDefects * 100) : 0}%</td>
    </tr>`).join('');

    // Build severity rows for print
    const sevRows = Object.entries(sevDist).sort((a, b) => b[1] - a[1]).map(([sev, count]) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px;font-size:12px;text-transform:capitalize">${sev}</td>
      <td style="padding:6px 8px;font-size:12px">${count}</td>
      <td style="padding:6px 8px;font-size:12px">${totalDefects > 0 ? Math.round(count / totalDefects * 100) : 0}%</td>
    </tr>`).join('');

    const defectRows = defects.slice(0, 25).map(d => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px;font-family:monospace;font-size:11px">${d.defect_id}</td>
      <td style="padding:6px 8px;font-size:12px">${(d.title || '').substring(0, 50)}</td>
      <td style="padding:6px 8px;font-size:12px">${normSev(d.severity)}</td>
      <td style="padding:6px 8px;font-size:12px">${d.decision || '—'}</td>
      <td style="padding:6px 8px;font-size:12px">${d.cluster_id ?? '—'}</td>
    </tr>`).join('');

    const printHTML = `
    <div style="position:relative;padding:40px;font-family:Arial,sans-serif;color:#000;background:#fff">
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;color:rgba(200,0,0,0.07);font-weight:bold;pointer-events:none;z-index:0">CLASSIFIED</div>
      <div style="text-align:center;border-bottom:3px solid #000;padding-bottom:20px;margin-bottom:30px">
        <h1 style="font-size:24px;margin:0">🛡️ DefectAI — Classified Defect Analysis Report</h1>
        <p style="color:#666;margin:8px 0 0">AI-Generated Bug Triage Summary &bull; ${now} &bull; Real-time Data</p>
      </div>
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">1. Executive Summary</h2>
      <table style="width:100%;margin-bottom:24px"><tr>
        <td><strong>Total Reports:</strong> ${totalDefects.toLocaleString()}</td>
        <td><strong>Duplicates:</strong> ${dupCount.toLocaleString()}</td>
        <td><strong>Duplicate Rate:</strong> ${dupRate}%</td>
        <td><strong>Active Clusters:</strong> ${totalClusters}</td>
      </tr></table>
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">2. Cluster Distribution (${totalClusters} clusters)</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Cluster</th><th style="text-align:left;padding:8px">Count</th><th style="text-align:left;padding:8px">%</th></tr></thead>
        <tbody>${clusterRows}</tbody>
      </table>
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">3. Severity Distribution</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">Severity</th><th style="text-align:left;padding:8px">Count</th><th style="text-align:left;padding:8px">%</th></tr></thead>
        <tbody>${sevRows}</tbody>
      </table>
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">4. Defect Decision Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead><tr style="background:#f5f5f5"><th style="text-align:left;padding:8px">ID</th><th style="text-align:left;padding:8px">Title</th><th style="text-align:left;padding:8px">Severity</th><th style="text-align:left;padding:8px">Decision</th><th style="text-align:left;padding:8px">Cluster</th></tr></thead>
        <tbody>${defectRows}</tbody>
      </table>
      ${result ? `
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">5. Latest Analysis Result</h2>
      <p><strong>Decision:</strong> ${result.decision} &bull; <strong>Confidence:</strong> ${Math.round((result.confidence || 0) * 100)}%</p>
      <p><strong>Cluster:</strong> #${result.cluster_id}</p>
      ${result.top_matches?.length ? `<p><strong>Top Match:</strong> ${result.top_matches[0]?.title} (${Math.round((result.top_matches[0]?.similarity_score || 0) * 100)}% similarity)</p>` : ''}
      `: ''}
      <h2 style="font-size:16px;color:#444;border-bottom:1px solid #ddd;padding-bottom:6px">6. Report Quality Analysis</h2>
      <p>Reports with missing fields: ${defects.filter(d => d.missing_fields?.length > 0).length} of ${defects.length}</p>
      <p style="margin-top:40px;text-align:center;color:#aaa;font-size:11px">Generated by DefectAI &bull; Hackathon Build &bull; ${now} &bull; Real-time Synced</p>
    </div>`;

    return (
        <div className="p-6 max-w-4xl">
            {loading && <LoadingOverlay text="Fetching real-time data..." />}
            {/* Hidden print area */}
            <div id="printArea" style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: printHTML }} />

            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setPage('results')} className="flex items-center gap-1.5 text-[#a37c7c] hover:text-[#ffe5e5] text-sm"><ArrowLeft size={16} />Back to Results</button>
            </div>
            <div className="bg-[#0f0202] border border-[#3a0909] rounded-xl p-6 mb-4">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold font-ui text-[#ffe5e5]">Classified Defect Analysis Report</h1>
                        <p className="text-[#a37c7c] text-sm mt-1">AI-Generated Bug Triage Summary — <span className="text-[#3FB950]">Real-time Synced</span></p>
                        <p className="text-xs text-[#a37c7c] mt-1 font-code">{now}</p>
                    </div>
                    <button onClick={generatePDF} className="flex items-center gap-2 bg-[#cc0000] hover:bg-[#ff5555] text-white px-4 py-2 rounded-lg text-sm font-ui">
                        <Download size={15} />Generate &amp; Download PDF
                    </button>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">1. Executive Summary</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[['Total Reports', totalDefects.toLocaleString(), '#ff2a2a'], ['Duplicates Found', dupCount.toLocaleString(), '#F85149'], ['Duplicate Rate', `${dupRate}%`, '#D29922'], ['Active Clusters', totalClusters, '#3FB950']].map(([l, v, c]) => (
                            <div key={l} className="bg-[#050000] rounded-lg p-3"><p className="text-xs text-[#a37c7c]">{l}</p><p className="text-xl font-code font-bold mt-1" style={{ color: c }}>{v}</p></div>
                        ))}
                    </div>
                </div>

                {/* Section 2: Cluster Distribution */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">2. Cluster Distribution ({totalClusters} clusters)</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        {Object.entries(clusterDist).sort((a, b) => b[1] - a[1]).map(([id, count], i) => (
                            <div key={id} className="bg-[#050000] rounded-lg p-3 border-l-4" style={{ borderLeftColor: clusterColors[i % clusterColors.length] }}>
                                <p className="text-xs text-[#a37c7c]">Cluster #{id}</p>
                                <p className="text-lg font-code font-bold mt-1" style={{ color: clusterColors[i % clusterColors.length] }}>{count.toLocaleString()}</p>
                                <p className="text-xs text-[#a37c7c]">{totalDefects > 0 ? Math.round(count / totalDefects * 100) : 0}% of total</p>
                            </div>
                        ))}
                    </div>
                    {/* Mini bar chart for clusters */}
                    <div className="bg-[#050000] rounded-lg p-3">
                        {Object.entries(clusterDist).sort((a, b) => b[1] - a[1]).map(([id, count], i) => {
                            const maxCount = Math.max(...Object.values(clusterDist), 1);
                            return (
                                <div key={id} className="flex items-center gap-3 mb-2">
                                    <span className="text-xs text-[#a37c7c] font-code w-20 shrink-0">C#{id}</span>
                                    <div className="flex-1 h-3 bg-[#1a0505] rounded-full overflow-hidden">
                                        <div style={{ width: `${Math.round(count / maxCount * 100)}%`, background: clusterColors[i % clusterColors.length], transition: 'width 0.6s ease' }} className="h-full rounded-full" />
                                    </div>
                                    <span className="text-xs text-[#a37c7c] font-code w-16 text-right">{count.toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 3: Severity Distribution */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">3. Severity Distribution</h3>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                        {Object.entries(sevDist).sort((a, b) => b[1] - a[1]).map(([sev, count]) => {
                            const sc = { blocker: '#F85149', critical: '#F85149', major: '#f0883e', normal: '#D29922', minor: '#3FB950', trivial: '#58a6ff' };
                            return (
                                <div key={sev} className="bg-[#050000] rounded-lg p-2 text-center">
                                    <p className="text-xs text-[#a37c7c] capitalize">{sev}</p>
                                    <p className="text-lg font-code font-bold" style={{ color: sc[sev] || '#a37c7c' }}>{count.toLocaleString()}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 4: Decision Summary */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">4. Decision Triage Summary</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-[#050000] rounded-lg p-3 border-l-4 border-[#F85149]">
                            <p className="text-xs text-[#a37c7c]">Duplicates</p>
                            <p className="text-xl font-code font-bold text-[#F85149]">{dupCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#050000] rounded-lg p-3 border-l-4 border-[#D29922]">
                            <p className="text-xs text-[#a37c7c]">Possible Dups</p>
                            <p className="text-xl font-code font-bold text-[#D29922]">{pDupCount.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#050000] rounded-lg p-3 border-l-4 border-[#3FB950]">
                            <p className="text-xs text-[#a37c7c]">New Defects</p>
                            <p className="text-xl font-code font-bold text-[#3FB950]">{newCount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Section 5: Defects Table */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">5. Defect Records (Top 25)</h3>
                    <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-[#a37c7c] border-b border-[#3a0909]">{['ID', 'Title', 'Severity', 'Decision', 'Cluster'].map(h => <th key={h} className="text-left py-2 px-2">{h}</th>)}</tr></thead><tbody>{defects.slice(0, 25).map(d => <tr key={d.defect_id} className="border-b border-[#1a0505]"><td className="py-2 px-2 font-code text-[#a37c7c]">{d.defect_id}</td><td className="py-2 px-2 text-[#ffe5e5] max-w-[120px] truncate">{d.title}</td><td className="py-2 px-2"><SevBadge sev={d.severity} /></td><td className="py-2 px-2"><DecBadge dec={d.decision} /></td><td className="py-2 px-2 font-code text-[#a37c7c]">{d.cluster_id ?? '—'}</td></tr>)}</tbody></table></div>
                </div>

                {/* Section 6: Report Quality */}
                <div className="mb-5 border border-[#3a0909] rounded-lg p-4">
                    <h3 className="text-sm font-ui font-semibold text-[#ffe5e5] mb-3">6. Report Quality Analysis</h3>
                    <div className="flex gap-4">
                        <div><p className="text-sm text-[#ffe5e5]">Reports with missing fields: <span className="font-code text-[#D29922]">{defects.filter(d => d.missing_fields?.length > 0).length}</span> of {defects.length}</p></div>
                        <div><p className="text-sm text-[#ffe5e5]">Complete reports: <span className="font-code text-[#3FB950]">{defects.filter(d => !d.missing_fields?.length).length}</span></p></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Initial Loader ──────────────────────────────────────────────────────────────
function InitialLoader({ onComplete }) {
    const [step, setStep] = useState(0);
    const [liveData, setLiveData] = useState(null);
    const [clusterCount, setClusterCount] = useState(0);
    const [defectCount, setDefectCount] = useState(0);

    useEffect(() => {
        // Fetch real-time counts for the loader
        API.stats().then(data => {
            if (data) setLiveData(data);
        }).catch(() => { });
    }, []);

    // Animate counters
    useEffect(() => {
        if (!liveData) return;
        const targetClusters = liveData.total_clusters || 8;
        const targetDefects = liveData.total_defects || 10000;
        let frame = 0;
        const totalFrames = 30;
        const timer = setInterval(() => {
            frame++;
            const pct = Math.min(frame / totalFrames, 1);
            setClusterCount(Math.round(pct * targetClusters));
            setDefectCount(Math.round(pct * targetDefects));
            if (frame >= totalFrames) clearInterval(timer);
        }, 60);
        return () => clearInterval(timer);
    }, [liveData]);

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 800),
            setTimeout(() => setStep(2), 1600),
            setTimeout(() => setStep(3), 2600),
            setTimeout(onComplete, 3500)
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[10000] bg-[#050000] flex flex-col items-center justify-center overflow-hidden">
            <div className="scanlines"></div>

            <div className="virtual-dialog w-full max-w-lg mx-4 flex flex-col crt-effect">
                <div className="bg-[#cc0000] px-4 py-2 flex items-center justify-between border-b border-[#ff2a2a]">
                    <div className="flex items-center gap-2 text-white font-code text-sm font-bold tracking-widest">
                        <AlertTriangle size={16} />
                        SYSTEM_OVERRIDE_INIT
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-4 font-code text-sm text-[#ff2a2a]">
                    <h1 className="text-3xl text-center font-bold text-transparent mb-2 glitch-text tracking-widest uppercase"
                        data-text="DEFECT_AI // ONLINE">
                        <span className="text-[#ffe5e5]">DEFECT_AI // ONLINE</span>
                    </h1>

                    {/* Live counter cards */}
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-[#1a0505] border border-[#3a0909] rounded-lg p-3 text-center">
                            <Database size={18} className="mx-auto text-[#ff2a2a] mb-1" />
                            <p className="text-2xl font-bold text-[#ffe5e5]" style={{ fontVariantNumeric: 'tabular-nums' }}>{defectCount.toLocaleString()}</p>
                            <p className="text-xs text-[#a37c7c]">Defects Indexed</p>
                        </div>
                        <div className="bg-[#1a0505] border border-[#3a0909] rounded-lg p-3 text-center">
                            <Cpu size={18} className="mx-auto text-[#D29922] mb-1" />
                            <p className="text-2xl font-bold text-[#ffe5e5]" style={{ fontVariantNumeric: 'tabular-nums' }}>{clusterCount}</p>
                            <p className="text-xs text-[#a37c7c]">Active Clusters</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-h-[100px]">
                        <p className="typing-text" style={{ animationDelay: '0s' }}>&gt; Establishing secure connection...</p>
                        {step >= 1 && <p className="typing-text text-[#ffe5e5]" style={{ animationDelay: '0s' }}>&gt; Authenticating protocols... [OK]</p>}
                        {step >= 2 && <p className="typing-text text-[#D29922]" style={{ animationDelay: '0s' }}>&gt; Indexing {defectCount.toLocaleString()} defects across {clusterCount} clusters... [OK]</p>}
                        {step >= 3 && <p className="typing-text text-[#3FB950] font-bold" style={{ animationDelay: '0s' }}>&gt; ACCESS GRANTED — {clusterCount} clusters online.</p>}
                    </div>

                    <div className="w-full h-1.5 bg-[#1a0505] rounded-full overflow-hidden mt-4">
                        <div className="h-full rounded-full" style={{ animation: 'progressFill 3.4s cubic-bezier(0.4, 0, 0.2, 1) forwards', background: 'linear-gradient(90deg, #ff2a2a, #D29922, #3FB950)' }}></div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 flex flex-col items-center gap-1" style={{ animation: 'bounceDown 1.5s ease infinite' }}>
                <ChevronsDown size={24} className="text-[#ff2a2a]" />
            </div>
        </div>
    );
}

// ── Smart Cluster Chatbot ─────────────────────────────────────────────────────
function ClusterChatbot({ stats, clusters }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ sender: 'bot', text: 'Hello! I can answer questions about the bug datasets, clusters, severity, projects and more. Try asking:\n• "How many defects?"\n• "Show cluster distribution"\n• "What is Cassandra?"\n• "Search login issues"' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef(null);

    useEffect(() => { if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const q = input.trim().toLowerCase();
        const userMsg = input.trim();
        setMessages(m => [...m, { sender: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Try to answer intelligently using backend data
        let response = '';
        try {
            // Fetch live stats for every query
            const liveStats = await API.stats();
            const s = liveStats || stats || {};
            const sevDist = s.severity_distribution || {};
            const clusterDist = s.cluster_distribution || {};
            const decDist = s.decision_distribution || {};
            const totalDef = s.total_defects || 0;
            const totalClusters = s.total_clusters || 0;

            if (q.includes('cluster') && (q.includes('show') || q.includes('dist') || q.includes('break'))) {
                const entries = Object.entries(clusterDist).sort((a, b) => b[1] - a[1]);
                response = `📊 Cluster Distribution (${totalClusters} clusters):\n${entries.map(([id, cnt]) => `  Cluster #${id}: ${cnt.toLocaleString()} defects (${Math.round(cnt / totalDef * 100)}%)`).join('\n')}`;
            } else if (q.includes('cluster')) {
                response = `We have ${totalClusters} active clusters across ${totalDef.toLocaleString()} defects.\n\nCluster categories:\n• C1: Security & Authentication Failures\n• C2: UI Rendering & Visual Layout Bugs\n• C3: Performance Degradation & Latency\n• C4: Data Corruption & Processing Errors\n• C5: Network, API & Connectivity Issues\n• C6: Build, Deployment & Configuration\n• C7: Memory Leaks & Resource Exhaustion\n• C8: Application Crashes & System Stability`;
            } else if (q.includes('sever') || q.includes('priority')) {
                const entries = Object.entries(sevDist).sort((a, b) => b[1] - a[1]);
                response = `🔴 Severity Distribution:\n${entries.map(([sev, cnt]) => `  ${sev}: ${cnt.toLocaleString()} (${Math.round(cnt / totalDef * 100)}%)`).join('\n')}\n\nTotal: ${totalDef.toLocaleString()} defects`;
            } else if (q.includes('decision') || q.includes('duplic') || q.includes('triage')) {
                response = `🎯 Decision Triage:\n  Duplicates: ${(decDist.duplicate || 0).toLocaleString()}\n  Possible Duplicates: ${(decDist.possible_duplicate || 0).toLocaleString()}\n  New Defects: ${(decDist.new_defect || 0).toLocaleString()}\n\nDuplicate Rate: ${totalDef ? Math.round((decDist.duplicate || 0) / totalDef * 100) : 0}%`;
            } else if (q.includes('total') || q.includes('how many') || q.includes('count') || q.includes('stat')) {
                response = `📈 System Statistics:\n  Total Defects: ${totalDef.toLocaleString()}\n  Active Clusters: ${totalClusters}\n  Severity Levels: ${Object.keys(sevDist).length}\n  Duplicate Rate: ${totalDef ? Math.round((decDist.duplicate || 0) / totalDef * 100) : 0}%`;
            } else if (q.includes('cassandra')) {
                response = `Apache Cassandra is a distributed NoSQL database. Our dataset includes bug reports from the Apache Cassandra Jira tracker covering issues like data consistency, node failures, and query performance.`;
            } else if (q.includes('firefox') || q.includes('mozilla')) {
                response = `Mozilla Firefox bugs come from Bugzilla. The dataset covers browser rendering issues, JavaScript engine bugs, memory leaks, and UI problems in the Firefox web browser.`;
            } else if (q.includes('hadoop')) {
                response = `Apache Hadoop is a big data framework. Our dataset includes Jira issues related to MapReduce, HDFS, YARN, and distributed computing problems.`;
            } else if (q.includes('spark')) {
                response = `Apache Spark is a data processing engine. Bug reports cover streaming, SQL, MLlib, and cluster management issues from the Apache Jira tracker.`;
            } else if (q.includes('vscode') || q.includes('vs code') || q.includes('visual studio code')) {
                response = `VS Code bugs come from GitHub Issues. They cover extension problems, editor performance, IntelliSense issues, and debugging failures.`;
            } else if (q.includes('hbase')) {
                response = `Apache HBase is a NoSQL database for Hadoop. Bug reports cover region server crashes, compaction issues, and replication problems.`;
            } else if (q.includes('thunderbird')) {
                response = `Mozilla Thunderbird is an email client. Bug reports from Bugzilla cover email rendering, IMAP/POP3 issues, calendar problems, and UI bugs.`;
            } else if (q.includes('dataset') || q.includes('project') || q.includes('source')) {
                response = `📦 Our datasets come from 9 major open-source projects:\n1. Apache Cassandra (Database)\n2. Mozilla Firefox (Browser)\n3. Apache Hadoop (Big Data)\n4. Apache HBase (NoSQL)\n5. Mozilla Core (Browser Engine)\n6. VS Code (Editor)\n7. SeaMonkey (Internet Suite)\n8. Apache Spark (Data Processing)\n9. Thunderbird (Email Client)\n\nPlus a Bugzilla severity/fix-time dataset.`;
            } else if (q.includes('search') || q.includes('find') || q.includes('look')) {
                // Use the search API
                const searchTerm = userMsg.replace(/search|find|look for|look up/gi, '').trim();
                if (searchTerm) {
                    const results = await API.search(searchTerm, 5);
                    if (results?.results?.length > 0) {
                        response = `🔍 Found ${results.results.length} matches for "${searchTerm}":\n${results.results.slice(0, 5).map((r, i) => `  ${i + 1}. ${r.defect_id}: ${r.title} (${Math.round((r.similarity_score || 0) * 100)}% match)`).join('\n')}`;
                    } else {
                        response = `No results found for "${searchTerm}". Try different keywords.`;
                    }
                } else {
                    response = 'What would you like me to search for? Example: "search login error"';
                }
            } else if (q.includes('help') || q.includes('what can')) {
                response = `I can help with:\n• 📊 "Show cluster distribution"\n• 🔴 "What are the severity levels?"\n• 🎯 "Show decision triage"\n• 📈 "How many total defects?"\n• 🔍 "Search login issues"\n• 📦 "What datasets are used?"\n• 💬 Ask about specific projects (Cassandra, Firefox, Hadoop, etc.)`;
            } else {
                // Try semantic search as fallback
                try {
                    const results = await API.search(userMsg, 3);
                    if (results?.results?.length > 0) {
                        response = `I found some related defects:\n${results.results.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.defect_id}: ${r.title}`).join('\n')}\n\nTry "help" to see all available commands.`;
                    } else {
                        response = "I couldn't find a match. Try asking about clusters, severity, datasets, or use \"search <keyword>\" to find specific bugs.";
                    }
                } catch {
                    response = "I'm not sure about that. Try asking about 'clusters', 'severity', 'datasets', or type 'help'.";
                }
            }
        } catch {
            response = "Backend is offline. I can answer basic questions once it's connected.";
        }

        setIsTyping(false);
        setMessages(m => [...m, { sender: 'bot', text: response }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9900]">
            <button onClick={() => setIsOpen(!isOpen)} className={`w-14 h-14 bg-[#cc0000] hover:bg-[#ff5555] rounded-full flex items-center justify-center shadow-2xl transition-transform ${isOpen ? 'scale-0' : 'scale-100'}`} style={{ boxShadow: '0 0 20px rgba(204,0,0,0.4)' }}>
                <MessageSquare size={24} className="text-white" />
            </button>
            <div className={`absolute bottom-0 right-0 w-96 bg-[#0f0202] border border-[#3a0909] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all origin-bottom-right duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`} style={{ height: '480px' }}>
                <div className="bg-[#1a0505] border-b border-[#3a0909] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal size={16} className="text-[#ff2a2a]" />
                        <span className="font-ui font-bold text-sm text-[#ffe5e5]">DefectAI Assistant</span>
                        <span className="text-xs bg-[#330000] text-[#ff2a2a] px-1.5 py-0.5 rounded font-code">LIVE</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-[#a37c7c] hover:text-[#ffe5e5]"><X size={16} /></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm font-ui whitespace-pre-line ${m.sender === 'user' ? 'bg-[#330000] text-[#ffe5e5]' : 'bg-[#1a0505] border border-[#3a0909] text-[#a37c7c]'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && <div className="flex justify-start"><div className="bg-[#1a0505] border border-[#3a0909] rounded-xl px-3 py-2 text-sm text-[#a37c7c]"><Loader2 size={14} className="inline animate-spin mr-1" />Thinking...</div></div>}
                    <div ref={endRef} />
                </div>
                <div className="p-3 border-t border-[#3a0909] bg-[#050000] flex items-center gap-2">
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about clusters, severity, datasets..." className="flex-1 bg-transparent border-none outline-none text-sm font-ui text-[#ffe5e5] placeholder-[#a37c7c]" />
                    <button onClick={handleSend} disabled={!input.trim() || isTyping} className="text-[#ff2a2a] hover:text-[#ff5555] disabled:opacity-50"><Send size={18} /></button>
                </div>
            </div>
        </div>
    );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
    const [showLoader, setShowLoader] = useState(true);
    const [activePage, setActivePage] = useState('dashboard');
    const [defects, setDefects] = useState(MOCK_DEFECTS);
    const [stats, setStats] = useState(MOCK_STATS);
    const [result, setResult] = useState(null);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [loadedReport, setLoadedReport] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [statsData, defectsData] = await Promise.all([
                    API.stats(),
                    API.defects({ per_page: 50 })
                ]);
                if (statsData) setStats(statsData);
                if (defectsData?.defects?.length > 0) setDefects(defectsData.defects);
                showToast('Connected to backend', 'success');
            } catch {
                showToast('Demo mode — backend offline', 'info');
            } finally { setIsLoading(false); }
        })();
    }, []);

    const setPage = (page) => { setActivePage(page); window.scrollTo(0, 0); };

    const dupCountApp = stats.decision_distribution?.duplicate || 0;
    const pDupCountApp = stats.decision_distribution?.possible_duplicate || 0;
    const newDCountApp = stats.decision_distribution?.new_defect || 0;

    const pageProps = { setPage, showToast, defects, stats, result, setResult, selectedCluster, setSelectedCluster, loadedReport, setLoadedReport };

    return (
        <div className="min-h-screen bg-[#050000] text-[#ffe5e5] font-ui flex relative">
            {showLoader && <InitialLoader onComplete={() => setShowLoader(false)} />}
            <Sidebar active={activePage} setPage={setPage} />
            <main className="flex-1 ml-[240px] min-h-screen overflow-x-hidden">
                {isLoading && !showLoader && <LoadingOverlay text="Connecting to DefectAI..." />}
                {activePage === 'dashboard' && <Dashboard {...pageProps} />}
                {activePage === 'submit' && <SubmitReport {...pageProps} />}
                {activePage === 'results' && <ResultsPage {...pageProps} />}
                {activePage === 'reports' && <AllReports {...pageProps} />}
                {activePage === 'clusters' && <ClustersPage {...pageProps} />}
                {activePage === 'pdf' && <PDFPage defects={defects} result={result} setPage={setPage} />}
            </main>
            {!showLoader && <ClusterChatbot stats={{ ...stats, decision_distribution: { duplicate: dupCountApp, possible_duplicate: pDupCountApp, new_defect: newDCountApp } }} clusters={[]} />}
            <ToastContainer toasts={toasts} />
        </div>
    );
}



