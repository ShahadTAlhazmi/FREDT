/* =====================================================
   Role permissions logic
   ===================================================== */

/* =====================================================
   STATE
   ===================================================== */
var adminCurrentPage   = 1;
var adminRowsPerPage   = 10;
var adminLastUpdated   = null;

/* =====================================================
   Notification system
   ===================================================== */
var alertedUsersSet = new Set();

/* =====================================================
   Project section
   ===================================================== */
var lastAlertSentTime = null;

/* =====================================================
   Project section
   ===================================================== */
var ALERT_DISPLAY_DURATION = 5 * 60 * 1000;

/* =====================================================
   Role permissions logic
   ===================================================== */
var ADMIN_ROLE_PERMISSIONS = {

    Admin: {
        /* =====================================================
   Project section
   ===================================================== */
        canViewTable:        true,
        canAddSupervisor:    true,
        canEditSupervisor:   true,
        canDeleteSupervisor: true,

        /* =====================================================
   Fire simulation and alert logic
   ===================================================== */
        canSendFireAlerts:   true,
        canOpenFireModal:    true,

        /* =====================================================
   Project section
   ===================================================== */
        canFilter:           true,
        canSearch:           true,

        /* =====================================================
   Project section
   ===================================================== */
        canToggleEmergency:  true,

        /* =====================================================
   Project section
   ===================================================== */
        bannerClass: 'admin',
        bannerText:  'Full access — add, edit, delete supervisors & send fire alerts',

        /* =====================================================
   Project section
   ===================================================== */
        hiddenElements:   [],
        disabledElements: [],
    },

    Manager: {
        canViewTable:        true,
        canAddSupervisor:    false,
        canEditSupervisor:   false,
        canDeleteSupervisor: false,

        canSendFireAlerts:   true,   /* =====================================================
   Notification system
   ===================================================== */
        canOpenFireModal:    true,

        canFilter:           true,
        canSearch:           true,

        canToggleEmergency:  false,

        bannerClass: 'manager',
        bannerText:  'View & alert access — editing supervisors is restricted',

        hiddenElements:   ['btnAddSupervisor'],
        disabledElements: ['emergencySwitch'],
    },

    Safety: {
        canViewTable:        true,
        canAddSupervisor:    false,
        canEditSupervisor:   false,
        canDeleteSupervisor: false,

        canSendFireAlerts:   true,
        canOpenFireModal:    true,

        canFilter:           true,
        canSearch:           true,

        canToggleEmergency:  true,

        bannerClass: 'safety',
        bannerText:  'Safety view — fire alert access enabled, management restricted',

        hiddenElements:   ['btnAddSupervisor'],
        disabledElements: [],
    },
};

/* =====================================================
   Project section
   ===================================================== */
var currentAdminRole = 'Admin';

/* =====================================================
   Role permissions logic
   ===================================================== */
