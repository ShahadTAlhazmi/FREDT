/* ═══════════════════════════════════════════════════════
   FREDT — Report Details Dynamic UI
   Fixed: English numerals in charts, consistent layout
   ═══════════════════════════════════════════════════════ */

// ── Force English numerals in Chart.js ──────────────────
document.addEventListener('DOMContentLoaded', function () {
    if (window.Chart) {
        Chart.defaults.locale = 'en-US';
    }
});

var tempChartInstance = null;
var heatmapChartInstance = null;

function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
}
function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value == null ? '—' : value;
}
function normalizeCorridor(value) {
    return String(value || '')
        .replace(/Corridor/gi, '')
        .replace(/،/g, ',')
        .trim();
}
function splitList(value, sep) {
    return String(value || '').split(sep || ',').map(function (x) { return x.trim(); }).filter(Boolean);
}
function lastPipe(value) {
    var arr = splitList(value, '|');
    return arr.length ? arr[arr.length - 1] : '';
}
function getIncidentSms(reportId) {
    var key = String(reportId);
    return (NOTIFIED_BY_REPORT_DATA && (NOTIFIED_BY_REPORT_DATA[key] || NOTIFIED_BY_REPORT_DATA[reportId])) || [];
}
function getUniqueRecipientsByReport() {
    var rows = [];
    var seen = {};
    Object.keys(NOTIFIED_BY_REPORT_DATA || {}).forEach(function (rid) {
        (NOTIFIED_BY_REPORT_DATA[rid] || []).forEach(function (s) {
            var key = String(s.id || s.full_name || s.phone || '') + '|' + String(rid);
            if (!seen[key]) {
                seen[key] = true;
                rows.push(Object.assign({ report_id: rid }, s));
            }
        });
    });
    return rows;
}
function uniqueSupervisors() {
    var byId = {};
    (NOTIFIED_DATA || []).forEach(function (s) {
        byId[String(s.id || s.full_name || s.phone)] = s;
    });
    Object.keys(NOTIFIED_BY_REPORT_DATA || {}).forEach(function (rid) {
        (NOTIFIED_BY_REPORT_DATA[rid] || []).forEach(function (s) {
            byId[String(s.id || s.full_name || s.phone)] = s;
        });
    });
    return Object.keys(byId).map(function (k) { return byId[k]; });
}
function collectCorridorLettersFromReport(r) {
    var text = [r.fire_corridor || '', r.corridors || ''].join(',');
    return normalizeCorridor(text)
        .split(/[,\|]/)
        .map(function (x) { return x.trim(); })
        .filter(function (x) { return x && x.toLowerCase() !== 'none'; });
}
function countCorridorUsage() {
    var counts = { A:0, B:0, C:0, D:0, E:0, F:0, G:0 };
    (REPORTS_DATA || []).forEach(function (r) {
        var unique = {};
        collectCorridorLettersFromReport(r).forEach(function (c) {
            c = c.replace(/\s+/g, '');
            if (counts.hasOwnProperty(c)) unique[c] = true;
        });
        Object.keys(unique).forEach(function (c) { counts[c] += 1; });
    });
    return counts;
}

/* ══ Summary ══ */
function renderSummary() {
    var reports = REPORTS_DATA || [];
    var recipients = uniqueSupervisors();
    var exits = {};
    reports.forEach(function (r) {
        splitList(r.exit_name, '|').forEach(function (e) {
            if (e && e.toLowerCase() !== 'none') exits[e.trim()] = true;
        });
    });
    var maxPeople = reports.reduce(function (m, r) {
        return Math.max(m, parseInt(r.total_people || 0, 10));
    }, 0);

    setText('bcDate', REPORT_DATE);
    setText('titleDate', REPORT_DATE);
    setText('statDate', REPORT_DATE);
    setText('incidentsDateLabel', REPORT_DATE);
    setText('footerDate', REPORT_DATE);
    setText('statFires', reports.length);
    setText('footerIncidents', reports.length);
    setText('statExits', Object.keys(exits).length);
    setText('totalPeopleStat', maxPeople || 0);
    setText('statNotified', recipients.length);
    setText('notifHint', recipients.length + ' supervisor(s) alerted from incident records');
    setText('kpiEvacuationEvents', reports.length);
    setText('kpiAlerts', getUniqueRecipientsByReport().length || recipients.length);

    var badge = document.getElementById('notificationBadge');
    var count = document.getElementById('notificationCount');
    if (badge) { badge.textContent = recipients.length; badge.style.display = recipients.length ? 'flex' : 'none'; }
    if (count) count.textContent = recipients.length + ' SMS';

    fetch('/get_people')
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d && typeof d.total_people !== 'undefined') {
                var live = parseInt(d.total_people || 0, 10);
                if (live > maxPeople) setText('totalPeopleStat', live);
            }
        })
        .catch(function () {});
}

