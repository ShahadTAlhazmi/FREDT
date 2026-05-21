/* =====================================================
   EvacMonitor — main.js
   ===================================================== */

/* =====================================================
   Toast notification system
   ===================================================== */
function getToastIconSVG(type) {
    var icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>',
        danger:  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 19h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
        info:    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        fire:    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0C17 7 12 2 12 2z"/><path d="M12 12c0 0-2 2-2 4a2 2 0 0 0 4 0C14 14 12 12 12 12z"/></svg>',
    };
    return icons[type] || icons.info;
}

function showToast(title, msg, type, duration) {
    msg      = msg      || '';
    type     = type     || 'info';
    duration = duration || 4000;

    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast       = document.createElement('div');
    toast.className = 'evac-toast toast-' + type;
    toast.style.setProperty('--toast-duration', duration + 'ms');
    toast.innerHTML =
        '<span class="t-icon">' + getToastIconSVG(type) + '</span>' +
        '<div class="t-body">' +
            '<div class="t-title">' + title + '</div>' +
            (msg ? '<div class="t-msg">' + msg + '</div>' : '') +
        '</div>' +
        '<button class="t-close" onclick="dismissToast(this.parentElement)">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';

    container.appendChild(toast);
    toast._timer = setTimeout(function () { dismissToast(toast); }, duration);
}

function dismissToast(toast) {
    if (!toast) return;
    clearTimeout(toast._timer);
    toast.classList.add('hide');
    toast.addEventListener('animationend', function () { toast.remove(); }, { once: true });
}

/* =====================================================
   NOTIFICATIONS
   ===================================================== */
function toggleNotifications() {
    var panel = document.getElementById('notificationPanel');
    if (panel) panel.classList.toggle('show');
}

window.addEventListener('click', function (e) {
    var panel = document.getElementById('notificationPanel');
    var btn   = document.querySelector('.notif-btn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('show');
    }
});

/* =====================================================
   PROFILE DROPDOWN
   ===================================================== */
function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('open');
}
function closeProfileDropdown() {
    document.getElementById('profileDropdown').classList.remove('open');
}
document.addEventListener('click', function (e) {
    var wrapper = document.querySelector('.profile-wrapper');
    if (wrapper && !wrapper.contains(e.target)) closeProfileDropdown();
});

/* =====================================================
   HELPERS
   ===================================================== */
function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Compatibility fix
function updateFireSimTime(val) {
    var t = (Number(val) || 0).toFixed(1) + 's';
    var el = document.getElementById('simTimeDisplay');
    if (el) el.innerText = t;
}

/* =====================================================
   LOAD CURRENT USER
   ===================================================== */
function loadCurrentUser() {
    fetch('/api/current_user')
        .then(function (r) { return r.json(); })
        .then(function (u) {
            setText('sidebarAvatar',     u.initials   || '--');
            setText('sidebarUsername',   u.full_name  || 'Unknown');
            setText('sidebarRole',       u.role_text  || '--');
            setText('headerAvatar',      u.initials   || '--');
            setText('dropdownAvatar',    u.initials   || '--');
            setText('dropdownFullName',  u.full_name  || 'Unknown');
            setText('dropdownRoleText',  u.role_text  || '--');
            setText('dropdownRoleBadge', u.role_badge || '--');

            rememberServerRole(u);
            var roleKey = CURRENT_SERVER_ROLE;
            applyRolePermissions(roleKey);
            setActiveRoleTab(roleKey);
            applyServerPermissionHints();
        })
        .catch(function () {
            // Implementation note
            CURRENT_SERVER_ROLE = 'Safety';
            CURRENT_SERVER_PERMISSIONS = {};
            applyRolePermissions('Safety');
            setActiveRoleTab('Safety');
        });
}

/* =====================================================
   ROLE TABS
   ===================================================== */
