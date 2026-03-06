/**
 * DefectLens — Duplicate Defect Finder & Bug Report Enhancer
 * Frontend Application Logic
 */

const API_BASE = 'http://localhost:5000/api';

// ─── State ───────────────────────────────────────────────────────────────────
let currentTab = 'analyzer';
let currentPage = 1;
let totalPages = 1;
let dashboardLoaded = false;
let explorerLoaded = false;

// ─── Tab Navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        switchTab(tab);
    });
});

function switchTab(tab) {
    currentTab = tab;
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${tab}`).classList.add('active');

    // Lazy-load tab data
    if (tab === 'dashboard' && !dashboardLoaded) loadDashboard();
    if (tab === 'explorer' && !explorerLoaded) loadExplorer();
}

// ─── Analyzer Form ───────────────────────────────────────────────────────────
document.getElementById('defect-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await analyzeDefect();
});

async function analyzeDefect() {
    const data = {
        title: document.getElementById('input-title').value.trim(),
        description: document.getElementById('input-description').value.trim(),
        steps: document.getElementById('input-steps').value.trim(),
        expected: document.getElementById('input-expected').value.trim(),
        actual: document.getElementById('input-actual').value.trim(),
        environment: document.getElementById('input-environment').value.trim(),
        logs: document.getElementById('input-logs').value.trim(),
    };

    if (!data.title && !data.description) {
        showToast('Please provide at least a title or description');
        return;
    }

    // Show loading
    showLoadingState();

    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Analysis failed');
        }

        const result = await response.json();
        showResults(result);
    } catch (error) {
        console.error('Analysis error:', error);
        showToast(`Error: ${error.message}`);
        hideLoading();
    }
}

function showLoadingState() {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');

    // Animate loading steps
    const steps = document.querySelectorAll('.load-step');
    steps.forEach(s => { s.classList.remove('active', 'done'); });

    let i = 0;
    const stepInterval = setInterval(() => {
        if (i > 0 && i <= steps.length) {
            steps[i - 1].classList.remove('active');
            steps[i - 1].classList.add('done');
        }
        if (i < steps.length) {
            steps[i].classList.add('active');
        }
        i++;
        if (i > steps.length) clearInterval(stepInterval);
    }, 400);
}

function hideLoading() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
}

function showResults(result) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('results-content').classList.remove('hidden');

    // Decision Banner
    const banner = document.getElementById('decision-banner');
    banner.className = `decision-banner ${result.decision}`;

    const iconEl = document.getElementById('decision-icon');
    const textEl = document.getElementById('decision-text');
    const detailEl = document.getElementById('decision-detail');

    const decisionConfig = {
        duplicate: {
            icon: '🔴',
            text: 'Duplicate Detected',
            detail: 'This defect closely matches existing reports in the database',
        },
        possible_duplicate: {
            icon: '🟡',
            text: 'Possible Duplicate',
            detail: 'This defect may be related to existing reports — manual review recommended',
        },
        new_defect: {
            icon: '🟢',
            text: 'New Defect',
            detail: 'No similar defects found — this appears to be a new unique report',
        },
    };

    const config = decisionConfig[result.decision] || decisionConfig.new_defect;
    iconEl.textContent = config.icon;
    textEl.textContent = config.text;
    detailEl.textContent = config.detail;

    // Confidence
    const confPercent = Math.round(result.confidence * 100);
    document.getElementById('confidence-value').textContent = `${confPercent}%`;
    setTimeout(() => {
        document.getElementById('confidence-fill').style.width = `${confPercent}%`;
    }, 100);

    // Cluster
    document.getElementById('cluster-badge').textContent =
        result.cluster_id >= 0 ? `Cluster #${result.cluster_id}` : 'Unclustered';

    const clusterDesc = result.cluster_id >= 0
        ? `Assigned to cluster group ${result.cluster_id} based on content similarity.`
        : 'Not assigned to any existing cluster. This may form a new grouping.';
    document.getElementById('cluster-description').textContent = clusterDesc;

    // Top Matches
    const matchesList = document.getElementById('matches-list');
    const matchCount = document.getElementById('match-count');
    matchesList.innerHTML = '';

    if (result.top_matches && result.top_matches.length > 0) {
        matchCount.textContent = `${result.top_matches.length} match${result.top_matches.length > 1 ? 'es' : ''}`;
        result.top_matches.forEach(match => {
            const scoreClass = match.similarity_score >= 0.75 ? 'high' :
                match.similarity_score >= 0.5 ? 'medium' : 'low';
            const el = document.createElement('div');
            el.className = 'match-item';
            el.onclick = () => viewDefect(match.defect_id);
            el.innerHTML = `
                <div class="match-rank">${match.rank}</div>
                <div class="match-info">
                    <div class="match-title">${escapeHtml(match.title || 'Untitled')}</div>
                    <div class="match-meta">
                        <span>${match.defect_id}</span>
                        <span>•</span>
                        <span>${match.severity || 'unknown'}</span>
                        <span>•</span>
                        <span>Cluster ${match.cluster_id}</span>
                    </div>
                </div>
                <div class="match-score ${scoreClass}">${Math.round(match.similarity_score * 100)}%</div>
            `;
            matchesList.appendChild(el);
        });
    } else {
        matchCount.textContent = '0 matches';
        matchesList.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.85rem;">No similar defects found in the database.</p>';
    }

    // Missing Fields
    const missingList = document.getElementById('missing-fields-list');
    const missingCount = document.getElementById('missing-count');
    missingList.innerHTML = '';

    if (result.missing_fields && result.missing_fields.length > 0) {
        missingCount.textContent = result.missing_fields.length;
        result.missing_fields.forEach(mf => {
            const el = document.createElement('div');
            el.className = 'missing-field-item';
            el.innerHTML = `
                <div class="missing-field-icon">⚡</div>
                <div class="missing-field-info">
                    <div class="missing-field-name">${escapeHtml(mf.label)}</div>
                    <div class="missing-field-suggestion">${escapeHtml(mf.suggestion)}</div>
                </div>
            `;
            missingList.appendChild(el);
        });
    } else {
        missingCount.textContent = '0';
        missingList.innerHTML = '<p style="color: var(--accent-emerald); font-size: 0.85rem;">✓ All recommended fields are present!</p>';
    }

    // Improved Report
    const reportEl = document.getElementById('improved-report');
    const improved = result.improved_report || {};
    reportEl.innerHTML = `
        <div class="report-field">
            <div class="field-label">Enhanced Title</div>
            <div class="field-value">${escapeHtml(improved.title || 'N/A')}</div>
        </div>
        <div class="report-field">
            <div class="field-label">AI Summary</div>
            <div class="field-value">${escapeHtml(improved.summary || 'N/A')}</div>
        </div>
        <div class="report-field">
            <div class="field-label">Suggested Severity</div>
            <div class="field-value">${escapeHtml(improved.suggested_severity || 'normal')}</div>
        </div>
        ${improved.suggested_cluster >= 0 ? `
        <div class="report-field">
            <div class="field-label">Suggested Cluster</div>
            <div class="field-value">Cluster #${improved.suggested_cluster}</div>
        </div>` : ''}
    `;

    // Scroll to results on mobile
    if (window.innerWidth <= 1100) {
        document.getElementById('results-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        if (!res.ok) throw new Error('Failed to load stats');
        const stats = await res.json();

        // Update stat cards
        document.getElementById('stat-total').textContent = stats.total_defects?.toLocaleString() || '—';
        document.getElementById('stat-clusters').textContent = stats.total_clusters?.toLocaleString() || '—';
        document.getElementById('stat-dimension').textContent = stats.embedding_dimension || '—';

        // Calculate avg missing fields
        const missingDist = stats.missing_field_distribution || {};
        const totalMissing = Object.values(missingDist).reduce((a, b) => a + b, 0);
        const avgMissing = stats.total_defects > 0 ? (totalMissing / stats.total_defects).toFixed(1) : '—';
        document.getElementById('stat-missing').textContent = avgMissing;

        // Severity Chart
        renderBarChart('severity-chart', stats.severity_distribution || {}, [
            '#f43f5e', '#fb7185', '#f97316', '#60a5fa', '#34d399', '#9ca3af'
        ]);

        // Cluster Chart (top 10)
        const clusters = stats.cluster_distribution || {};
        const topClusters = Object.entries(clusters)
            .filter(([k]) => k !== '-1')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((obj, [k, v]) => ({ ...obj, [k === '-1' ? 'Noise' : `Cluster ${k}`]: v }), {});
        renderBarChart('cluster-chart', topClusters, [
            '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe',
            '#60a5fa', '#38bdf8', '#22d3ee', '#2dd4bf', '#34d399'
        ]);

        // Missing Fields Chart
        renderBarChart('missing-chart', missingDist, [
            '#fbbf24', '#f97316', '#fb7185', '#a855f7', '#6366f1', '#60a5fa', '#34d399'
        ]);

        dashboardLoaded = true;
    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Failed to load dashboard data. Is the backend running?');
    }
}

function renderBarChart(containerId, data, colors) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = Object.entries(data);
    if (entries.length === 0) {
        container.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.85rem; padding: 20px;">No data available</p>';
        return;
    }

    const maxVal = Math.max(...entries.map(([, v]) => v));

    let html = '<div class="chart-bar-group">';
    entries.forEach(([label, value], i) => {
        const pct = maxVal > 0 ? (value / maxVal * 100) : 0;
        const color = colors[i % colors.length];
        html += `
            <div class="chart-bar-item">
                <div class="chart-bar-label">${escapeHtml(label)}</div>
                <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width: 0%; background: ${color};" data-width="${pct}%">
                        ${value.toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;

    // Animate bars
    requestAnimationFrame(() => {
        container.querySelectorAll('.chart-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    });
}

// ─── Explorer ────────────────────────────────────────────────────────────────
let searchTimeout;

document.getElementById('explorer-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadExplorer();
    }, 400);
});

document.getElementById('filter-severity')?.addEventListener('change', () => {
    currentPage = 1;
    loadExplorer();
});

document.getElementById('filter-cluster')?.addEventListener('change', () => {
    currentPage = 1;
    loadExplorer();
});

async function loadExplorer() {
    try {
        const query = document.getElementById('explorer-search')?.value || '';
        const severity = document.getElementById('filter-severity')?.value || '';
        const cluster = document.getElementById('filter-cluster')?.value || '';

        const params = new URLSearchParams({
            page: currentPage,
            per_page: 20,
        });
        if (query) params.append('q', query);
        if (severity) params.append('severity', severity);
        if (cluster) params.append('cluster_id', cluster);

        const res = await fetch(`${API_BASE}/defects?${params}`);
        if (!res.ok) throw new Error('Failed to load defects');
        const data = await res.json();

        totalPages = data.total_pages;
        renderDefectTable(data.defects);
        renderPagination(data);

        explorerLoaded = true;
    } catch (error) {
        console.error('Explorer error:', error);
        showToast('Failed to load defect data.');
    }
}

function renderDefectTable(defects) {
    const tbody = document.getElementById('defect-tbody');
    if (!tbody) return;

    if (!defects || defects.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-tertiary); padding: 40px;">
                    No defects found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = defects.map(d => {
        const sevClass = `severity-${(d.severity || 'normal').toLowerCase()}`;
        const missingBadgeClass = d.missing_count <= 1 ? 'good' : '';
        return `
            <tr>
                <td><span class="defect-id">${escapeHtml(d.defect_id)}</span></td>
                <td style="max-width: 300px;">
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(d.title || 'Untitled')}
                    </div>
                </td>
                <td><span class="severity-badge ${sevClass}">${escapeHtml(d.severity || 'unknown')}</span></td>
                <td><span class="cluster-tag">${d.cluster_id >= 0 ? '#' + d.cluster_id : '—'}</span></td>
                <td><span class="missing-badge ${missingBadgeClass}">${d.missing_count}</span></td>
                <td><button class="btn-view" onclick="viewDefect('${d.defect_id}')">View</button></td>
            </tr>
        `;
    }).join('');
}

function renderPagination(data) {
    const container = document.getElementById('pagination');
    if (!container) return;

    let html = '';

    // Prev button
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

    // Page numbers
    const maxVisible = 7;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(data.total_pages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<span class="page-info">...</span>`;
    }

    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (end < data.total_pages) {
        if (end < data.total_pages - 1) html += `<span class="page-info">...</span>`;
        html += `<button class="page-btn" onclick="goToPage(${data.total_pages})">${data.total_pages}</button>`;
    }

    // Next button
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage >= data.total_pages ? 'disabled' : ''}>›</button>`;

    // Info
    html += `<span class="page-info">${data.total.toLocaleString()} total</span>`;

    container.innerHTML = html;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadExplorer();
    document.getElementById('panel-explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Defect Detail Modal ─────────────────────────────────────────────────────
async function viewDefect(defectId) {
    try {
        const res = await fetch(`${API_BASE}/defect/${defectId}`);
        if (!res.ok) throw new Error('Defect not found');
        const defect = await res.json();

        const modal = document.getElementById('defect-modal');
        const body = document.getElementById('modal-body');

        body.innerHTML = `
            <h2>${escapeHtml(defect.title || 'Untitled Bug Report')}</h2>
            <div class="modal-meta">
                <span class="modal-meta-item">🆔 ${defect.defect_id}</span>
                <span class="modal-meta-item severity-badge severity-${(defect.severity || 'normal').toLowerCase()}">
                    ${defect.severity || 'unknown'}
                </span>
                <span class="modal-meta-item">🔗 Cluster ${defect.cluster_id >= 0 ? '#' + defect.cluster_id : 'Unassigned'}</span>
                ${defect.fixing_time ? `<span class="modal-meta-item">⏱ Fix time: ${defect.fixing_time}</span>` : ''}
            </div>

            ${defect.raw_description ? `
            <div class="modal-section">
                <div class="modal-section-title">Description</div>
                <div class="modal-section-content">${escapeHtml(defect.raw_description)}</div>
            </div>` : ''}

            ${defect.steps ? `
            <div class="modal-section">
                <div class="modal-section-title">Steps to Reproduce</div>
                <div class="modal-section-content">${escapeHtml(defect.steps)}</div>
            </div>` : ''}

            ${defect.expected ? `
            <div class="modal-section">
                <div class="modal-section-title">Expected Result</div>
                <div class="modal-section-content">${escapeHtml(defect.expected)}</div>
            </div>` : ''}

            ${defect.actual ? `
            <div class="modal-section">
                <div class="modal-section-title">Actual Result</div>
                <div class="modal-section-content">${escapeHtml(defect.actual)}</div>
            </div>` : ''}

            ${defect.environment ? `
            <div class="modal-section">
                <div class="modal-section-title">Environment</div>
                <div class="modal-section-content">${escapeHtml(defect.environment)}</div>
            </div>` : ''}

            ${defect.logs ? `
            <div class="modal-section">
                <div class="modal-section-title">Logs / Stack Trace</div>
                <div class="modal-section-content" style="font-family: var(--font-mono); font-size: 0.8rem;">${escapeHtml(defect.logs)}</div>
            </div>` : ''}

            ${defect.improved_summary ? `
            <div class="modal-section">
                <div class="modal-section-title">AI-Enhanced Summary</div>
                <div class="modal-section-content" style="border-left: 3px solid var(--accent-indigo);">${escapeHtml(defect.improved_summary)}</div>
            </div>` : ''}

            ${defect.missing_fields && defect.missing_fields.length > 0 ? `
            <div class="modal-section">
                <div class="modal-section-title">Missing Fields (${defect.missing_fields.length})</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${defect.missing_fields.map(f => `
                        <span class="modal-meta-item" style="background: rgba(251,191,36,0.1); color: var(--accent-amber);">
                            ⚠️ ${escapeHtml(f)}
                        </span>
                    `).join('')}
                </div>
            </div>` : ''}
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('View defect error:', error);
        showToast('Failed to load defect details');
    }
}