/* ══ Incident Blocks ══ */
function renderIncidentBlocks() {
    var root = document.getElementById('fireIncidents');
    if (!root) return;
    var reports = REPORTS_DATA || [];
    if (!reports.length) {
        root.innerHTML = '<div class="det-empty-state"><i data-lucide="inbox" style="width:32px;height:32px;color:#cbd5e1;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;"></i><p>No fire incidents recorded for <strong>' + esc(REPORT_DATE) + '</strong>.</p></div>';
        if (window.lucide) lucide.createIcons();
        return;
    }
    root.innerHTML = reports.map(function (r, idx) {
        var finalExit = lastPipe(r.exit_name) || '—';
        var exitChanges = splitList(r.exit_name, '|');
        if (!exitChanges.length) exitChanges = [finalExit];
        var corrChanges = splitList(r.corridors, '|');
        if (!corrChanges.length) corrChanges = [''];
        var sups = getIncidentSms(r.id);
        var smsChips = sups.length ? sups.map(renderSmsChip).join('') : '<span class="notified-none">No supervisors were notified for this incident.</span>';
        var fireCorridor = normalizeCorridor(r.fire_corridor || '') || '—';

        return '<div class="fire-block" id="block-' + idx + '">' +
            '<div class="fire-block-header" onclick="toggleBlock(' + idx + ')" tabindex="0">' +
                '<div class="fbh-left">' +
                    '<span class="fbh-inc-id">INC-' + esc(r.id) + '</span>' +
                    '<i data-lucide="flame" style="width:14px;height:14px;color:#ef4444;flex-shrink:0;"></i>' +
                    '<span class="fbh-shop-name">' + esc(r.shop_name || 'Unknown Location') + '</span>' +
                '</div>' +
                '<div class="fbh-right">' +
                    '<span class="fbh-time"><i data-lucide="clock" style="width:12px;height:12px;"></i>' + esc(r.time || '—') + '</span>' +
                    (sups.length ? '<span style="font-size:11px;font-weight:700;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:10px;white-space:nowrap;"><span class="incident-sms-count" data-report-id="' + esc(r.id) + '">' + sups.length + '</span> notified</span>' : '') +
                    '<span class="admin-status-badge status-active"><span class="admin-status-dot"></span>Resolved</span>' +
                    '<i data-lucide="chevron-down" id="arrow-' + idx + '" class="fbh-arrow-icon"></i>' +
                '</div>' +
            '</div>' +
            '<div class="fire-block-body' + (idx === 0 ? ' open' : '') + '" id="body-' + idx + '">' +
                '<div class="fb-grid">' +
                    '<div>' +
                        infoRow('hash', 'Incident ID', '#INC-' + esc(r.id)) +
                        infoRow('flame', 'Fire Origin', esc(r.shop_name || '—')) +
                        infoRow('clock', 'Detected At', esc(r.time || '—')) +
                        infoRow('map-pin', 'Fire Corridor', esc(fireCorridor)) +
                        infoRow('door-open', 'Safe Exit', '<span class="admin-role-badge role-super-admin">' + esc(finalExit) + '</span>') +
                        (r.total_people ? infoRow('users', 'Total People', esc(r.total_people)) : '') +
                        (r.shop_people ? infoRow('alert-circle', 'High-Risk Zone Pop.', esc(r.shop_people) + ' people', true) : '') +
                        infoRow('alert-triangle', 'Severity', '<span class="sev-badge sev-high">Critical</span>') +
                        infoRow('check-circle', 'Status', '<span class="admin-status-badge status-active"><span class="admin-status-dot"></span>Resolved</span>') +
                        '<div class="info-row" style="align-items:flex-start;flex-direction:column;gap:8px;border-bottom:none;padding-bottom:0;">' +
                            '<span class="info-label" style="font-weight:600;color:var(--text-primary);font-size:12.5px;"><i data-lucide="message-square" style="width:14px;height:14px;color:#16a34a;"></i>SMS Notified <span style="font-size:10px;color:var(--text-muted);font-weight:400;margin-left:4px;">— <span class="incident-sms-count" data-report-id="' + esc(r.id) + '">' + sups.length + '</span> supervisor(s)</span></span>' +
                            '<div class="notified-chips" data-sms-chips data-report-id="' + esc(r.id) + '">' + smsChips + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="path-col-title"><i data-lucide="map-pin"></i>Safe Evacuation Path</div>' +
                        renderPathTrails(r, corrChanges, exitChanges, finalExit) +
                        '<div class="ai-note"><i data-lucide="cpu"></i>Path actively re-planned by risk-aware A* logic.</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    if (window.lucide) lucide.createIcons();
}
function infoRow(icon, label, value, danger) {
    return '<div class="info-row' + (danger ? ' info-row-danger' : '') + '">' +
        '<span class="info-label"><i data-lucide="' + icon + '"></i>' + label + '</span>' +
        '<span class="info-value">' + value + '</span>' +
    '</div>';
}
function renderPathTrails(r, corrChanges, exitChanges, finalExit) {
    return corrChanges.map(function (corrChunk, i) {
        var isLast = i === corrChanges.length - 1;
        var exit = (exitChanges[i] || finalExit || 'Exit').trim();
        var nodes = splitList(corrChunk, ',');
        var trail = '<div class="path-trail' + (!isLast ? ' path-trail-faded' : '') + '">' +
            '<span class="path-node fire-node">' + esc(r.shop_name || 'Fire') + '</span>' +
            '<span class="path-arrow"><i data-lucide="arrow-right"></i></span>' +
            nodes.map(function (n) {
                return '<span class="path-node corridor-node">' + esc(n) + '</span><span class="path-arrow"><i data-lucide="arrow-right"></i></span>';
            }).join('') +
            '<span class="path-node ' + (isLast ? 'exit-final' : 'exit-node') + '">' + esc(exit) + '</span>' +
        '</div>';
        if (!isLast) {
            trail += '<div class="reroute-notice"><i data-lucide="alert-triangle"></i>REROUTED DUE TO CONGESTION / RISK</div>';
        }
        return trail;
    }).join('');
}
function renderSmsChip(s) {
    var name = esc(s.full_name || 'Supervisor');
    var first = name ? name.charAt(0).toUpperCase() : 'S';
    var corr = normalizeCorridor(s.corridor || '') || '—';
    var phone = esc(s.phone || '');
    return '<span class="notified-chip">' +
        '<span class="notified-chip-avatar">' + first + '</span>' +
        name +
        (corr && corr.toLowerCase() !== 'none' ? '<span class="notified-chip-corr">' + esc(corr) + '</span>' : '') +
        (phone ? '<span class="notified-chip-phone">' + phone + '</span>' : '') +
    '</span>';
}

/* ══ SMS Table ══ */
function renderSmsTable() {
    var tbody = document.getElementById('smsNotificationsTableBody');
    if (!tbody) return;
    var notified = uniqueSupervisors();
    if (!notified.length) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="no-notif-msg"><i data-lucide="mail-x" style="width:28px;height:28px;color:#cbd5e1;margin-bottom:8px;"></i><p>No supervisors were notified for incidents on this day.</p></div></td></tr>';
        return;
    }
    tbody.innerHTML = notified.map(function (s) {
        var triggered = [];
        Object.keys(NOTIFIED_BY_REPORT_DATA || {}).forEach(function (rid) {
            (NOTIFIED_BY_REPORT_DATA[rid] || []).forEach(function (sup) {
                if (String(sup.id) === String(s.id)) {
                    var report = (REPORTS_DATA || []).find(function (r) { return String(r.id) === String(rid); });
                    triggered.push(report ? ('INC-' + report.id + ' — ' + report.shop_name) : ('INC-' + rid));
                }
            });
        });
        var first = (s.full_name || 'S').charAt(0).toUpperCase();
        var roleClass = s.role === 'Super Admin' ? 'role-super-admin' : 'role-admin';
        var triggeredHtml = triggered.length ? triggered.map(function (txt) {
            return '<span class="inc-pill"><span class="inc-pill-dot"></span>' + esc(txt) + '</span>';
        }).join('') : '<span class="admin-cell-muted">Logged for this date</span>';
        return '<tr>' +
            '<td><div class="admin-user-cell"><div class="admin-user-avatar">' + esc(first) + '</div><div><div class="admin-user-name">' + esc(s.full_name || 'Supervisor') + '</div>' + (s.email ? '<div style="font-size:11px;color:var(--text-muted);">' + esc(s.email) + '</div>' : '') + '</div></div></td>' +
            '<td><span class="admin-role-badge ' + roleClass + '">' + esc(s.role || 'Admin') + '</span></td>' +
            '<td class="admin-cell-muted"><span style="font-weight:600;color:var(--text-primary);">' + esc(normalizeCorridor(s.corridor || '—')) + '</span></td>' +
            '<td style="font-family:monospace;font-size:12.5px;color:#64748b;">' + esc(s.phone || '—') + '</td>' +
            '<td><div style="display:flex;flex-wrap:wrap;gap:4px;">' + triggeredHtml + '</div></td>' +
            '<td><span class="admin-status-badge status-active"><span class="admin-status-dot"></span>SMS Sent</span></td>' +
        '</tr>';
    }).join('');
}

/* ══ Notification Panel ══ */
function renderNotificationPanel() {
    var recipients = getUniqueRecipientsByReport();
    var unique = uniqueSupervisors();
    var badge = document.getElementById('notificationBadge');
    var count = document.getElementById('notificationCount');
    var list  = document.getElementById('notificationList');
    if (badge) { badge.textContent = unique.length; badge.style.display = unique.length ? 'flex' : 'none'; }
    if (count) count.textContent = unique.length + ' SMS';
    if (!list) return;
    if (!unique.length) { list.innerHTML = 'No SMS notifications for this report.'; return; }
    list.innerHTML = recipients.slice(0, 8).map(function (s) {
        var report = (REPORTS_DATA || []).find(function (r) { return String(r.id) === String(s.report_id); });
        return '<div style="padding:8px 0;border-bottom:1px solid #edf2f7;">' +
            '<strong style="color:#111827;">' + esc(s.full_name || 'Supervisor') + '</strong>' +
            '<div style="font-size:11.5px;color:#6b7280;">' + esc(report ? ('INC-' + report.id + ' — ' + report.shop_name) : ('INC-' + (s.report_id || ''))) + '</div></div>';
    }).join('');
}

/* ══ Side Panels ══ */
function renderSidePanels() { renderAIInsights(); renderBottlenecks(); renderTimeline(); }

function renderAIInsights(metrics) {
    var reports = REPORTS_DATA || [];
    var corridors = countCorridorUsage();
    var topCorr = Object.keys(corridors).sort(function (a,b) { return corridors[b] - corridors[a]; })[0] || '—';
    var reroutes = reports.filter(function (r) { return String(r.corridors || '').indexOf('|') !== -1 || String(r.exit_name || '').indexOf('|') !== -1; }).length;
    var notifiedCount = uniqueSupervisors().length;
    var accuracy = metrics && metrics.ai_accuracy ? Number(metrics.ai_accuracy) : null;
    var confText = accuracy ? accuracy.toFixed(1) + '%' : (reports.length ? 'Data linked' : 'No data');
    var fillWidth = accuracy ? Math.max(0, Math.min(100, accuracy)) : (reports.length ? 72 : 0);
    setText('aiConf', confText);
    var fill = document.getElementById('aiConfFill');
    if (fill) fill.style.width = fillWidth + '%';
    var insights = [];
    if (reports.length) {
        insights.push('<strong>Risk concentration:</strong> Corridor ' + esc(topCorr) + ' appears most often in today\'s incident paths.');
        insights.push('<strong>Route updates:</strong> ' + reroutes + ' incident(s) include rerouting or path changes.');
        insights.push('<strong>Notification coverage:</strong> ' + notifiedCount + ' supervisor account(s) are linked to SMS records.');
        if (metrics && metrics.avg_response_time) insights.push('<strong>Response metric:</strong> Average response time is ' + esc(metrics.avg_response_time) + '.');
    } else {
        insights.push('<strong>No incident data:</strong> The system has no fire incident records for this date.');
    }
    var list = document.getElementById('aiInsightList');
    if (list) list.innerHTML = insights.map(function (txt) {
        return '<div class="ai-insight-item"><span class="ai-dot"></span><div class="ai-insight-text">' + txt + '</div></div>';
    }).join('');
}

function renderBottlenecks() {
    var counts = countCorridorUsage();
    var rows = Object.keys(counts).map(function (c) { return { corridor: c, count: counts[c] }; })
        .sort(function (a,b) { return b.count - a.count; })
        .filter(function (x) { return x.count > 0; })
        .slice(0, 4);
    var list = document.getElementById('bottleneckList');
    if (!list) return;
    if (!rows.length) { list.innerHTML = '<div class="admin-cell-muted">No corridor risk records for this date.</div>'; return; }
    list.innerHTML = rows.map(function (x, idx) {
        var cls = idx === 0 ? 'bn-dot-red' : 'bn-dot-yellow';
        var level = idx === 0 ? 'Highest involvement' : 'Monitored involvement';
        return '<div class="bottleneck-item"><span class="bn-dot ' + cls + '"></span><div><div class="bn-name">Corridor ' + esc(x.corridor) + '</div><div class="bn-meta">' + level + ' · ' + x.count + ' incident reference(s)</div></div></div>';
    }).join('');
}

function renderTimeline() {
    var list = document.getElementById('timelineList');
    if (!list) return;
    var reports = (REPORTS_DATA || []).slice().sort(function (a,b) {
        return String(a.time || '').localeCompare(String(b.time || ''));
    }).slice(0, 6);
    if (!reports.length) { list.innerHTML = '<div class="admin-cell-muted">No timeline events available.</div>'; return; }
    list.innerHTML = reports.map(function (r, i) {
        var dot = i === 0 ? 'tl-dot-red' : (i === reports.length - 1 ? 'tl-dot-green' : 'tl-dot-blue');
        return '<div class="timeline-item">' +
            '<div class="timeline-icon-col"><span class="timeline-dot ' + dot + '"></span>' + (i < reports.length - 1 ? '<span class="timeline-line"></span>' : '') + '</div>' +
            '<div><div class="timeline-event">INC-' + esc(r.id) + ' detected</div><div class="timeline-desc">' + esc(r.shop_name || 'Unknown location') + '</div><div class="timeline-time">' + esc(r.time || '—') + '</div></div>' +
        '</div>';
    }).join('');
}

/* ══ Charts — English locale enforced ══ */
function renderCharts() { renderIncidentChart(); renderHeatmapChart(); }

function renderIncidentChart() {
    var canvas = document.getElementById('tempChart');
    if (!canvas || !window.Chart) return;
    var reports = (REPORTS_DATA || []).slice().sort(function (a,b) {
        return String(a.time || '').localeCompare(String(b.time || ''));
    });
    var labels     = reports.length ? reports.map(function (r) { return r.time || ('INC-' + r.id); }) : ['No data'];
    var people     = reports.length ? reports.map(function (r) { return Number(r.total_people || 0); }) : [0];
    var shopPeople = reports.length ? reports.map(function (r) { return Number(r.shop_people || 0); }) : [0];
    if (tempChartInstance) tempChartInstance.destroy();
    tempChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total People',
                    data: people,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 3,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)'
                },
                {
                    label: 'High-Risk Zone People',
                    data: shopPeople,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 3,
                    borderColor: '#f472b6',
                    backgroundColor: 'rgba(244,114,182,0.08)'
                }
            ]
        },
        options: {
            locale: 'en-US',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'DM Sans, Inter, sans-serif', size: 11 } } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { family: 'DM Mono, monospace', size: 11 },
                        // ← force western digits
                        callback: function(value) { return Number(value).toLocaleString('en-US'); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'DM Mono, monospace', size: 10 }, maxRotation: 35 }
                }
            }
        }
    });
}