// Implementation note
var ROLE_ICONS = {
    Admin:   '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d6b4f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    Manager: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    Safety:  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

var PERM_ICONS = {
    allow: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>',
    deny:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

const roleData = {
    Admin: {
        icon: ROLE_ICONS.Admin,
        desc: 'Full system access. Manage all incidents, simulators, and settings.',
        perms: [
            ['allow', 'View dashboard'],
            ['allow', 'Trigger alarms'],
            ['allow', 'Use simulators'],
            ['allow', 'Manage users'],
            ['allow', 'Export reports']
        ]
    },
    Manager: {
        icon: ROLE_ICONS.Manager,
        desc: 'Operational oversight. Monitor and respond to incidents.',
        perms: [
            ['allow', 'View dashboard'],
            ['allow', 'Trigger alarms'],
            ['allow', 'Send alerts'],
            ['deny',  'Use simulators'],
            ['deny',  'Manage users']
        ]
    },
    Safety: {
        icon: ROLE_ICONS.Safety,
        desc: 'Safety monitoring. View and report hazards.',
        perms: [
            ['allow', 'View dashboard'],
            ['deny',  'Trigger alarms'],
            ['allow', 'Send alerts'],
            ['deny',  'Use simulators'],
            ['deny',  'Manage users']
        ]
    },
};

// Derived permission config per role (controls UI buttons/sections)
var ROLE_ACTIONS = {
    Admin:   { enabledActions: ['alarmBtn', 'lockBtn', 'alertBtn'], banner: { cls: 'admin',   text: 'Full access: simulators, alarms, reports & settings' }, roleBadge: 'ADMIN',  roleText: 'System Admin'     },
    Manager: { enabledActions: ['alertBtn'],                        banner: { cls: 'manager', text: 'Monitor & report access - simulators restricted'      }, roleBadge: 'MGR',    roleText: 'Building Manager' },
    Safety:  { enabledActions: ['alarmBtn', 'lockBtn'],             banner: { cls: 'safety',  text: 'Emergency controls enabled - settings restricted'     }, roleBadge: 'SAFETY', roleText: 'Safety Officer'   },
};

var currentRole = 'Admin';
var CURRENT_SERVER_ROLE = 'Admin';
var CURRENT_SERVER_PERMISSIONS = {};
var ROLE_LOCKED_TO_LOGIN = true;

function setActiveRoleTab(role) {
    document.querySelectorAll('#roleTabs .role-tab, .role-tabs .role-tab').forEach(function (tab) {
        var isActive = tab.textContent.trim() === role;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-current', isActive ? 'true' : 'false');
        tab.title = isActive ? 'Current login role' : 'Role is controlled by login account';
    });
}

function rememberServerRole(user) {
    CURRENT_SERVER_ROLE = user.role_key || 'Safety';
    CURRENT_SERVER_PERMISSIONS = user.permissions || {};
    window.FREDT_CURRENT_ROLE = CURRENT_SERVER_ROLE;
    window.FREDT_CURRENT_PERMISSIONS = CURRENT_SERVER_PERMISSIONS;
    document.body.setAttribute('data-role', CURRENT_SERVER_ROLE);
}

function applyServerPermissionHints() {
    var perms = CURRENT_SERVER_PERMISSIONS || {};

    // Hide Admin Management from roles that cannot view it if backend later disables it.
    if (perms.can_view_admin === false) {
        document.querySelectorAll('a[href="/admin"]').forEach(function (a) { a.style.display = 'none'; });
    }

    // General export buttons.
    if (perms.can_export_reports === false) {
        document.querySelectorAll('[data-permission="export"], #btnExportCSV, #btnExportDetail').forEach(function (el) {
            el.disabled = true;
            el.style.opacity = '0.38';
            el.style.cursor = 'not-allowed';
            el.title = 'Not available for ' + CURRENT_SERVER_ROLE + ' role';
        });
    }
}


function switchRole(el) {
    var requestedRole = el.textContent.trim();

    if (ROLE_LOCKED_TO_LOGIN && requestedRole !== CURRENT_SERVER_ROLE) {
        setActiveRoleTab(CURRENT_SERVER_ROLE);
        if (typeof showToast === 'function') {
            showToast('Role locked', 'Permissions come from the logged-in account: ' + CURRENT_SERVER_ROLE, 'warning');
        }
        showRoleModal(CURRENT_SERVER_ROLE);
        return;
    }

    currentRole = CURRENT_SERVER_ROLE || requestedRole;
    applyRolePermissions(currentRole);
    setActiveRoleTab(currentRole);
    showRoleModal(currentRole);
}

function applyRolePermissions(role) {
    var cfg = ROLE_ACTIONS[role];
    if (!cfg) return;
    currentRole = role;

    setText('dropdownRoleText',  cfg.roleText);
    setText('dropdownRoleBadge', cfg.roleBadge);

    var banner = document.getElementById('permissionsBanner');
    if (banner) {
        banner.className   = 'permissions-banner ' + cfg.banner.cls;
        banner.textContent = cfg.banner.text;
    }

    ['alarmBtn', 'lockBtn', 'alertBtn'].forEach(function (id) {
        var btn = document.getElementById(id);
        if (!btn) return;
        var on        = cfg.enabledActions.includes(id);
        btn.disabled      = !on;
        btn.style.opacity = on ? '1' : '0.4';
        btn.style.cursor  = on ? 'pointer' : 'not-allowed';
        btn.title         = on ? '' : 'Not available for ' + role + ' role';
    });

    document.querySelectorAll('.admin-only select, .admin-only input, .admin-only button')
        .forEach(function (el) {
            var off      = (role !== 'Admin');
            el.disabled      = off;
            el.style.opacity = off ? '0.45' : '1';
            el.style.cursor  = off ? 'not-allowed' : '';
        });

    document.querySelectorAll('.admin-only').forEach(function (section) {
        var off                  = (role !== 'Admin');
        section.style.opacity       = off ? '0.5' : '1';
        section.style.pointerEvents = off ? 'none' : '';
    });
}

function showRoleModal(role) {
    var data = roleData[role];
    if (!data) return;

    // Implementation note
    var iconEl = document.getElementById('roleModalIcon');
    if (iconEl) iconEl.innerHTML = data.icon;

    setText('roleModalTitle', role);
    setText('roleModalDesc',  data.desc);

    document.getElementById('roleModalPerms').innerHTML =
        data.perms.map(function (p) {
            var svg = PERM_ICONS[p[0]] || PERM_ICONS.deny;
            return '<div class="role-perm-item"><span class="perm-icon">' + svg + '</span>' + p[1] + '</div>';
        }).join('');

    document.getElementById('roleModal').style.display = 'flex';
}

function closeRoleModal() {
    document.getElementById('roleModal').style.display = 'none';
}

/* =====================================================
   MAP ZOOM
   ===================================================== */
var currentZoom = 100;

function zoomMap(delta) {
    currentZoom = Math.min(200, Math.max(50, currentZoom + delta));
    setText('zoomLabel', currentZoom + '%');
    var svg = document.getElementById('map');
    if (svg) {
        svg.style.transformOrigin = 'center';
        svg.style.transform       = 'scale(' + currentZoom / 100 + ')';
    }
}

function resetZoom() {
    currentZoom = 100;
    setText('zoomLabel', '100%');
    var svg = document.getElementById('map');
    if (svg) svg.style.transform = 'scale(1)';
}

/* =====================================================
   EMERGENCY MODE
   ===================================================== */
function toggleEmergencyMode(checkbox) {
    var label = document.querySelector('.toggle-label');
    if (checkbox.checked) {
        document.body.classList.add('dark-mode');
        if (label) { label.style.color = 'var(--danger)'; label.style.fontWeight = '700'; }
        showToast('Emergency Mode Activated', 'All safety protocols have been engaged', 'danger');
    } else {
        document.body.classList.remove('dark-mode');
        if (label) { label.style.color = ''; label.style.fontWeight = ''; }
        showToast('Emergency Mode Deactivated', 'System returned to normal operation', 'success');
    }
}

/* =====================================================
   QUICK ACTIONS
   ===================================================== */
var alarmActive = false;

function triggerAlarm() {
    var btn   = document.getElementById('alarmBtn');
    var audio = document.getElementById('alarm');
    alarmActive = !alarmActive;
    if (alarmActive) {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17.25 17.25A4.5 4.5 0 0 1 12 21a4.5 4.5 0 0 1-4.5-4.5"/><line x1="8.8" y1="8.8" x2="15.2" y2="15.2"/></svg> Stop Alarm';
        btn.style.cssText = 'background:var(--danger);color:white;border-color:var(--danger);justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;border:none;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
        if (audio) { audio.loop = true; audio.play().catch(function () {}); }
        showToast('Alarm Triggered!', 'Emergency signal broadcasting to all zones', 'danger', 6000);
    } else {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Trigger Alarm';
        btn.style.cssText = 'background:#fef2f2;color:var(--danger);border:1px solid #fecaca;justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
        if (audio) { audio.pause(); audio.currentTime = 0; }
        showToast('Alarm Stopped', 'Signal deactivated successfully', 'success');
    }
}

var corridorLocked = false;

function toggleLock(btn) {
    corridorLocked = !corridorLocked;
    if (corridorLocked) {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> Unlock Corridor';
        btn.style.cssText = 'background:#fffbeb;border:1px solid #f59e0b;color:#92400e;justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
        showToast('Corridor Locked', 'Access restricted for selected corridor', 'warning');
    } else {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Lock Corridor';
        btn.style.cssText = 'background:var(--card-bg);color:var(--text-primary);border:1px solid var(--border);justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
        showToast('Corridor Unlocked', 'Access restored for selected corridor', 'success');
    }
}

function sendAlert() {
    var btn = document.getElementById('alertBtn');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Alert Sent!';
    btn.style.cssText = 'background:#f0fdf4;border:1px solid #22c55e;color:#15803d;justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
    showToast('Alert Sent', 'Notification dispatched to all registered users', 'success');
    setTimeout(function () {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Alert';
        btn.style.cssText = 'background:var(--card-bg);color:var(--text-primary);border:1px solid var(--border);justify-content:center;gap:6px;width:100%;padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;';
    }, 2500);
}

/* =====================================================
   Project section
   ===================================================== */
var VALID_SIM_CORRIDORS = [
    'Corridor A', 'Corridor B', 'Corridor C', 'Corridor D',
    'Corridor E', 'Corridor F', 'Corridor G'
];

function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
}

function toFiniteNumber(value) {
    if (isBlank(value)) return null;
    var n = Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
}

function clearSimFieldErrors(ids) {
    ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('sim-input-error');
        el.style.borderColor = '';
        el.style.boxShadow = '';
    });
}

