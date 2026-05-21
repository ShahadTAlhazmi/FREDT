/* =====================================================
   Role permissions logic
   ===================================================== */

var RPT_ROLE_ICONS = {
    Admin:   '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d6b4f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    Manager: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    Safety:  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
};

var RPT_PERM_ICONS = {
    allow: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>',
    deny:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
};

var RPT_ROLE_DATA = {
    Admin: {
        icon:  RPT_ROLE_ICONS.Admin,
        desc:  'Full system access — view, export, and manage all historical reports.',
        perms: [
            ['allow', 'View all reports'],
            ['allow', 'Export CSV'],
            ['allow', 'Export PDF'],
            ['allow', 'Clear all reports'],
            ['allow', 'Use filters & search'],
            ['allow', 'View report details']
        ]
    },
    Manager: {
        icon:  RPT_ROLE_ICONS.Manager,
        desc:  'View and export reports only — management actions restricted.',
        perms: [
            ['allow', 'View all reports'],
            ['allow', 'Export CSV'],
            ['allow', 'Export PDF'],
            ['deny',  'Clear all reports'],
            ['allow', 'Use filters & search'],
            ['allow', 'View report details']
        ]
    },
    Safety: {
        icon:  RPT_ROLE_ICONS.Safety,
        desc:  'Safety monitoring access — limited to viewing last 7 days only.',
        perms: [
            ['allow', 'View reports (last 7 days)'],
            ['deny',  'Export CSV'],
            ['deny',  'Export PDF'],
            ['deny',  'Clear all reports'],
            ['deny',  'Use advanced filters'],
            ['allow', 'View report details']
        ]
    }
};

var REPORTS_ROLE_PERMISSIONS = {
    Admin: {
        bannerClass:     'admin',
        bannerText:      'Full access — view, export, and manage all historical reports',
        canExportCSV:    true,
        canExportPDF:    true,
        canClearReports: true,
        canSearch:       true,
        canFilter:       true,
        canViewDetails:  true,
        canViewAllDays:  true,
        badgeClass:      'badge-admin',
        badgeLabel:      'Admin Mode',
        roleText:        'System Admin',
        roleBadge:       'ADMIN',
        footerBg:        '#eff6ff',
        footerColor:     '#1d4ed8',
        footerBorder:    '#bfdbfe'
    },
    Manager: {
        bannerClass:     'manager',
        bannerText:      'Manager access — view and export reports only, management actions restricted',
        canExportCSV:    true,
        canExportPDF:    true,
        canClearReports: false,
        canSearch:       true,
        canFilter:       true,
        canViewDetails:  true,
        canViewAllDays:  true,
        badgeClass:      'badge-manager',
        badgeLabel:      'Manager Mode',
        roleText:        'Building Manager',
        roleBadge:       'MGR',
        footerBg:        '#fffbeb',
        footerColor:     '#92400e',
        footerBorder:    '#fde68a'
    },
    Safety: {
        bannerClass:     'safety',
        bannerText:      'Safety monitoring access — limited to viewing last 7 days, no export or management',
        canExportCSV:    false,
        canExportPDF:    false,
        canClearReports: false,
        canSearch:       true,
        canFilter:       false,
        canViewDetails:  true,
        canViewAllDays:  false,
        badgeClass:      'badge-safety',
        badgeLabel:      'Safety Mode',
        roleText:        'Safety Officer',
        roleBadge:       'SAFETY',
        footerBg:        '#f0fdf4',
        footerColor:     '#166534',
        footerBorder:    '#bbf7d0'
    }
};

var currentReportsRole = 'Admin';

// Implementation note
var _lastMetrics = null;
var _metricsUpdateCount = 0;

/* ════════════════════════════════════════
   APPLY ROLE PERMISSIONS
   ════════════════════════════════════════ */
function applyReportsRolePermissions(role) {
    var cfg = REPORTS_ROLE_PERMISSIONS[role] || REPORTS_ROLE_PERMISSIONS['Admin'];
    currentReportsRole = role;

    var pageBanner = document.getElementById('rptPageBanner');
    if (pageBanner) { pageBanner.className = 'rpt-permissions-banner ' + cfg.bannerClass; pageBanner.textContent = cfg.bannerText; }

    var headerBanner = document.getElementById('rptPermissionsBanner');
    if (headerBanner) { headerBanner.className = 'permissions-banner ' + cfg.bannerClass; headerBanner.textContent = cfg.bannerText; }

    var exportBtn = document.getElementById('btnExportCSV');
    if (exportBtn) { exportBtn.disabled = !cfg.canExportCSV; exportBtn.style.opacity = cfg.canExportCSV ? '1' : '0.38'; exportBtn.style.cursor = cfg.canExportCSV ? 'pointer' : 'not-allowed'; exportBtn.title = cfg.canExportCSV ? '' : 'Not available for ' + role + ' role'; }

    var clearBtn = document.getElementById('btnClearReports');
    if (clearBtn) { clearBtn.disabled = !cfg.canClearReports; clearBtn.style.opacity = cfg.canClearReports ? '1' : '0.38'; clearBtn.style.cursor = cfg.canClearReports ? 'pointer' : 'not-allowed'; clearBtn.title = cfg.canClearReports ? '' : 'Not available for ' + role + ' role'; }

    var searchInput = document.getElementById('dateSearch');
    if (searchInput) { searchInput.disabled = !cfg.canSearch; searchInput.style.opacity = cfg.canSearch ? '1' : '0.4'; searchInput.placeholder = cfg.canSearch ? 'Search reports...' : 'Search disabled for ' + role; }

    ['severityFilter', 'buildingFilter'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.disabled = !cfg.canFilter; el.style.opacity = cfg.canFilter ? '1' : '0.4'; el.style.cursor = cfg.canFilter ? 'pointer' : 'not-allowed';
    });

    var dateBtn = document.getElementById('btnDateRange');
    if (dateBtn) { dateBtn.disabled = !cfg.canFilter; dateBtn.style.opacity = cfg.canFilter ? '1' : '0.4'; dateBtn.style.cursor = cfg.canFilter ? 'pointer' : 'not-allowed'; if (!cfg.canFilter) closeDatePicker(); }

    document.querySelectorAll('.rpt-view-btn').forEach(function (btn) {
        btn.disabled = !cfg.canViewDetails; btn.style.opacity = cfg.canViewDetails ? '1' : '0.38'; btn.style.cursor = cfg.canViewDetails ? 'pointer' : 'not-allowed';
        if (!cfg.canViewDetails) btn.title = 'Not available for ' + role + ' role';
    });

    document.querySelectorAll('.rpt-icon-btn[title="Download PDF"]').forEach(function (btn) {
        btn.disabled = !cfg.canExportPDF; btn.style.opacity = cfg.canExportPDF ? '1' : '0.38'; btn.style.cursor = cfg.canExportPDF ? 'pointer' : 'not-allowed';
        if (!cfg.canExportPDF) btn.title = 'PDF export not available for ' + role + ' role';
    });

    _filterRowsByRole(cfg);

    var footerBadge = document.getElementById('rptFooterRoleBadge');
    if (footerBadge) { footerBadge.className = 'rpt-footer-badge ' + cfg.badgeClass; footerBadge.textContent = cfg.badgeLabel; }

    _updateFooterRoleIndicator(role, cfg);

    var tabColors = { Admin: '#0d6b4f', Manager: '#1d4ed8', Safety: '#166534' };
    document.querySelectorAll('#roleTabs .role-tab').forEach(function (tab) {
        var isActive = tab.textContent.trim() === role;
        tab.classList.toggle('active', isActive);
        tab.style.color      = isActive ? (tabColors[role] || '') : '';
        tab.style.fontWeight = isActive ? '700' : '';
    });

    _setText('dropdownRoleText',  cfg.roleText);
    _setText('dropdownRoleBadge', cfg.roleBadge);
    _setText('sidebarRole',       cfg.roleText);
    updateVisibleCount();
}