function renderHeatmapChart() {
    var canvas = document.getElementById('heatmapChart');
    if (!canvas || !window.Chart) return;
    var counts = countCorridorUsage();
    var max = Math.max(1, Math.max.apply(null, Object.keys(counts).map(function (c) { return counts[c]; })));
    var labels = Object.keys(counts).map(function (c) { return 'Corridor ' + c; });
    var values = Object.keys(counts).map(function (c) { return +(counts[c] / max).toFixed(2); });
    var bg = values.map(function (v) {
        if (v >= 0.67) return 'rgba(239,68,68,0.85)';
        if (v >= 0.34) return 'rgba(245,158,11,0.85)';
        return 'rgba(16,185,129,0.85)';
    });
    if (heatmapChartInstance) heatmapChartInstance.destroy();
    heatmapChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Relative Risk',
                data: values,
                backgroundColor: bg,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            locale: 'en-US',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) { return ' Risk: ' + (ctx.raw * 100).toFixed(0) + '%'; }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 1,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        font: { family: 'DM Mono, monospace', size: 11 },
                        callback: function (v) { return (v * 100).toFixed(0) + '%'; }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'DM Sans, Inter, sans-serif', size: 11 } }
                }
            }
        }
    });
}

/* ══ Metrics + live SMS ══ */
function loadReportMetrics() {
    fetch('/admin/reports_metrics')
        .then(function (r) { return r.json(); })
        .then(function (m) {
            if (!m || m.error) return;
            setText('kpiEvacuationEvents', m.evacuation_events != null ? m.evacuation_events : (REPORTS_DATA || []).length);
            setText('kpiResponseTime', m.avg_response_time || '—');
            setText('kpiEvacTime', m.avg_evacuation_time || '—');
            setText('kpiAiAccuracy', m.ai_accuracy != null ? (m.ai_accuracy + '%') : '—');
            renderAIInsights(m);
        })
        .catch(function () { renderAIInsights(); });
}