function markSimFieldError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('sim-input-error');
    el.style.borderColor = '#ef4444';
    el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.14)';
}

function showSimValidationError(title, message, fieldId) {
    if (fieldId) markSimFieldError(fieldId);
    showToast(title || 'Invalid Input', message || 'Please check simulator values.', 'warning', 5000);
}

function validateTimeRange(startRaw, endRaw, startFieldId, endFieldId) {
    var startVal = toFiniteNumber(startRaw);
    var endVal   = toFiniteNumber(endRaw);

    if (startVal === null) {
        showSimValidationError('Invalid Start Time', 'Start time is required and must be a valid number.', startFieldId);
        return null;
    }
    if (endVal === null) {
        showSimValidationError('Invalid End Time', 'End time is required and must be a valid number.', endFieldId);
        return null;
    }
    if (startVal < 0) {
        showSimValidationError('Invalid Start Time', 'Start time cannot be negative.', startFieldId);
        return null;
    }
    if (endVal < 0) {
        showSimValidationError('Invalid End Time', 'End time cannot be negative.', endFieldId);
        return null;
    }
    if (endVal <= startVal) {
        showSimValidationError('Invalid Time Range', 'End time must be greater than start time.', endFieldId);
        return null;
    }

    return { start: startVal, end: endVal };
}