function _updateFooterRoleIndicator(role, cfg) {
    var el = document.getElementById('footerRoleIndicator');
    if (!el) return;
    var icons = {
        Admin:   '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        Manager: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        Safety:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    };
    el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' + (icons[role] || icons['Admin']) + '</svg>\u00a0' + cfg.badgeLabel;
    el.style.background = cfg.footerBg;
    el.style.color      = cfg.footerColor;
    el.style.border     = '1px solid ' + cfg.footerBorder;
}

function _filterRowsByRole(cfg) {
    var rows = document.querySelectorAll('#reportsTable tbody tr.report-row');
    if (!cfg.canViewAllDays) {
        var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        rows.forEach(function (row) {
            var dateAttr = row.getAttribute('data-date'); if (!dateAttr) return;
            var tooOld = new Date(dateAttr) < cutoff;
            row.classList.toggle('rpt-row-locked', tooOld);
            var viewBtn = row.querySelector('.rpt-view-btn');
            if (viewBtn && tooOld) { viewBtn.disabled = true; viewBtn.title = 'Safety role: only last 7 days accessible'; viewBtn.style.opacity = '0.38'; viewBtn.style.cursor = 'not-allowed'; }
        });
    } else {
        rows.forEach(function (row) {
            row.classList.remove('rpt-row-locked');
            var viewBtn = row.querySelector('.rpt-view-btn');
            if (viewBtn) { viewBtn.disabled = false; viewBtn.title = ''; viewBtn.style.opacity = '1'; viewBtn.style.cursor = 'pointer'; }
        });
    }
}

/* ════════════════════════════════════════
   ROLE MODAL
   ════════════════════════════════════════ */
function showReportsRoleModal(role) {
    var data = RPT_ROLE_DATA[role];
    if (!data) return;

    var modal = document.getElementById('rptRoleModal');
    if (!modal) { modal = _createRoleModal(); document.body.appendChild(modal); }

    var iconEl = document.getElementById('rptRoleModalIcon');
    if (iconEl) iconEl.innerHTML = data.icon;

    _setText('rptRoleModalTitle', role);
    _setText('rptRoleModalDesc',  data.desc);

    var permsEl = document.getElementById('rptRoleModalPerms');
    if (permsEl) {
        permsEl.innerHTML = data.perms.map(function (p) {
            var svg = RPT_PERM_ICONS[p[0]] || RPT_PERM_ICONS.deny;
            return '<div class="role-perm-item"><span class="perm-icon">' + svg + '</span>' + p[1] + '</div>';
        }).join('');
    }

    modal.style.display = 'flex';
    modal.onclick = function (e) { if (e.target === modal) closeReportsRoleModal(); };
}

function closeReportsRoleModal() {
    var modal = document.getElementById('rptRoleModal');
    if (modal) modal.style.display = 'none';
}

function _createRoleModal() {
    var modal = document.createElement('div');
    modal.id  = 'rptRoleModal';

    modal.innerHTML =
        '<div class="rpt-modal-card">' +
            '<div class="rpt-modal-icon-wrap"><div class="rpt-modal-icon-box" id="rptRoleModalIcon"></div></div>' +
            '<h2  class="rpt-modal-title" id="rptRoleModalTitle"></h2>' +
            '<p   class="rpt-modal-desc"  id="rptRoleModalDesc"></p>' +
            '<div class="rpt-modal-perms" id="rptRoleModalPerms"></div>' +
            '<button class="rpt-got-it" onclick="closeReportsRoleModal()">Got it</button>' +
        '</div>';

    return modal;
}


function setReportsActiveRoleTab(role) {
    document.querySelectorAll('#roleTabs .role-tab').forEach(function (tab) {
        var isActive = tab.textContent.trim() === role;
        tab.classList.toggle('active', isActive);
        tab.style.color = isActive ? '' : '';
        tab.style.fontWeight = isActive ? '700' : '';
        tab.title = isActive ? 'Current login role' : 'Role is controlled by login account';
    });
}

function loadReportsRoleFromServer() {
    fetch('/api/current_user')
        .then(function (r) { return r.json(); })
        .then(function (u) {
            var role = u.role_key || 'Safety';
            window.FREDT_CURRENT_ROLE = role;
            window.FREDT_CURRENT_PERMISSIONS = u.permissions || {};
            applyReportsRolePermissions(role);
            setReportsActiveRoleTab(role);
        })
        .catch(function () {
            applyReportsRolePermissions('Safety');
            setReportsActiveRoleTab('Safety');
        });
}

/* ════════════════════════════════════════
   SWITCH ROLE
   ════════════════════════════════════════ */
window.switchRole = function (el) {
    var requestedRole = el.textContent.trim();
    var role = window.FREDT_CURRENT_ROLE || currentReportsRole || 'Safety';

    if (requestedRole !== role) {
        setReportsActiveRoleTab(role);
        _showReportToast('Role is controlled by the logged-in account: ' + role, 'warning');
        showReportsRoleModal(role);
        return;
    }

    applyReportsRolePermissions(role);
    setReportsActiveRoleTab(role);
    showReportsRoleModal(role);
    if (window.lucide) lucide.createIcons();
};

/* ════════════════════════════════════════
   ★ FIX 3 — SCROLL TO ANALYTICS SECTION
   ════════════════════════════════════════ */
function scrollToAnalytics() {
    var section = document.getElementById('analyticsSection');
    if (!section) return;

    var rect = section.getBoundingClientRect();
    var mainContent = document.querySelector('.main-content');

    if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
        var offset = rect.top + mainContent.scrollTop - mainContent.getBoundingClientRect().top - 24;
        mainContent.scrollTo({ top: offset, behavior: 'smooth' });
    } else {
        var absTop = rect.top + window.scrollY - 24;
        window.scrollTo({ top: absTop, behavior: 'smooth' });
    }

    section.style.transition = 'outline 0.1s ease, outline-offset 0.1s ease';
    section.style.outline = '2px solid rgba(95,143,132,0.6)';
    section.style.outlineOffset = '6px';
    section.style.borderRadius = '16px';

    setTimeout(function () {
        section.style.outline = '2px solid transparent';
        section.style.outlineOffset = '6px';
    }, 1200);

    setTimeout(function () {
        section.style.outline = '';
        section.style.outlineOffset = '';
        section.style.borderRadius = '';
        section.style.transition = '';
    }, 1600);

    _showReportToast('Analytics charts', 'success');
}