function pollReportSmsStatus() {
    if (!REPORT_DATE) return;
    fetch('/report_details_sms_status/' + encodeURIComponent(REPORT_DATE))
        .then(function (r) { return r.json(); })
        .then(function (payload) {
            if (!payload || payload.status !== 'ok') return;
            NOTIFIED_DATA = payload.notified || [];
            NOTIFIED_BY_REPORT_DATA = payload.notified_by_report || {};
            renderSummary();
            renderIncidentBlocks();
            renderSmsTable();
            renderNotificationPanel();
            renderSidePanels();
        })
        .catch(function () {});
}

function refreshData() {
    pollReportSmsStatus();
    loadReportMetrics();
    fetch('/get_people').then(function (r) { return r.json(); }).then(function (d) {
        if (d && typeof d.total_people !== 'undefined') setText('totalPeopleStat', d.total_people || 0);
    }).catch(function () {});
    showToast('Refreshed', 'Report data refreshed from the current system.', 'success');
}


function setDetailActiveRoleTab(role) {
    document.querySelectorAll('.role-tabs .role-tab').forEach(function (tab) {
        var isActive = tab.textContent.trim() === role;
        tab.classList.toggle('active', isActive);
        tab.title = isActive ? 'Current login role' : 'Role is controlled by login account';
    });
}