function applyAdminRolePermissions(role) {
    var cfg = ADMIN_ROLE_PERMISSIONS[role];
    if (!cfg) cfg = ADMIN_ROLE_PERMISSIONS['Admin'];
    currentAdminRole = role;

    /* =====================================================
   Project section
   ===================================================== */
    var banner = document.getElementById('permissionsBanner');
    if (banner) {
        banner.className   = 'permissions-banner ' + cfg.bannerClass;
        banner.textContent = cfg.bannerText;
    }

    /* =====================================================
   Project section
   ===================================================== */
    var addBtn = document.querySelector('.btn-add-supervisor');
    if (addBtn) {
        if (!cfg.canAddSupervisor) {
            addBtn.style.display  = 'none';
        } else {
            addBtn.style.display  = '';
            addBtn.disabled       = false;
            addBtn.style.opacity  = '1';
            addBtn.style.cursor   = 'pointer';
        }
    }

    /* =====================================================
   Project section
   ===================================================== */
    document.querySelectorAll('.admin-btn-edit').forEach(function (btn) {
        if (!cfg.canEditSupervisor) {
            btn.disabled      = true;
            btn.style.opacity = '0.35';
            btn.style.cursor  = 'not-allowed';
            btn.title         = 'Not available for ' + role + ' role';
        } else {
            btn.disabled      = false;
            btn.style.opacity = '1';
            btn.style.cursor  = 'pointer';
            btn.title         = '';
        }
    });

    document.querySelectorAll('.admin-btn-delete').forEach(function (btn) {
        if (!cfg.canDeleteSupervisor) {
            btn.disabled      = true;
            btn.style.opacity = '0.35';
            btn.style.cursor  = 'not-allowed';
            btn.title         = 'Not available for ' + role + ' role';
        } else {
            btn.disabled      = false;
            btn.style.opacity = '1';
            btn.style.cursor  = 'pointer';
            btn.title         = '';
        }
    });

    /* =====================================================
   Fire simulation and alert logic
   ===================================================== */
    var fab = document.querySelector('.fire-alerts-fab');
    if (fab) {
        if (!cfg.canOpenFireModal) {
            fab.style.display = 'none';
        } else {
            fab.style.display = '';
        }
    }

    var sendBtn  = document.querySelector('#fireAlertsModal .admin-modal-submit[onclick="submitDoneAlerts()"]');
    var bulkSend = document.querySelector('#fireAlertsModal .admin-modal-submit[onclick="sendBulkAlerts()"]');

    [sendBtn, bulkSend].forEach(function (btn) {
        if (!btn) return;
        if (!cfg.canSendFireAlerts) {
            btn.disabled      = true;
            btn.style.opacity = '0.35';
            btn.style.cursor  = 'not-allowed';
            btn.title         = 'Not available for ' + role + ' role';
        } else {
            btn.disabled      = false;
            btn.style.opacity = '1';
            btn.style.cursor  = 'pointer';
            btn.title         = '';
        }
    });

    /* =====================================================
   Project section
   ===================================================== */
    var emergencySwitch = document.getElementById('emergencySwitch');
    if (emergencySwitch) {
        if (!cfg.canToggleEmergency) {
            emergencySwitch.disabled = true;
            var switchEl = emergencySwitch.closest('.emergency-toggle');
            if (switchEl) {
                switchEl.style.opacity    = '0.4';
                switchEl.style.cursor     = 'not-allowed';
                switchEl.title            = 'Not available for ' + role + ' role';
                switchEl.style.pointerEvents = 'none';
            }
        } else {
            emergencySwitch.disabled = false;
            var switchEl2 = emergencySwitch.closest('.emergency-toggle');
            if (switchEl2) {
                switchEl2.style.opacity      = '1';
                switchEl2.style.cursor       = '';
                switchEl2.title              = '';
                switchEl2.style.pointerEvents = '';
            }
        }
    }

    /* =====================================================
   Project section
   ===================================================== */
    ['adminSearchInput', 'filterRole', 'filterStatus'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.disabled      = !cfg.canSearch && !cfg.canFilter;
        el.style.opacity = (!cfg.canSearch && !cfg.canFilter) ? '0.4' : '1';
        el.style.cursor  = (!cfg.canSearch && !cfg.canFilter) ? 'not-allowed' : '';
    });

    /* =====================================================
   Role permissions logic
   ===================================================== */
    document.querySelectorAll('.role-tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.textContent.trim() === role);
    });

    /* =====================================================
   Project section
   ===================================================== */
    var roleMap = {
        Admin:   { text: 'System Admin',     badge: 'ADMIN'  },
        Manager: { text: 'Building Manager', badge: 'MGR'    },
        Safety:  { text: 'Safety Officer',   badge: 'SAFETY' },
    };
    var rMap = roleMap[role] || roleMap['Admin'];
    if (typeof setText === 'function') {
        setText('dropdownRoleText',  rMap.text);
        setText('dropdownRoleBadge', rMap.badge);
        setText('sidebarRole',       rMap.text);
    }

    /* =====================================================
   Role permissions logic
   ===================================================== */
    var pillColors = {
        Admin:   { bg: 'rgba(74,222,128,0.2)',  color: '#4ade80' },
        Manager: { bg: 'rgba(251,191,36,0.2)',  color: '#fbbf24' },
        Safety:  { bg: 'rgba(96,165,250,0.2)',  color: '#60a5fa' },
    };
    var pc = pillColors[role] || pillColors['Admin'];
    var pill = document.getElementById('dropdownRoleBadge');
    if (pill) {
        pill.style.background = pc.bg;
        pill.style.color      = pc.color;
    }

    /* =====================================================
   Role permissions logic
   ===================================================== */
    var tabColors = {
        Admin:   '#16a34a',
        Manager: '#d97706',
        Safety:  '#2563eb',
    };
    document.querySelectorAll('.role-tab.active').forEach(function (tab) {
        tab.style.color = tabColors[role] || '#374151';
    });
}