/* =====================================================
   Compatibility fix
   ===================================================== */

/* =====================================================
   Project section
   ===================================================== */
function fetchLiveMetrics() {
    // Implementation note
    _showMetricsUpdating();

    fetch('/admin/reports_metrics')
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (data && data.error) throw new Error(data.error);
            _metricsUpdateCount++;
            _lastMetrics = data;
            applyMetrics(data, true);  // true = من الخادم (بيانات حقيقية)
            _updateMetricsBadge('live');
        })
        .catch(function (err) {
            console.warn('[FREDT] Metrics fetch failed, using computed fallback:', err.message);
            var fallback = computeFallbackMetrics();
            _lastMetrics = fallback;
            applyMetrics(fallback, false);  // false = تقدير ذكي
            _updateMetricsBadge('estimated');
        });
}

/* =====================================================
   Project section
   ===================================================== */
function _showMetricsUpdating() {
    // Implementation note
    var badge = document.querySelector('.rpt-metrics-live-badge');
    if (badge) {
        badge.style.opacity = '0.6';
        badge.style.transition = 'opacity 0.3s';
    }
}

/* =====================================================
   Project section
   ===================================================== */
function _updateMetricsBadge(source) {
    var badge = document.querySelector('.rpt-metrics-live-badge');
    if (!badge) return;

    badge.style.opacity = '1';

    if (source === 'live') {
        badge.innerHTML = '<span class="rpt-live-dot"></span>' +
            'Live data · updated ' + _formatTimeAgo(new Date()) +
            (_metricsUpdateCount > 1 ? ' · #' + _metricsUpdateCount : '');
        badge.style.background = '#f0fdf4';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #bbf7d0';
    } else {
        badge.innerHTML = '<span class="rpt-live-dot" style="background:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.25);"></span>' +
            'Estimated data · simulation in standby';
        badge.style.background = '#fffbeb';
        badge.style.color = '#92400e';
        badge.style.border = '1px solid #fde68a';
    }
}

function _formatTimeAgo(date) {
    return 'just now';
}

/* =====================================================
   Simulation configuration
   ===================================================== */
function computeFallbackMetrics() {
    if (typeof DAYS_DATA === 'undefined' || !DAYS_DATA.length) {
        return {
            avg_response_time:    '1m 24s',
            avg_evacuation_time:  '6m 12s',
            system_reliability:   99.8,
            ai_accuracy:          97.2,
            evacuation_events:    0,
            evacuation_trend:     'No simulation data yet'
        };
    }

    var total    = DAYS_DATA.reduce(function (s, d) { return s + d.fire_count; }, 0);
    var days     = DAYS_DATA.length;
    var highDays = DAYS_DATA.filter(function (d) { return d.fire_count >= 3; }).length;

    // Implementation note
    var baseResp = 84 + (highDays * 5) + (total * 1.5);
    baseResp = Math.min(baseResp, 300);

    // Implementation note
    var baseEvac = 372 + (total * 18) + (highDays * 30);
    baseEvac = Math.min(baseEvac, 900);

    // Implementation note
    var reliability = Math.max(95.0, 100.0 - (total * 0.04) - (highDays * 0.1));
    reliability = Math.min(reliability, 99.9);

    // Implementation note
    var aiAccuracy = Math.max(88.0, 98.5 - (total * 0.1) - (highDays * 0.2));
    aiAccuracy = Math.min(aiAccuracy, 99.5);

    var evacEvents  = Math.round(total * 0.65);
    var evacTrend   = evacEvents > days * 0.5 ? '↑ Up vs last period' : '↓ Down vs last period';

    return {
        avg_response_time:   _fmtSecondsJS(Math.round(baseResp)),
        avg_evacuation_time: _fmtSecondsJS(Math.round(baseEvac)),
        system_reliability:  parseFloat(reliability.toFixed(1)),
        ai_accuracy:         parseFloat(aiAccuracy.toFixed(1)),
        evacuation_events:   evacEvents,
        evacuation_trend:    evacTrend
    };
}

function _fmtSecondsJS(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + 'm ' + String(sec).padStart(2, '0') + 's';
}

/* =====================================================
   Project section
   ===================================================== */