/* ══ Role Permissions ══ */
var DETAIL_ROLE_PERMISSIONS = {
    Admin: {
        canViewNotifs: true, canExportDetail: true, canPrintReport: true,
        bannerClass: 'admin',
        bannerText: 'Full access — all incident details, evacuation paths, and export enabled',
        badgeLabel: 'Admin Mode', badgeClass: 'badge-admin',
        dropdownBanner: 'admin',
        dropdownBannerText: 'Full access: all supervisors, alarms, reports & settings'
    },
    Manager: {
        canViewNotifs: true, canExportDetail: true, canPrintReport: false,
        bannerClass: 'manager',
        bannerText: 'Manager access — view all details and export; printing is restricted',
        badgeLabel: 'Manager Mode', badgeClass: 'badge-manager',
        dropdownBanner: 'manager',
        dropdownBannerText: 'Manager access: view reports and export; settings restricted'
    },
    Safety: {
        canViewNotifs: false, canExportDetail: false, canPrintReport: false,
        bannerClass: 'safety',
        bannerText: 'Safety view — incidents and evacuation paths visible; SMS log restricted',
        badgeLabel: 'Safety Mode', badgeClass: 'badge-safety',
        dropdownBanner: 'safety',
        dropdownBannerText: 'Safety view: incident paths visible; analytics and export restricted'
    }
};
var currentDetailRole = 'Admin';