/* =====================================================
   Role permissions logic
   ===================================================== */
var _originalSwitchRole = window.switchRole;
window.switchRole = function (el) {
    if (typeof _originalSwitchRole === 'function') {
        _originalSwitchRole(el);
    }
    var lockedRole = window.FREDT_CURRENT_ROLE || currentAdminRole || 'Safety';
    applyAdminRolePermissions(lockedRole);
};

function loadAdminRoleFromServer() {
    fetch('/api/current_user')
        .then(function (r) { return r.json(); })
        .then(function (u) {
            var role = u.role_key || 'Safety';
            window.FREDT_CURRENT_ROLE = role;
            window.FREDT_CURRENT_PERMISSIONS = u.permissions || {};
            applyAdminRolePermissions(role);
            if (typeof applyRolePermissions === 'function') applyRolePermissions(role);
            if (typeof setActiveRoleTab === 'function') setActiveRoleTab(role);
        })
        .catch(function () {
            applyAdminRolePermissions('Safety');
            if (typeof applyRolePermissions === 'function') applyRolePermissions('Safety');
        });
}

/* =====================================================
   MODAL HELPERS
   ===================================================== */
function openModal(id) {
    /* =====================================================
   Project section
   ===================================================== */
    if (id === 'addSupervisorModal') {
        var cfg = ADMIN_ROLE_PERMISSIONS[currentAdminRole] || ADMIN_ROLE_PERMISSIONS['Admin'];
        if (!cfg.canAddSupervisor) {
            if (typeof showToast === 'function') {
                showToast('Access Denied', 'Your role (' + currentAdminRole + ') cannot add supervisors.', 'warning');
            }
            return;
        }
    }

    /* =====================================================
   Notification system
   ===================================================== */
    if (id === 'fireAlertsModal') {
        var cfg2 = ADMIN_ROLE_PERMISSIONS[currentAdminRole] || ADMIN_ROLE_PERMISSIONS['Admin'];
        if (!cfg2.canOpenFireModal) {
            if (typeof showToast === 'function') {
                showToast('Access Denied', 'Your role (' + currentAdminRole + ') cannot access fire alerts.', 'warning');
            }
            return;
        }
    }

    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
}

function closeModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';
    document.body.style.overflow = '';
}

/* Close modal on ESC */
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        ['editSupervisorModal', 'addSupervisorModal',
         'fireAlertsModal', 'roleModal'].forEach(closeModal);
    }
});

/* =====================================================
   EDIT SUPERVISOR MODAL
   ===================================================== */
function openEditModal(id, fullName, email, phone, role, status, corridor) {
    /* =====================================================
   Project section
   ===================================================== */
    var cfg = ADMIN_ROLE_PERMISSIONS[currentAdminRole] || ADMIN_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canEditSupervisor) {
        if (typeof showToast === 'function') {
            showToast('Access Denied', 'Your role (' + currentAdminRole + ') cannot edit supervisors.', 'warning');
        }
        return;
    }

    var form = document.getElementById('editSupervisorForm');
    if (form) form.action = '/edit_supervisor/' + id;

    var setVal = function (elId, val) {
        var el = document.getElementById(elId);
        if (el) el.value = val || '';
    };

    setVal('edit_full_name', fullName);
    setVal('edit_email',     email);
    setVal('edit_phone',     phone);
    setVal('edit_role',      role);
    setVal('edit_status',    status);
    setVal('edit_corridor',  corridor || 'None');

    openModal('editSupervisorModal');
}

/* =====================================================
   CONFIRM DELETE
   ===================================================== */
function confirmDelete(event, form) {
    event.preventDefault();

    /* =====================================================
   Project section
   ===================================================== */
    var cfg = ADMIN_ROLE_PERMISSIONS[currentAdminRole] || ADMIN_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canDeleteSupervisor) {
        if (typeof showToast === 'function') {
            showToast('Access Denied', 'Your role (' + currentAdminRole + ') cannot delete supervisors.', 'warning');
        }
        return false;
    }

    if (typeof showToast !== 'function') {
        if (confirm('Are you sure you want to delete this supervisor?')) {
            form.submit();
        }
        return false;
    }

    var confirmed = confirm(
        'Delete this supervisor? This action cannot be undone.'
    );
    if (confirmed) {
        form.submit();
    }
    return false;
}