function applyMetrics(data, isLive) {
    // Implementation note
    _animateMetricValue(
        'metricResponseTime',
        data.avg_response_time || '1m 24s',
        isLive
    );
    animateFill(
        'metricResponseFill',
        estimateTimePct(data.avg_response_time, 180),
        '#5f8f84'
    );

    // Implementation note
    _animateMetricValue(
        'metricEvacTime',
        data.avg_evacuation_time || '6m 12s',
        isLive
    );
    animateFill(
        'metricEvacFill',
        estimateTimePct(data.avg_evacuation_time, 600),
        '#f59e0b'
    );

    // Implementation note
    var rel = parseFloat(data.system_reliability) || 99.8;
    _animateMetricValue('metricReliability', rel.toFixed(1) + '%', isLive);
    animateFill('metricReliabilityFill', rel, '#22c55e');

    // Implementation note
    var ai = parseFloat(data.ai_accuracy) || 96.4;
    _animateMetricValue('metricAIAccuracy', ai.toFixed(1) + '%', isLive);
    animateFill('metricAIFill', ai, '#3b82f6');

    // Implementation note
    var evac = parseInt(data.evacuation_events) || 0;
    var trend = data.evacuation_trend || '';
    _setLiveVal('statEvacuationEvents', evac);
    var trendEl = document.getElementById('statEvacuationTrend');
    if (trendEl) {
        trendEl.textContent = trend;
        var isUp = trend.toLowerCase().includes('up') || trend.includes('↑');
        trendEl.className = 'rpt-stat-trend ' + (isUp ? 'up' : 'down');
    }

    // Implementation note
    _updateLastUpdatedNow();
}

/* =====================================================
   Project section
   ===================================================== */
function _animateMetricValue(id, newVal, isLive) {
    var el = document.getElementById(id);
    if (!el) return;

    var oldVal = el.textContent.trim();

    if (oldVal !== newVal && oldVal !== '--' && oldVal !== '') {
        // Implementation note
        el.style.transition = 'color 0.25s ease, transform 0.25s ease';
        el.style.color = isLive ? '#5f8f84' : '#f59e0b';
        el.style.transform = 'scale(1.04)';
        setTimeout(function () {
            el.innerHTML = newVal;
            setTimeout(function () {
                el.style.color = '';
                el.style.transform = '';
            }, 400);
        }, 150);
    } else {
        el.innerHTML = newVal;
    }
}

function _updateLastUpdatedNow() {
    var el = document.getElementById('footerLastUpdated');
    if (el) {
        el.textContent = 'Last updated just now';
        // Implementation note
        if (window._footerTimerStart !== undefined) {
            window._footerTimerStart = Date.now();
        }
    }
}

function _setLiveVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
}

function animateFill(id, pct, color) {
    var el = document.getElementById(id);
    if (!el) return;
    if (color) el.style.background = color;
    setTimeout(function () {
        el.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }, 100);
}

/* =====================================================
   Project section
   ===================================================== */
function estimateTimePct(timeStr, maxSeconds) {
    if (!timeStr || typeof timeStr !== 'string') return 50;
    var m = timeStr.match(/(\d+)m\s*(\d+)s/);
    if (!m) return 50;
    var totalSec = parseInt(m[1]) * 60 + parseInt(m[2]);
    // Implementation note
    var pct = Math.round((1 - totalSec / maxSeconds) * 100);
    return Math.max(5, Math.min(95, pct));
}

/* ════════════════════════════════════════
   ★ FIX 1 — DATE RANGE FILTER
   ════════════════════════════════════════ */
var activeDateFrom = null, activeDateTo = null;

function toggleDatePicker() {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canFilter) { _showReportToast('Filters are disabled for ' + currentReportsRole + ' role.', 'error'); return; }

    var panel   = document.getElementById('datePicker');
    var overlay = document.getElementById('datePickerOverlay');
    if (!panel) return;

    if (panel.style.display !== 'none') {
        closeDatePicker();
    } else {
        var btn  = document.getElementById('btnDateRange');
        var wrap = document.getElementById('dateRangeWrap');
        var anchor = btn || wrap;

        if (anchor) {
            var rect = anchor.getBoundingClientRect();
            var panelWidth = 290;
            var leftPos = rect.left;

            if (leftPos + panelWidth > window.innerWidth - 12) {
                leftPos = window.innerWidth - panelWidth - 12;
            }

            panel.style.top  = (rect.bottom + 6) + 'px';
            panel.style.left = leftPos + 'px';
        }

        panel.style.display = 'block';
        if (overlay) overlay.style.display = 'block';
        document.getElementById('btnDateRange').classList.add('active');
    }
}

function closeDatePicker() {
    var panel   = document.getElementById('datePicker');
    var overlay = document.getElementById('datePickerOverlay');
    if (panel)   panel.style.display   = 'none';
    if (overlay) overlay.style.display = 'none';
    if (!activeDateFrom && !activeDateTo) {
        var btn = document.getElementById('btnDateRange');
        if (btn) btn.classList.remove('active');
    }
}

function applyDateRange() {
    activeDateFrom = document.getElementById('dateFrom').value || null;
    activeDateTo   = document.getElementById('dateTo').value   || null;
    var label = document.getElementById('dateRangeLabel');
    if (label) {
        if (activeDateFrom && activeDateTo)   label.textContent = activeDateFrom.slice(5) + ' → ' + activeDateTo.slice(5);
        else if (activeDateFrom)              label.textContent = 'From ' + activeDateFrom.slice(5);
        else if (activeDateTo)                label.textContent = 'To '   + activeDateTo.slice(5);
        else                                  label.textContent = 'Date Range';
    }
    var btn = document.getElementById('btnDateRange');
    if (btn) btn.classList.toggle('active', !!(activeDateFrom || activeDateTo));
    filterTable();
}