function closeModal() {
    document.getElementById('defect-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('defect-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'defect-modal') closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ─── Form Helpers ────────────────────────────────────────────────────────────
function clearForm() {
    document.getElementById('defect-form').reset();
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('confidence-fill').style.width = '0%';
}

function loadSample() {
    document.getElementById('input-title').value = 'Page Source window does not respond to keyboard shortcuts';
    document.getElementById('input-description').value = 'When viewing the Page Source window, pressing keyboard shortcuts like Ctrl+A or Ctrl+C does not work. The shortcuts that work in the main browser window should also work in the Page Source window.';
    document.getElementById('input-steps').value = '1. Open any webpage in Firefox\n2. Right-click and select "View Page Source"\n3. In the Page Source window, try pressing Ctrl+A to select all text\n4. Try Ctrl+C to copy selected text';
    document.getElementById('input-expected').value = 'Keyboard shortcuts should work in the Page Source window the same way they work in the main browser window.';
    document.getElementById('input-actual').value = 'Keyboard shortcuts have no effect in the Page Source window. Cannot select or copy text using keyboard.';
    document.getElementById('input-environment').value = 'OS: Windows 10\nBrowser: Mozilla Firefox Nightly\nBuild ID: 2019120102';
    document.getElementById('input-logs').value = '';
    showToast('Sample defect report loaded');
}

function copyImprovedReport() {
    const reportEl = document.getElementById('improved-report');
    const text = reportEl?.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
        showToast('Report copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

// ─── Utilities ───────────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─── Health Check ────────────────────────────────────────────────────────────
async function checkBackendStatus() {
    const indicator = document.getElementById('status-indicator');
    try {
        const res = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            indicator.className = 'status-indicator';
            indicator.querySelector('span').textContent = 'System Ready';
        } else {
            throw new Error('Backend error');
        }
    } catch {
        indicator.className = 'status-indicator error';
        indicator.querySelector('span').textContent = 'Backend Offline';
    }
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    // Re-check every 30s
    setInterval(checkBackendStatus, 30000);
});