/* =====================================================
   TABLE FILTERING
   ===================================================== */
function filterAdminTable() {
    var query      = (document.getElementById('adminSearchInput')?.value || '').toLowerCase();
    var roleFilter = document.getElementById('filterRole')?.value   || '';
    var statFilter = document.getElementById('filterStatus')?.value || '';

    var rows    = document.querySelectorAll('#adminTableBody tr[data-name]');
    var visible = 0;

    rows.forEach(function (row) {
        var name   = row.getAttribute('data-name')   || '';
        var email  = row.getAttribute('data-email')  || '';
        var role   = row.getAttribute('data-role')   || '';
        var status = row.getAttribute('data-status') || '';

        var matchSearch = !query || name.includes(query) || email.includes(query);
        var matchRole   = !roleFilter || role === roleFilter;
        var matchStatus = !statFilter || status === statFilter;

        if (matchSearch && matchRole && matchStatus) {
            row.style.display = '';
            visible++;
        } else {
            row.style.display = 'none';
        }
    });

    var infoEl = document.getElementById('paginationInfo');
    if (infoEl) {
        infoEl.textContent = visible + ' result' + (visible !== 1 ? 's' : '') + ' found';
    }
}

/* =====================================================
   SELECT ALL CHECKBOX
   ===================================================== */
function toggleSelectAll(masterCheckbox) {
    var rows = document.querySelectorAll('#adminTableBody tr[data-name]');
    rows.forEach(function (row) {
        if (row.style.display !== 'none') {
            var cb = row.querySelector('.row-checkbox');
            if (cb) cb.checked = masterCheckbox.checked;
        }
    });
}

/* =====================================================
   PAGINATION
   ===================================================== */
function changePage(delta) {
    adminCurrentPage = Math.max(1, adminCurrentPage + delta);
    var pageEl = document.getElementById('pageInfo');
    if (pageEl) {
        var from = (adminCurrentPage - 1) * adminRowsPerPage + 1;
        var to   = adminCurrentPage * adminRowsPerPage;
        pageEl.textContent = from + '-' + to + ' of total';
    }
}

/* =====================================================
   FIRE ALERTS — ALERT CARD FILTER
   ===================================================== */
function filterAlertCards() {
    var query = (document.getElementById('alertSearchInput')?.value || '').toLowerCase();
    document.querySelectorAll('.fire-alert-card').forEach(function (card) {
        var name = (card.getAttribute('data-name') || '').toLowerCase();
        card.style.display = (!query || name.includes(query)) ? '' : 'none';
    });
}

/* =====================================================
   FIRE ALERTS — TOGGLE ALL CHECKBOXES
   ===================================================== */
function toggleAllAlertCheckboxes(masterCb) {
    document.querySelectorAll('.alert-user-checkbox').forEach(function (cb) {
        cb.checked = masterCb.checked;
    });
    updateAlertColors();
}

/* =====================================================
   FIRE ALERTS — UPDATE BELL COLORS
   ===================================================== */
function updateAlertColors() {
    var alerted  = Array.from(alertedUsersSet);
    var selected = Array.from(
        document.querySelectorAll('.alert-user-checkbox:checked')
    ).map(function (cb) { return parseInt(cb.getAttribute('data-id')); });

    var combined = new Set(alerted.concat(selected));

    /* Table bells */
    document.querySelectorAll('.alert-bell-icon').forEach(function (icon) {
        var id  = parseInt(icon.getAttribute('data-id'));
        var row = icon.closest('tr');
        if (combined.has(id)) {
            icon.style.fill   = '#eab308';
            icon.style.filter = 'drop-shadow(0 0 4px rgba(234,179,8,0.4))';
            if (row) row.style.backgroundColor = 'rgba(234,179,8,0.04)';
        } else {
            icon.style.fill   = '#94a3b8';
            icon.style.filter = 'none';
            if (row) row.style.backgroundColor = '';
        }
    });

    /* Modal bells */
    document.querySelectorAll('.modal-bell-icon').forEach(function (icon) {
        var id   = parseInt(icon.getAttribute('data-id'));
        var card = icon.closest('.fire-alert-card');
        if (combined.has(id)) {
            icon.style.fill   = '#eab308';
            icon.style.filter = 'drop-shadow(0 0 4px rgba(234,179,8,0.4))';
            if (card) {
                card.style.borderColor     = '#eab308';
                card.style.backgroundColor = 'rgba(234,179,8,0.03)';
            }
        } else {
            icon.style.fill   = '#94a3b8';
            icon.style.filter = 'none';
            if (card) {
                card.style.borderColor     = '';
                card.style.backgroundColor = '';
            }
        }
    });

    /* =====================================================
   Project section
   ===================================================== */
    updateAlertedUsersCard();
}