function setPresetRange(days) {
    var to = new Date(), from = new Date(); from.setDate(from.getDate() - days);
    var fmt = function (d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
    document.getElementById('dateFrom').value = fmt(from);
    document.getElementById('dateTo').value   = fmt(to);
    applyDateRange(); closeDatePicker();
}

function clearDateRange() {
    activeDateFrom = null; activeDateTo = null;
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value   = '';
    var label = document.getElementById('dateRangeLabel'); if (label) label.textContent = 'Date Range';
    var btn   = document.getElementById('btnDateRange');   if (btn)   btn.classList.remove('active');
    filterTable(); closeDatePicker();
}

/* =====================================================
   Compatibility fix
   ===================================================== */
function filterTable() {
    var cfg      = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    var searchEl = document.getElementById('dateSearch');
    var query    = searchEl ? searchEl.value.toLowerCase().trim() : '';
    var sevEl    = document.getElementById('severityFilter');
    var bldEl    = document.getElementById('buildingFilter');
    var severity = (cfg.canFilter && sevEl) ? sevEl.value : '';
    var building = (cfg.canFilter && bldEl) ? bldEl.value : '';
    var rows     = document.querySelectorAll('#reportsTable tbody tr.report-row');
    var visible  = 0;

    rows.forEach(function (row) {
        var rowText  = row.textContent.toLowerCase();
        var sevText  = row.getAttribute('data-severity') || '';
        var corrText = row.getAttribute('data-corridor')  || '';
        var dateAttr = row.getAttribute('data-date')      || '';

        // Compatibility fix
        var matchSearch = !query || rowText.includes(query);

        // Compatibility fix
        var matchCorridor;
        if (!building) {
            matchCorridor = true;
        } else if (building === 'None') {
            matchCorridor = (corrText === 'None' || corrText === '' || corrText === 'null');
        } else {
            // Implementation note
            var corrClean = corrText.replace(/Corridor\s*/gi, '').trim();
            matchCorridor = (corrClean === building) ||
                            corrClean.split(',').map(function(s){ return s.trim(); }).indexOf(building) !== -1;
        }

        // Date range
        var inRange = true;
        if (cfg.canFilter && (activeDateFrom || activeDateTo)) {
            var rowDate = new Date(dateAttr);
            if (activeDateFrom && rowDate < new Date(activeDateFrom)) inRange = false;
            if (activeDateTo   && rowDate > new Date(activeDateTo))   inRange = false;
        }

        var show = matchSearch && (!severity || sevText === severity) && matchCorridor && inRange;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    var el = document.getElementById('visibleCount'); if (el) el.textContent = visible;
}

function updateVisibleCount() {
    var visible = 0;
    document.querySelectorAll('#reportsTable tbody tr.report-row').forEach(function (row) {
        if (row.style.display !== 'none') visible++;
    });
    var el = document.getElementById('visibleCount'); if (el) el.textContent = visible;
}

/* ════════════════════════════════════════
   CLEAR / EXPORT / PDF
   ════════════════════════════════════════ */
function clearAllReports() {
    // Backward-compatible entry point: keep old onclick calls safe, but never use browser confirm().
    openDeleteReportModal();
}

function openDeleteReportModal() {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canClearReports) {
        _showReportToast('Access Denied: ' + currentReportsRole + ' cannot delete reports.', 'error');
        return;
    }

    populateDeleteReportSelect();

    var modal = document.getElementById('rptDeleteModal');
    var select = document.getElementById('deleteReportSelect');
    var deleteBtn = document.getElementById('confirmDeleteReportBtn');
    if (!modal) return;

    var hasReports = !!(select && select.querySelector('option[value]:not([value=""])'));
    if (deleteBtn) deleteBtn.disabled = !hasReports;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rpt-delete-modal-open');

    if (select) setTimeout(function () { select.focus(); }, 80);
    if (window.lucide) lucide.createIcons();
}

function closeDeleteReportModal() {
    var modal = document.getElementById('rptDeleteModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rpt-delete-modal-open');
}

function populateDeleteReportSelect() {
    var select = document.getElementById('deleteReportSelect');
    var hint = document.getElementById('deleteReportHint');
    if (!select) return;

    var rows = Array.prototype.slice.call(document.querySelectorAll('#reportsTable tbody tr.report-row'));
    var reports = [];

    if (typeof DAYS_DATA !== 'undefined' && DAYS_DATA.length) {
        reports = DAYS_DATA.map(function (d) {
            return {
                date: d.date,
                fire_count: Number(d.fire_count || 0),
                corridor: d.corridor || 'None'
            };
        });
    } else {
        reports = rows.map(function (row) {
            return {
                date: row.getAttribute('data-date') || '',
                fire_count: Number(row.getAttribute('data-fire-count') || 0),
                corridor: row.getAttribute('data-corridor') || 'None'
            };
        }).filter(function (d) { return !!d.date; });
    }

    select.innerHTML = '<option value="">Select a report...</option>';

    reports.forEach(function (d) {
        var corridor = (d.corridor && d.corridor !== 'None') ? ('Corridor ' + d.corridor) : 'No corridor';
        var fires = d.fire_count + ' fire' + (d.fire_count === 1 ? '' : 's');
        var opt = document.createElement('option');
        opt.value = d.date;
        opt.textContent = d.date + ' — ' + fires + ' — ' + corridor;
        select.appendChild(opt);
    });

    if (hint) {
        hint.textContent = reports.length
            ? 'Only the selected report will be deleted.'
            : 'No historical reports are available to delete.';
    }
}

function confirmDeleteSelectedReport() {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canClearReports) {
        _showReportToast('Access Denied: ' + currentReportsRole + ' cannot delete reports.', 'error');
        return;
    }

    var select = document.getElementById('deleteReportSelect');
    var btn = document.getElementById('confirmDeleteReportBtn');
    var date = select ? select.value : '';

    if (!date) {
        _showReportToast('Please select a report first.', 'error');
        if (select) select.focus();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.dataset.oldHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" style="width:15px;height:15px;animation:spin .8s linear infinite;"></i> Deleting...';
        if (window.lucide) lucide.createIcons();
    }

    fetch('/delete_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: date })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (!data || !data.success) throw new Error((data && data.error) || 'Delete failed');

        removeReportFromPage(date);
        closeDeleteReportModal();
        _showReportToast('Selected report deleted successfully.', 'success');
    })
    .catch(function (err) {
        console.error('[FREDT] Delete report failed:', err);
        _showReportToast('Could not delete this report. Check /delete_report in app.py.', 'error');
    })
    .finally(function () {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.oldHtml || '<i data-lucide="trash-2"></i> Delete selected';
            if (window.lucide) lucide.createIcons();
        }
    });
}

function removeReportFromPage(date) {
    document.querySelectorAll('#reportsTable tbody tr.report-row[data-date="' + CSS.escape(date) + '"]').forEach(function (row) {
        row.remove();
    });

    if (typeof DAYS_DATA !== 'undefined') {
        DAYS_DATA = DAYS_DATA.filter(function (d) { return d.date !== date; });
    }

    ensureReportsEmptyState();
    populateStats();
    drawCharts();
    filterTable();
    updateVisibleCount();
    populateDeleteReportSelect();
}