function validateFireSimulatorInput(shopVal, startRaw, endRaw) {
    clearSimFieldErrors(['simShop', 'simStart', 'simEnd']);

    if (isBlank(shopVal)) {
        showSimValidationError('Missing Shop', 'Please select a shop for the fire event.', 'simShop');
        return null;
    }

    var parts = String(shopVal).split(',');
    var row = toFiniteNumber(parts[0]);
    var col = toFiniteNumber(parts[1]);

    if (parts.length !== 2 || row === null || col === null || row < 0 || col < 0 || !Number.isInteger(row) || !Number.isInteger(col)) {
        showSimValidationError('Invalid Shop', 'Selected shop location is invalid.', 'simShop');
        return null;
    }

    var range = validateTimeRange(startRaw, endRaw, 'simStart', 'simEnd');
    if (!range) return null;

    return { row: row, col: col, start: range.start, end: range.end };
}

function validateCongestionSimulatorInput(corridor, peopleRaw, startRaw, endRaw) {
    clearSimFieldErrors(['simCorridor', 'simPeople', 'simCongStart', 'simCongEnd']);

    if (isBlank(corridor)) {
        showSimValidationError('Missing Corridor', 'Please select a corridor for the crowd event.', 'simCorridor');
        return null;
    }
    if (!VALID_SIM_CORRIDORS.includes(corridor)) {
        showSimValidationError('Invalid Corridor', 'Selected corridor does not exist.', 'simCorridor');
        return null;
    }

    var people = toFiniteNumber(peopleRaw);
    if (people === null) {
        showSimValidationError('Invalid People Count', 'People count is required and must be a valid number.', 'simPeople');
        return null;
    }
    if (!Number.isInteger(people)) {
        showSimValidationError('Invalid People Count', 'People count must be a whole number.', 'simPeople');
        return null;
    }
    if (people < 0) {
        showSimValidationError('Invalid People Count', 'People count cannot be negative.', 'simPeople');
        return null;
    }
    if (people === 0) {
        showSimValidationError('Invalid People Count', 'People count must be greater than 0 to create a crowd event.', 'simPeople');
        return null;
    }

    var range = validateTimeRange(startRaw, endRaw, 'simCongStart', 'simCongEnd');
    if (!range) return null;

    return { corridor: corridor, people: people, start: range.start, end: range.end };
}