/* =====================================================
   Project section
   ===================================================== */
function updateAlertedUsersCard() {
    var count = alertedUsersSet.size;
    if (typeof setText === 'function') {
        setText('statAlertedUsers', count);
    }

    /* =====================================================
   Project section
   ===================================================== */
    var card = document.querySelector('[data-card="alerted-users"]');
    if (card) {
        var valueEl = card.querySelector('.stat-value');
        if (valueEl) {
            if (count > 0) {
                valueEl.style.color = '#ef4444';
            } else {
                valueEl.style.color = '';
            }
        }
    }
}

/* =====================================================
   FIRE ALERTS — SEND BULK SMS
   ===================================================== */
function sendBulkAlerts() {
    /* =====================================================
   Project section
   ===================================================== */
    var cfg = ADMIN_ROLE_PERMISSIONS[currentAdminRole] || ADMIN_ROLE_PERMISSIONS['Admin'];
    if (!cfg.canSendFireAlerts) {
        if (typeof showToast === 'function') {
            showToast('Access Denied', 'Your role cannot send fire alerts.', 'warning');
        }
        return false;
    }

    var msgInput = document.getElementById('bulkSmsMessage');
    var msg = (msgInput?.value || '').trim() ||
              'Warning: Potential fire alert. Please follow evacuation procedures.';

    var checked = document.querySelectorAll('.alert-user-checkbox:checked');
    if (checked.length === 0) {
        if (typeof showToast === 'function') {
            showToast('No Users Selected', 'Please select at least one user.', 'warning');
        }
        return false;
    }

    var sentCount = 0;

    checked.forEach(function (cb) {
        var phone  = cb.getAttribute('data-phone');
        var id     = parseInt(cb.getAttribute('data-id'));
        var name   = cb.getAttribute('data-name') || 'User';

        if (phone && phone.trim() !== '' && !phone.includes('XXX')) {
            fetch('/send_sms', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ phone: phone, message: msg, user_id: id })
            }).catch(function () {});

            /* =====================================================
   Project section
   ===================================================== */
            alertedUsersSet.add(id);

            /* =====================================================
   Project section
   ===================================================== */
            var bell = cb.closest('.fire-alert-card')?.querySelector('.modal-bell-icon');
            if (bell) {
                bell.style.fill   = '#f43f5e';
                bell.style.filter = 'drop-shadow(0 0 4px rgba(244,63,94,0.4))';
            }

            sentCount++;
        }
    });

    if (sentCount > 0) {
        /* =====================================================
   Project section
   ===================================================== */
        lastAlertSentTime = Date.now();

        /* =====================================================
   Project section
   ===================================================== */
        updateAlertedUsersCard();

        /* =====================================================
   Project section
   ===================================================== */
        window.lastAlertedUsers = Array.from(alertedUsersSet);

        if (typeof showToast === 'function') {
            showToast('Alerts Sent', sentCount + ' SMS alert(s) initiated.', 'success');
        }
        if (msgInput) msgInput.value = '';
        return true;
    } else {
        if (typeof showToast === 'function') {
            showToast('No Valid Numbers', 'No valid phone numbers found.', 'warning');
        }
        return false;
    }
}

/* =====================================================
   FIRE ALERTS — DONE BUTTON
   ===================================================== */
function submitDoneAlerts() {
    var checked = document.querySelectorAll('.alert-user-checkbox:checked');
    if (checked.length > 0) {
        var sent = sendBulkAlerts();
        if (sent) closeModal('fireAlertsModal');
    } else {
        closeModal('fireAlertsModal');
    }
}

/* =====================================================
   ADMIN STATS — DYNAMIC UPDATE
   ===================================================== */