function applyDetailRolePermissions(role) {
    var cfg = DETAIL_ROLE_PERMISSIONS[role] || DETAIL_ROLE_PERMISSIONS.Admin;
    currentDetailRole = role;

    /* Permission banner removed from UI; role permissions are shown via modal only. */

    var dropBanner = document.getElementById('permissionsBanner');
    if (dropBanner) { dropBanner.className = 'permissions-banner ' + cfg.dropdownBanner; dropBanner.textContent = cfg.dropdownBannerText; }

    var exp = document.getElementById('btnExportDetail');
    if (exp) { exp.disabled = !cfg.canExportDetail; exp.style.opacity = cfg.canExportDetail ? '1' : '0.38'; exp.style.cursor = cfg.canExportDetail ? 'pointer' : 'not-allowed'; }

    var prt = document.getElementById('btnPrintDetail');
    if (prt) { prt.disabled = !cfg.canPrintReport; prt.style.opacity = cfg.canPrintReport ? '1' : '0.38'; prt.style.cursor = cfg.canPrintReport ? 'pointer' : 'not-allowed'; }

    toggleCardAccess('notifCard', cfg.canViewNotifs, 'SMS log restricted for ' + role + ' role');

    document.querySelectorAll('.role-tabs .role-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.textContent.trim() === role);
    });

    var fb = document.getElementById('detFooterRoleBadge');
    if (fb) { fb.className = 'rpt-footer-badge ' + cfg.badgeClass; fb.textContent = cfg.badgeLabel; }

    if (window.lucide) lucide.createIcons();
}