function ensureReportsEmptyState() {
    var tbody = document.querySelector('#reportsTable tbody');
    if (!tbody) return;

    var rows = tbody.querySelectorAll('tr.report-row');
    var oldEmpty = tbody.querySelector('.rpt-empty-generated');

    if (rows.length === 0 && !oldEmpty) {
        var emptyRow = document.createElement('tr');
        emptyRow.className = 'rpt-empty-generated';
        emptyRow.innerHTML = '<td colspan="7"><div class="rpt-empty-state"><i data-lucide="folder-open" style="width:36px;height:36px;color:#cbd5e1;"></i><p>No historical incident reports found.</p></div></td>';
        tbody.appendChild(emptyRow);
        if (window.lucide) lucide.createIcons();
    } else if (rows.length > 0 && oldEmpty) {
        oldEmpty.remove();
    }
}

function exportCSV() {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canExportCSV) { _showReportToast('Access Denied: ' + currentReportsRole + ' cannot export CSV.', 'error'); return; }
    if (typeof DAYS_DATA === 'undefined' || !DAYS_DATA.length) { _showReportToast('No data to export.', 'error'); return; }

    // Fire simulation and alert logic
    var headers = ['Day', 'Date', 'Fire Corridor', 'Total Fires', 'Severity', 'Safety Score'];
    var rows = DAYS_DATA.map(function (d, i) {
        var sev = d.fire_count >= 3 ? 'High' : d.fire_count === 2 ? 'Medium' : 'Low';
        var corridor = d.corridor && d.corridor !== 'None' ? ('Corridor ' + d.corridor) : 'N/A';
        return ['DAY-'+(i+1), d.date, corridor, d.fire_count, sev, Math.max(30, 95-d.fire_count*9)];
    });
    var csv = [headers].concat(rows).map(function (r) { return r.join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a'); a.href = url;
    a.download = 'fredt_reports_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    _showReportToast('CSV exported successfully.', 'success');
}

function downloadRowPDF(btn, date, fireCount) {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canExportPDF) { _showReportToast('Access Denied: ' + currentReportsRole + ' cannot export PDF.', 'error'); return; }
    btn.classList.add('generating');
    var origHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader-2" style="width:15px;height:15px;animation:spin .8s linear infinite;"></i>';
    if (window.lucide) lucide.createIcons();
    setTimeout(function () { generateReportPDF(date, fireCount); btn.classList.remove('generating'); btn.innerHTML = origHTML; if (window.lucide) lucide.createIcons(); }, 600);
}

function generateReportPDF(date, fireCount) {
    var sev = fireCount>=3?'High':fireCount===2?'Medium':'Low';
    var score = Math.max(30, 95-fireCount*9);
    var sevColor = fireCount>=3?'#ef4444':fireCount===2?'#d97706':'#16a34a';

    // Implementation note
    var metrics = _lastMetrics || computeFallbackMetrics();

    // Fire simulation and alert logic
    var corridor = 'N/A';
    if (typeof DAYS_DATA !== 'undefined') {
        for (var i = 0; i < DAYS_DATA.length; i++) {
            if (DAYS_DATA[i].date === date) {
                var c = DAYS_DATA[i].corridor;
                corridor = (c && c !== 'None' && c !== 'null') ? ('Corridor ' + c) : 'None';
                break;
            }
        }
    }

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>FREDT Report - '+date+'</title>' +
        '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">' +
        '<style>*{box-sizing:border-box;margin:0;padding:0;}' +
        'body{font-family:"DM Sans",sans-serif;background:#fff;color:#1f2937;padding:40px;}' +
        '.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #5f8f84;padding-bottom:20px;margin-bottom:28px;}' +
        '.logo-row{display:flex;align-items:center;gap:12px;}' +
        '.logo-box{width:42px;height:42px;background:#5f8f84;border-radius:10px;display:flex;align-items:center;justify-content:center;}' +
        '.logo-box svg{fill:#fff;}' +
        '.brand{font-size:24px;font-weight:800;color:#1f2937;}' +
        '.brand small{display:block;font-size:11px;font-weight:500;color:#6b7280;letter-spacing:.5px;text-transform:uppercase;}' +
        '.report-id{font-family:"DM Mono",monospace;font-size:12px;color:#6b7280;text-align:right;}' +
        '.data-source{display:inline-block;margin-top:6px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;' +
            ((_lastMetrics && !_lastMetrics._isEstimated) ? 'background:#dcfce7;color:#166534;' : 'background:#fef3c7;color:#92400e;') + '}' +
        '.section-title{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px;margin-top:28px;}' +
        '.info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:8px;}' +
        '.info-card{background:#f9fafb;border-radius:12px;padding:16px 18px;}' +
        '.info-label{font-size:11px;color:#6b7280;margin-bottom:4px;}' +
        '.info-value{font-size:20px;font-weight:800;color:#1f2937;}' +
        '.sev-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;' +
            'background:'+(fireCount>=3?'#fee2e2':fireCount===2?'#fef3c7':'#dcfce7')+';color:'+sevColor+';}' +
        '.metric-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px;}' +
        '.metric-card{flex:1;min-width:140px;background:#f9fafb;border-radius:10px;padding:14px 16px;}' +
        '.metric-label{font-size:11px;color:#6b7280;margin-bottom:4px;}' +
        '.metric-value{font-size:18px;font-weight:800;color:#1f2937;}' +
        '.score-section{margin-top:20px;}' +
        '.score-bar-outer{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin-top:8px;}' +
        '.score-bar-inner{height:100%;border-radius:99px;background:'+(score>=80?'#22c55e':score>=60?'#f59e0b':'#ef4444')+';width:'+score+'%;}' +
        '.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;display:flex;justify-content:space-between;}' +
        '@media print{body{padding:20px;}}</style></head><body>' +
        '<div class="header">' +
            '<div class="logo-row">' +
                '<div class="logo-box"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2c-4 5-5 8-2 11-1-2 0-4 2-5-1 3 1 5 2 7 1-1 2-3 1-5 1 1 2 3 2 5 2-3 1-7-5-13z"/></svg></div>' +
                '<div class="brand">FREDT <small>Fire Response &amp; Detection</small></div>' +
            '</div>' +
            '<div class="report-id">Report ID: RPT-'+date.replace(/-/g,'')+'<br>Generated: '+new Date().toLocaleString()+'<br>Role: '+currentReportsRole +
                '<br><span class="data-source">' + ((_lastMetrics && !_lastMetrics._isEstimated) ? '● Live Metrics' : '○ Estimated Metrics') + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="section-title">Incident Summary</div>' +
        '<div class="info-grid">' +
            '<div class="info-card"><div class="info-label">Date</div><div class="info-value" style="font-size:16px;">'+date+'</div></div>' +
            '<div class="info-card"><div class="info-label">Fire Corridor</div><div class="info-value" style="font-size:16px;">'+corridor+'</div></div>' +
            '<div class="info-card"><div class="info-label">Total Fires</div><div class="info-value">'+fireCount+'</div></div>' +
            '<div class="info-card"><div class="info-label">Severity</div><div class="info-value" style="font-size:16px;"><span class="sev-badge">'+sev+'</span></div></div>' +
        '</div>' +
        '<div class="score-section">' +
            '<div class="info-label" style="font-size:12px;color:#6b7280;">Safety Score</div>' +
            '<div style="font-size:28px;font-weight:800;margin-top:6px;">'+score+' / 100</div>' +
            '<div class="score-bar-outer"><div class="score-bar-inner"></div></div>' +
        '</div>' +
        '<div class="section-title">System Metrics ' +
            '<span style="font-size:10px;font-weight:500;color:#9ca3af;text-transform:none;letter-spacing:0;">' +
            ((_lastMetrics && !_lastMetrics._isEstimated) ? '(from live simulation)' : '(estimated from incident history)') +
            '</span>' +
        '</div>' +
        '<div class="metric-row">' +
            '<div class="metric-card"><div class="metric-label">Avg Response Time</div><div class="metric-value">'+metrics.avg_response_time+'</div></div>' +
            '<div class="metric-card"><div class="metric-label">Avg Evacuation Time</div><div class="metric-value">'+metrics.avg_evacuation_time+'</div></div>' +
            '<div class="metric-card"><div class="metric-label">System Reliability</div><div class="metric-value">'+metrics.system_reliability+'%</div></div>' +
            '<div class="metric-card"><div class="metric-label">AI Detection Accuracy</div><div class="metric-value">'+metrics.ai_accuracy+'%</div></div>' +
        '</div>' +
        '<div class="footer"><span>FREDT - Fire Response, Evacuation &amp; Detection System</span><span>Confidential - '+currentReportsRole+' Access</span></div>' +
        '</body></html>';

    var win = window.open('','_blank','width=900,height=700');
    if (!win) { _showReportToast('Allow popups to download PDF.', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 800);
    _showReportToast('PDF report opened for printing.', 'success');
}

/* ════════════════════════════════════════
   VIEW / ROW CLICK
   ════════════════════════════════════════ */
function viewReportDetail(url) {
    var cfg = REPORTS_ROLE_PERMISSIONS[currentReportsRole] || REPORTS_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canViewDetails) { _showReportToast('Access Denied: cannot view report details.', 'error'); return; }
    window.location.href = url;
}
function handleRowClick(row, url) {
    if (row.classList.contains('rpt-row-locked')) { _showReportToast('Safety role: Only last 7 days are accessible.', 'error'); return; }
    viewReportDetail(url);
}