function updateAdminStats() {
    var rows     = document.querySelectorAll('#adminTableBody tr[data-name]');
    var total    = rows.length;
    var active   = 0;
    var rolesSet = new Set();

    rows.forEach(function (row) {
        var status = row.getAttribute('data-status') || '';
        var role   = row.getAttribute('data-role')   || '';
        if (status === 'Active') active++;
        if (role) rolesSet.add(role);
    });

    if (typeof setText === 'function') {
        setText('statTotalAdmins',  total);
        setText('statActiveRoles',  rolesSet.size);
        setText('footerTotalAdmins', total);
        setText('footerActiveAdmins', active);
    }

    /* =====================================================
   Project section
   ===================================================== */
    updateAlertedUsersCard();
}

/* =====================================================
   FOOTER LAST UPDATED TIMER
   ===================================================== */
function startFooterTimer() {
    adminLastUpdated = Date.now();

    setInterval(function () {
        var el = document.getElementById('footerLastUpdated');
        if (!el || !adminLastUpdated) return;
        var secs = Math.round((Date.now() - adminLastUpdated) / 1000);
        if      (secs < 5)  el.textContent = 'Last updated just now';
        else if (secs < 60) el.textContent = 'Last updated ' + secs + 's ago';
        else                el.textContent = 'Last updated ' + Math.round(secs / 60) + 'm ago';
    }, 3000);
}

/* =====================================================
   ALERT BELL POLLING (server sync)
   ===================================================== */
function startAlertPolling() {
    setInterval(function () {
        fetch('/admin/alerts_status')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var newAlerted = data.alerted_user_ids || [];

                if (newAlerted.length === 0 &&
                    alertedUsersSet.size > 0) {

                    /* =====================================================
   Project section
   ===================================================== */
                    var elapsed = lastAlertSentTime
                        ? (Date.now() - lastAlertSentTime)
                        : ALERT_DISPLAY_DURATION + 1;

                    if (elapsed < ALERT_DISPLAY_DURATION) {
                        /* =====================================================
   Project section
   ===================================================== */
                        return;
                    }

                    /* =====================================================
   Notification system
   ===================================================== */
                    document.querySelectorAll('.alert-user-checkbox').forEach(function (cb) {
                        cb.checked = false;
                    });
                    var selectAll = document.getElementById('selectAllFireAlerts');
                    if (selectAll) selectAll.checked = false;

                    alertedUsersSet.clear();
                    window.lastAlertedUsers = [];
                    updateAlertedUsersCard();
                } else {
                    /* =====================================================
   Project section
   ===================================================== */
                    newAlerted.forEach(function (id) {
                        alertedUsersSet.add(id);
                    });
                    window.lastAlertedUsers = Array.from(alertedUsersSet);
                }

                updateAlertColors();
            })
            .catch(function () {});
    }, 2000);
}

/* =====================================================
   Role permissions logic
   ===================================================== */
function updateRoleIndicator(role) {
    var indicator = document.getElementById('roleIndicatorBadge');
    if (!indicator) {
        /* =====================================================
   Project section
   ===================================================== */
        indicator = document.createElement('div');
        indicator.id = 'roleIndicatorBadge';
        indicator.style.cssText = [
            'display:inline-flex',
            'align-items:center',
            'gap:5px',
            'padding:3px 10px',
            'border-radius:20px',
            'font-size:11px',
            'font-weight:700',
            'letter-spacing:0.5px',
            'transition:all 0.3s ease',
        ].join(';');

        var headerLeft = document.querySelector('.header-left');
        if (headerLeft) headerLeft.appendChild(indicator);
    }

    var styles = {
        Admin:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: '🔐', label: 'Admin'   },
        Manager: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: '👤', label: 'Manager' },
        Safety:  { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: '🛡️', label: 'Safety'  },
    };

    var s = styles[role] || styles['Admin'];
    indicator.style.background = s.bg;
    indicator.style.color      = s.color;
    indicator.style.border     = '1px solid ' + s.border;
    indicator.textContent      = s.label + ' Mode';
}

/* =====================================================
   INIT
   ===================================================== */
window.addEventListener('DOMContentLoaded', function () {

    /* Fallback user data */
    if (window.FREDT_USER && typeof setText === 'function') {
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

    /* Load user from API */
    if (typeof loadCurrentUser === 'function') {
        loadCurrentUser();
    }

    /* =====================================================
   Role permissions logic
   ===================================================== */
    loadAdminRoleFromServer();

    /* KPI stats */
    updateAdminStats();

    /* Footer timer */
    startFooterTimer();

    /* Alert polling */
    startAlertPolling();

    /* Lucide icons */
    if (window.lucide) lucide.createIcons();
});