function toggleCardAccess(id, canView, msg) {
    var card = document.getElementById(id);
    if (!card) return;
    var ex = card.querySelector('.det-access-overlay');
    if (!canView) {
        card.style.opacity = '0.38';
        card.style.pointerEvents = 'none';
        card.style.filter = 'grayscale(1)';
        card.style.position = 'relative';
        if (!ex) {
            var ov = document.createElement('div');
            ov.className = 'det-access-overlay';
            ov.innerHTML = '<i data-lucide="lock" style="width:14px;height:14px;"></i> ' + esc(msg);
            card.appendChild(ov);
        }
    } else {
        card.style.opacity = '1';
        card.style.pointerEvents = '';
        card.style.filter = '';
        if (ex) ex.remove();
    }
    if (window.lucide) lucide.createIcons();
}

function switchDetailRole(el) {
    var requestedRole = el.textContent.trim();
    var role = window.FREDT_CURRENT_ROLE || currentDetailRole || 'Safety';

    if (requestedRole !== role) {
        setDetailActiveRoleTab(role);
        if (typeof showToast === 'function') {
            showToast('Role locked', 'Permissions come from the logged-in account: ' + role, 'warning');
        }
        openDetailRoleModal(role);
        return;
    }

    applyDetailRolePermissions(role);
    setDetailActiveRoleTab(role);
    openDetailRoleModal(role);
}