function handleSimulatorResponse(payload, fallbackMessage) {
    if (payload && payload.success === false) {
        throw new Error(payload.error || fallbackMessage || 'Simulator request failed.');
    }
    if (payload && payload.status === 'error') {
        throw new Error(payload.error || payload.message || fallbackMessage || 'Simulator request failed.');
    }
    return payload;
}

/* =====================================================
   FIRE SIMULATOR
   ===================================================== */
var fireSimInterval = null;
var fireSimTime     = 0;

function addSimFire() {
    var shopVal = document.getElementById('simShop').value;
    var start   = document.getElementById('simStart').value;
    var end     = document.getElementById('simEnd').value;

    var valid = validateFireSimulatorInput(shopVal, start, end);
    if (!valid) return;

    var sel      = document.getElementById('simShop');
    var shopName = sel.options[sel.selectedIndex].text;

    fetch('/add_sim_fire', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
            row  : valid.row,
            col  : valid.col,
            start: valid.start,
            end  : valid.end
        })
    })
    .then(function (r) { return r.json(); })
    .then(function (payload) { return handleSimulatorResponse(payload, 'Could not add fire simulation event'); })
    .then(function () {
        document.getElementById('simFireList').innerHTML +=
            '<div data-sim-type="fire" data-start="' + valid.start + '" data-end="' + valid.end + '" ' +
            'style="background:#fef2f2;padding:4px 8px;border-radius:4px;border-left:3px solid #ef4444;font-size:11.5px;">' +
            '[FIRE] ' + shopName + ' | ' + valid.start + 's to ' + valid.end + 's</div>';
        document.getElementById('simShop').value  = '';
        document.getElementById('simStart').value = '';
        document.getElementById('simEnd').value   = '';
        clearSimFieldErrors(['simShop', 'simStart', 'simEnd']);
        showToast('Fire Event Added', shopName + ' scheduled ' + valid.start + 's to ' + valid.end + 's', 'fire');
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', err.message || 'Could not add fire simulation event', 'danger');
    });
}