/* ════════════════════════════════════════
   ROW ANIMATIONS + FOOTER TIMER
   ════════════════════════════════════════ */
function animateRows() {
    document.querySelectorAll('#reportsTable tbody tr.report-row').forEach(function (row, i) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(8px)';
        row.style.transition = 'opacity .3s ease, transform .3s ease';
        setTimeout(function () {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 50 + i * 45);
    });
}

function initFooterTimer() {
    window._footerTimerStart = Date.now();
    setInterval(function () {
        var el = document.getElementById('footerLastUpdated'); if (!el) return;
        var secs = Math.round((Date.now() - window._footerTimerStart) / 1000);
        if      (secs < 5)  el.textContent = 'Last updated just now';
        else if (secs < 60) el.textContent = 'Last updated ' + secs + 's ago';
        else                el.textContent = 'Last updated ' + Math.round(secs/60) + 'm ago';
    }, 4000);
}

/* ════════════════════════════════════════
   SVG CHARTS
   ════════════════════════════════════════ */
function drawCharts() { if (typeof DAYS_DATA === 'undefined') return; drawLineChart(); drawBarChart(); drawDonut(); }

function drawLineChart() {
    var el = document.getElementById('svgLineChart'); if (!el || !DAYS_DATA.length) return;
    var W=260,H=140,pad={top:14,right:14,bottom:24,left:30};
    var maxVal=Math.max.apply(null,DAYS_DATA.map(function(d){return d.fire_count;}))||1;
    var points=DAYS_DATA.map(function(d,i){var x=pad.left+(i/Math.max(DAYS_DATA.length-1,1))*(W-pad.left-pad.right);var y=pad.top+(1-d.fire_count/maxVal)*(H-pad.top-pad.bottom);return{x:x,y:y,d:d};});
    var polyline=points.map(function(p){return p.x+','+p.y;}).join(' ');
    var area=polyline+' '+points[points.length-1].x+','+(H-pad.bottom)+' '+points[0].x+','+(H-pad.bottom);
    var gridLines='',xLabels='',step=Math.max(1,Math.ceil(DAYS_DATA.length/6));
    for(var g=0;g<=4;g++){var gy=pad.top+(g/4)*(H-pad.top-pad.bottom);var lv=Math.round(maxVal*(1-g/4));gridLines+='<line x1="'+pad.left+'" y1="'+gy+'" x2="'+(W-pad.right)+'" y2="'+gy+'" stroke="#e5e7eb" stroke-width="1"/>';gridLines+='<text x="'+(pad.left-4)+'" y="'+(gy+4)+'" font-size="8" fill="#9ca3af" text-anchor="end">'+lv+'</text>';}
    points.forEach(function(p,i){if(i%step!==0&&i!==points.length-1)return;var label=p.d.date.length>8?p.d.date.slice(5):p.d.date;xLabels+='<text x="'+p.x+'" y="'+(H-2)+'" font-size="8" fill="#9ca3af" text-anchor="middle">'+label+'</text>';});
    var dots=points.map(function(p){return'<circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="#5f8f84"/>';}).join('');
    el.innerHTML='<defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5f8f84" stop-opacity="0.18"/><stop offset="100%" stop-color="#5f8f84" stop-opacity="0"/></linearGradient></defs>'+gridLines+xLabels+'<polygon points="'+area+'" fill="url(#lg1)"/><polyline points="'+polyline+'" fill="none" stroke="#5f8f84" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'+dots;
}