function detailRoleSvg(role) {
    if (role === 'Manager') {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>';
    }
    if (role === 'Safety') {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
}

function getDetailRoleModalInfo(role) {
    var info = {
        Admin: {
            title: 'Admin Access',
            desc: 'Full report access for incident details, evacuation paths, SMS records, export, and print actions.',
            perms: ['View all incident details', 'View SMS notification records', 'Export report data', 'Print report summary']
        },
        Manager: {
            title: 'Manager Access',
            desc: 'Operational report access for reviewing incident details and exporting report data. Printing is restricted.',
            perms: ['View all incident details', 'View SMS notification records', 'Export report data', 'Print action restricted']
        },
        Safety: {
            title: 'Safety Access',
            desc: 'Safety view focused on incidents and evacuation paths. SMS logs, export, and print actions are restricted.',
            perms: ['View incident details', 'View evacuation paths', 'SMS records restricted', 'Export and print restricted']
        }
    };
    return info[role] || info.Admin;
}

function openDetailRoleModal(role) {
    var modal = document.getElementById('roleModal');
    if (!modal) return;

    var info = getDetailRoleModalInfo(role);
    var icon = document.getElementById('roleModalIcon');
    var title = document.getElementById('roleModalTitle');
    var desc = document.getElementById('roleModalDesc');
    var perms = document.getElementById('roleModalPerms');

    if (icon) icon.innerHTML = detailRoleSvg(role);
    if (title) title.textContent = info.title;
    if (desc) desc.textContent = info.desc;
    if (perms) {
        perms.innerHTML = info.perms.map(function (p) {
            var blocked = /restricted/i.test(p);
            return '<div class="role-perm-item ' + (blocked ? 'restricted' : 'allowed') + '">' +
                '<span class="role-perm-mark">' + (blocked ? '!' : '✓') + '</span>' +
                '<span>' + esc(p) + '</span>' +
            '</div>';
        }).join('');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeRoleModal() {
    var modal = document.getElementById('roleModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

/* ══ UI Actions ══ */
function toggleBlock(idx) {
    var body = document.getElementById('body-' + idx);
    var arrow = document.getElementById('arrow-' + idx);
    if (!body || !arrow) return;
    var open = body.classList.contains('open');
    body.classList.toggle('open', !open);
    arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function exportDetailCSV() {
    var cfg = DETAIL_ROLE_PERMISSIONS[currentDetailRole] || DETAIL_ROLE_PERMISSIONS.Admin;
    if (!cfg.canExportDetail) { showToast('Access Denied', 'Your role cannot export CSV.', 'error'); return; }
    if (!(REPORTS_DATA || []).length) { showToast('No Data', 'No data to export.', 'warning'); return; }
    var hdr = ['ID','Shop','Time','Exit','Corridors','Fire Corridor','Total People','Shop People'];
    var rows = (REPORTS_DATA || []).map(function (r) {
        var exit = lastPipe(r.exit_name) || '—';
        var corr = lastPipe(r.corridors) || '—';
        return ['INC-' + r.id, '"' + String(r.shop_name || '').replace(/"/g, '""') + '"', r.time || '', '"' + exit + '"', '"' + corr + '"', '"' + (r.fire_corridor || '') + '"', r.total_people || 0, r.shop_people || 0];
    });
    var csv = [hdr].concat(rows).map(function (row) { return row.join(','); }).join('\n');
    var blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'fredt_report_' + String(REPORT_DATE).replace(/[\s,\/]/g, '_') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported', 'CSV downloaded successfully.', 'success');
}

function printDetail() {
    var cfg = DETAIL_ROLE_PERMISSIONS[currentDetailRole] || DETAIL_ROLE_PERMISSIONS.Admin;
    if (!cfg.canPrintReport) { showToast('Access Denied', 'Your role cannot print reports.', 'error'); return; }
    window.print();
}

function bindHeaderDropdowns() {
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.profile-wrapper')) {
            var dd = document.getElementById('profileDropdown');
            if (dd) dd.classList.remove('open');
        }
        if (!e.target.closest('.notification-wrapper')) {
            var np = document.getElementById('notificationPanel');
            if (np) np.classList.remove('show');
        }
    });
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeRoleModal();
        closeProfileDropdown();
        var np = document.getElementById('notificationPanel');
        if (np) np.classList.remove('show');
    }
});

function toggleProfileDropdown() { var dd = document.getElementById('profileDropdown'); if (dd) dd.classList.toggle('open'); }
function closeProfileDropdown() { var dd = document.getElementById('profileDropdown'); if (dd) dd.classList.remove('open'); }
function toggleNotifications() { var p = document.getElementById('notificationPanel'); if (p) p.classList.toggle('show'); }

function initSidebarUser() {
    fetch('/api/current_user')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var role = data.role_key || 'Safety';
            window.FREDT_CURRENT_ROLE = role;
            window.FREDT_CURRENT_PERMISSIONS = data.permissions || {};
            setUserUI(data.full_name || data.username || '--', data.role_text || 'User', data.role_badge || role);
            applyDetailRolePermissions(role);
            setDetailActiveRoleTab(role);
        })
        .catch(function () {
            window.FREDT_CURRENT_ROLE = 'Safety';
            setUserUI('--', 'Safety Officer', 'SAFETY');
            applyDetailRolePermissions('Safety');
            setDetailActiveRoleTab('Safety');
        });
}
function setUserUI(name, role, badge) {
    var initials = name ? String(name).substring(0, 2).toUpperCase() : '--';
    ['sidebarAvatar', 'headerAvatar', 'dropdownAvatar'].forEach(function (id) { setText(id, initials); });
    setText('sidebarUsername', name || '--');
    setText('sidebarRole', role || 'User');
    setText('dropdownFullName', name || '--');
    setText('dropdownRoleText', role || 'User');
    setText('dropdownRoleBadge', badge || role || 'User');
}

function initFooterTimer() {
    var start = Date.now();
    setInterval(function () {
        var el = document.getElementById('footerLastUpdated');
        if (!el) return;
        var s = Math.round((Date.now() - start) / 1000);
        if (s < 5) el.textContent = 'Last updated just now';
        else if (s < 60) el.textContent = 'Last updated ' + s + 's ago';
        else el.textContent = 'Last updated ' + Math.round(s / 60) + 'm ago';
    }, 4000);
}

function animateStripCards() {
    document.querySelectorAll('.strip-card').forEach(function (c, i) {
        c.style.opacity = '0';
        c.style.transform = 'translateY(14px)';
        c.style.transition = 'opacity .35s ease, transform .35s ease';
        setTimeout(function () { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }, 55 + i * 75);
    });
}

function showToast(title, msg, type) {
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'evac-toast toast-' + (type || 'info');
    t.innerHTML = '<div class="t-body"><div class="t-title">' + esc(title) + '</div><div class="t-msg">' + esc(msg) + '</div></div><button class="t-close" onclick="this.parentElement.remove()">✕</button>';
    c.appendChild(t);
    setTimeout(function () { if (t.parentElement) t.remove(); }, 4000);
}

/* ══ Init ══ */
function initialRender() {
    renderSummary();
    renderIncidentBlocks();
    renderSmsTable();
    renderNotificationPanel();
    renderSidePanels();
    renderCharts();
    loadReportMetrics();
    if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', function () {
    // Set Chart.js global locale to English so axis ticks use Western digits
    if (window.Chart) {
        Chart.defaults.locale = 'en-US';
    }
    initSidebarUser();
    bindHeaderDropdowns();
    initFooterTimer();
    animateStripCards();
    // Sidebar navigation styles
    initialRender();
    pollReportSmsStatus();
    setInterval(pollReportSmsStatus, 2000);
});