function startSim() {
    var maxEnd = 0;
    var eventCount = 0;

    document.querySelectorAll('#simFireList div').forEach(function (div) {
        eventCount += 1;
        var endTime = toFiniteNumber(div.getAttribute('data-end'));
        if (endTime === null) {
            var match = div.textContent.match(/to\s*([\d.]+)s/);
            endTime = match ? parseFloat(match[1]) : null;
        }
        if (endTime !== null && endTime > maxEnd) maxEnd = endTime;
    });

    if (eventCount === 0 || maxEnd <= 0) {
        showToast('No Events', 'Please add at least one valid fire event first.', 'warning');
        return;
    }

    fetch('/start_sim', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function (payload) { return handleSimulatorResponse(payload, 'Could not start the simulation'); })
    .then(function () {
        if (fireSimInterval) clearInterval(fireSimInterval);
        fireSimTime = 0;
        setText('simTimeDisplay', '0.0s');

        fireSimInterval = setInterval(function () {
            fireSimTime = parseFloat((fireSimTime + 0.1).toFixed(1));
            setText('simTimeDisplay', fireSimTime.toFixed(1) + 's');

            if (maxEnd > 0 && fireSimTime >= maxEnd) {
                clearInterval(fireSimInterval);
                fireSimInterval = null;
                setText('simTimeDisplay', maxEnd.toFixed(1) + 's [DONE]');

                fetch('/stop_sim', { method: 'POST' }).catch(function () {});

                showToast('Simulation Complete', 'Fire simulation ended at ' + maxEnd + 's', 'success');
            }
        }, 100);

        if (typeof addNotification === 'function') {
            addNotification('info', 'info', 'Fire Simulation Started',
                'Propagation model is now active. Monitor the map for fire spread.', 'Just now');
        }
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', err.message || 'Could not start the simulation', 'danger');
    });
}

function clearSim() {
    if (fireSimInterval) { clearInterval(fireSimInterval); fireSimInterval = null; }
    fireSimTime = 0;
    setText('simTimeDisplay', '0.0s');

    fetch('/clear_sim', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function () {
        if (typeof notifiedFires !== 'undefined') notifiedFires.clear();
        if (typeof notifiedCorridors !== 'undefined') notifiedCorridors.clear();

        if (typeof addNotification === 'function') {
            addNotification('success', 'success', 'Fire Simulation Cleared',
                'All fire events removed. System returned to standby.', 'Just now');
        }

        document.getElementById('simFireList').innerHTML = '';
        var fireList = document.getElementById('fireList');
        if (fireList) fireList.innerHTML = 'No active fires';
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', 'Could not clear the simulation', 'danger');
    });
}

/* =====================================================
   CONGESTION SIMULATOR
   ===================================================== */
var congSimInterval = null;
var congSimTime     = 0;
var congSimMaxEnd   = 0;

function addSimCongestion() {
    var corridor = document.getElementById('simCorridor').value;
    var people   = document.getElementById('simPeople').value;
    var start    = document.getElementById('simCongStart').value;
    var end      = document.getElementById('simCongEnd').value;

    var valid = validateCongestionSimulatorInput(corridor, people, start, end);
    if (!valid) return;

    fetch('/add_sim_congestion', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
            corridor: valid.corridor,
            people  : valid.people,
            start   : valid.start,
            end     : valid.end
        })
    })
    .then(function (res) { return res.json(); })
    .then(function (payload) { return handleSimulatorResponse(payload, 'Could not add congestion event'); })
    .then(function () {
        if (valid.end > congSimMaxEnd) congSimMaxEnd = valid.end;

        var list = document.getElementById('simCongestionList');
        list.innerHTML +=
            '<div data-sim-type="congestion" data-start="' + valid.start + '" data-end="' + valid.end + '" ' +
            'style="background:#f0f0f0;padding:4px 8px;border-radius:4px;border-left:3px solid #9b59b6;font-size:11.5px;">' +
            '[CROWD] ' + valid.corridor + ' | ' + valid.people + ' people | ' + valid.start + 's to ' + valid.end + 's</div>';
        document.getElementById('simCorridor').value  = '';
        document.getElementById('simPeople').value    = '';
        document.getElementById('simCongStart').value = '';
        document.getElementById('simCongEnd').value   = '';
        clearSimFieldErrors(['simCorridor', 'simPeople', 'simCongStart', 'simCongEnd']);
        showToast('Crowd Event Added', valid.corridor + ' scheduled ' + valid.start + 's to ' + valid.end + 's', 'info');
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', err.message || 'Could not add congestion event', 'danger');
    });
}