function drawBarChart() {
    var el=document.getElementById('svgBarChart');if(!el||!DAYS_DATA.length)return;
    var W=260,H=140,pad={top:14,right:10,bottom:24,left:30};
    var maxVal=Math.max.apply(null,DAYS_DATA.map(function(d){return d.fire_count;}))||1;
    var barW=Math.max(4,Math.floor((W-pad.left-pad.right)/DAYS_DATA.length)-4);
    var gridLines='',bars='',xLabels='',step=Math.max(1,Math.ceil(DAYS_DATA.length/6));
    for(var g=0;g<=4;g++){var gy=pad.top+(g/4)*(H-pad.top-pad.bottom);var lv=Math.round(maxVal*(1-g/4));gridLines+='<line x1="'+pad.left+'" y1="'+gy+'" x2="'+(W-pad.right)+'" y2="'+gy+'" stroke="#e5e7eb" stroke-width="1"/>';gridLines+='<text x="'+(pad.left-4)+'" y="'+(gy+4)+'" font-size="8" fill="#9ca3af" text-anchor="end">'+lv+'</text>';}
    DAYS_DATA.forEach(function(d,i){var x=pad.left+i*((W-pad.left-pad.right)/DAYS_DATA.length);var h=Math.max(2,(d.fire_count/maxVal)*(H-pad.top-pad.bottom));var y=H-pad.bottom-h;var color=d.fire_count>=3?'#ef4444':d.fire_count===2?'#f59e0b':'#5f8f84';bars+='<rect x="'+(x+2)+'" y="'+y+'" width="'+barW+'" height="'+h+'" rx="4" fill="'+color+'" opacity="0.85"/>';if(i%step===0||i===DAYS_DATA.length-1){var label=d.date.length>8?d.date.slice(5):d.date;xLabels+='<text x="'+(x+barW/2+2)+'" y="'+(H-2)+'" font-size="8" fill="#9ca3af" text-anchor="middle">'+label+'</text>';}});
    el.innerHTML=gridLines+bars+xLabels;
}

function drawDonut() {
    var el=document.getElementById('svgDonut');if(!el||!DAYS_DATA.length)return;
    var high=0,med=0,low=0;
    DAYS_DATA.forEach(function(d){if(d.fire_count>=3)high++;else if(d.fire_count===2)med++;else low++;});
    var total=DAYS_DATA.length||1,cx=70,cy=70,r=50,stroke=20,circum=2*Math.PI*r;
    var segments=[{val:high,color:'#ef4444'},{val:med,color:'#f59e0b'},{val:low,color:'#22c55e'}];
    var offset=0,arcs='';
    segments.forEach(function(s){var dash=(s.val/total)*circum;arcs+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+s.color+'" stroke-width="'+stroke+'" stroke-dasharray="'+dash+' '+circum+'" stroke-dashoffset="-'+offset+'" transform="rotate(-90 '+cx+' '+cy+')"/>';offset+=dash;});
    el.innerHTML=arcs+'<text x="'+cx+'" y="'+(cy-4)+'" font-size="16" font-weight="800" fill="#1f2937" text-anchor="middle" font-family="DM Sans,sans-serif">'+total+'</text><text x="'+cx+'" y="'+(cy+11)+'" font-size="9" fill="#9ca3af" text-anchor="middle" font-family="DM Sans,sans-serif">days</text>';
    var highEl=document.getElementById('donutHighCount'),medEl=document.getElementById('donutMedCount'),lowEl=document.getElementById('donutLowCount');
    if(highEl)highEl.textContent=high+' days';if(medEl)medEl.textContent=med+' days';if(lowEl)lowEl.textContent=low+' days';
}

function populateStats() {
    if (typeof DAYS_DATA === 'undefined') return;
    var totalFires=DAYS_DATA.reduce(function(sum,d){return sum+d.fire_count;},0);
    var totalDays=DAYS_DATA.length;
    var avg=totalDays?(totalFires/totalDays).toFixed(1):'0';
    _setText('statTotalFires',totalFires);
    _setText('statTotalDays',totalDays);
    _setText('statAvgFires',avg);
    _setText('statDays',totalDays);
}

/* ════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════ */
function _setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

function _showReportToast(msg, type) {
    if (typeof showToast === 'function') {
        showToast(
            type === 'success' ? 'Done' : type === 'error' ? 'Access Denied' : 'Notice',
            msg,
            type === 'error' ? 'danger' : type
        );
        return;
    }
    var old = document.querySelector('.rpt-toast-standalone'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'rpt-toast-standalone';
    Object.assign(t.style, {
        position: 'fixed', bottom: '28px', right: '28px',
        background: type === 'success' ? '#10b981' : '#ef4444',
        color: '#fff', padding: '12px 20px', borderRadius: '10px',
        fontFamily: "'DM Sans',sans-serif", fontSize: '14px', fontWeight: '600',
        boxShadow: '0 6px 24px rgba(0,0,0,0.15)', zIndex: '9999',
        opacity: '0', transform: 'translateY(10px)',
        transition: 'opacity .25s, transform .25s'
    });
    t.textContent = msg; document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(function () {
        t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
        setTimeout(function () { t.remove(); }, 300);
    }, 3000);
}

/* ════════════════════════════════════════
   KEYBOARD / RESIZE
   ════════════════════════════════════════ */
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeReportsRoleModal();
        closeDatePicker();
        closeDeleteReportModal();
    }
});

window.addEventListener('resize', function () { closeDatePicker(); });

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    animateRows();
    initFooterTimer();
    populateStats();
    drawCharts();

    // Implementation note
    fetchLiveMetrics();
    setInterval(fetchLiveMetrics, 30000);

    if (typeof loadCurrentUser === 'function') loadCurrentUser();
    if (window.lucide) lucide.createIcons();
    loadReportsRoleFromServer();
});