function startSimCongestion() {
    var fireList = document.getElementById('simFireList');
    var hasFireEvents = fireList && fireList.querySelectorAll('div').length > 0;

    if (!hasFireEvents) {
        showToast('No Fire Events', 'Please add a fire simulation first.', 'warning');
        return;
    }

    var maxEnd = 0;
    var eventCount = 0;

    document.querySelectorAll('#simCongestionList div').forEach(function (div) {
        eventCount += 1;
        var endTime = toFiniteNumber(div.getAttribute('data-end'));
        if (endTime === null) {
            var match = div.textContent.match(/to\s*([\d.]+)s/);
            endTime = match ? parseFloat(match[1]) : null;
        }
        if (endTime !== null && endTime > maxEnd) maxEnd = endTime;
    });

    if (eventCount === 0 || maxEnd <= 0) {
        showToast('No Events', 'Please add at least one valid congestion event first.', 'warning');
        return;
    }

    fetch('/start_sim_congestion', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function (payload) { return handleSimulatorResponse(payload, 'Could not start congestion simulation'); })
    .then(function () {
        if (congSimInterval) clearInterval(congSimInterval);
        congSimTime = 0;
        setText('congTimeDisplay', '0.0s');

        congSimInterval = setInterval(function () {
            congSimTime = parseFloat((congSimTime + 0.1).toFixed(1));
            setText('congTimeDisplay', congSimTime.toFixed(1) + 's');

            if (congSimTime >= maxEnd) {
                clearInterval(congSimInterval);
                congSimInterval = null;
                setText('congTimeDisplay', maxEnd.toFixed(1) + 's [DONE]');

                fetch('/stop_sim_congestion', { method: 'POST' }).catch(function () {});

                showToast('Congestion Simulation Complete',
                    'Congestion simulation ended at ' + maxEnd + 's', 'success');

                if (typeof addNotification === 'function') {
                    addNotification('success', 'success', 'Congestion Simulation Done',
                        'All crowd events completed at ' + maxEnd + 's.', 'Just now');
                }
            }
        }, 100);

        if (typeof addNotification === 'function') {
            addNotification('info', 'info', 'Congestion Simulation Started',
                'Crowd override model is now active. Monitor corridors for congestion.', 'Just now');
        }
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', err.message || 'Could not start congestion simulation', 'danger');
    });
}

function clearSimCongestion() {
    if (congSimInterval) { clearInterval(congSimInterval); congSimInterval = null; }
    congSimTime = 0;
    congSimMaxEnd = 0;
    setText('congTimeDisplay', '0.0s');

    fetch('/clear_sim_congestion', { method: 'POST' })
    .then(function (r) { return r.json(); })
    .then(function () {
        document.getElementById('simCongestionList').innerHTML = '';
        showToast('Congestion Cleared', 'All crowd events removed', 'success');
    })
    .catch(function (err) {
        console.error(err);
        showToast('Error', 'Could not clear congestion events', 'danger');
    });
}

/* =====================================================
   ON DOM READY
   ===================================================== */
window.addEventListener('DOMContentLoaded', function () {

    // Implementation note
    // Implementation note
    if (window.FREDT_USER) {
        var u   = window.FREDT_USER.username || '';
        var r   = window.FREDT_USER.role     || 'User';
        var ini = u.substring(0, 2).toUpperCase() || '--';

        setText('sidebarUsername',   u);
        setText('sidebarRole',       r);
        setText('sidebarAvatar',     ini);
        setText('headerAvatar',      ini);
        setText('dropdownAvatar',    ini);
        setText('dropdownFullName',  u);
        setText('dropdownRoleText',  r);
        setText('dropdownRoleBadge', r);
    }

    // Role permissions logic
    loadCurrentUser();

    // Simulation configuration
    fetch('/get_sim_events')
    .then(function (r) { return r.json(); })
    .then(function (data) {
        if (data.events && data.events.length) {
            data.events.forEach(function (e) {
                document.getElementById('simFireList').innerHTML +=
                    '<div style="background:#fef2f2;padding:4px 8px;border-radius:4px;' +
                    'border-left:3px solid #ef4444;font-size:11.5px;">' +
                    '[FIRE] ' + e.shop_name + ' | ' + e.start + 's to ' + e.end + 's</div>';
            });
        }
    })
    .catch(function () {});

    applyRolePermissions('Admin');
});