/* =====================================================
    script.js
   ===================================================== */

let selectedCell = null;
let clickCounts = {};
let CELL_SIZE = 40;
let nodes = [];
let fireCells = new Set();
let dangerGrid = [];
let selectedCellCorridor = undefined;
let firePaths = {};
let selectedFireKey = null;
let currentPath = [];
let warningCells = new Set();
let globalCorridors = {};
let corridorStatus = {};

/* =====================================================
   NOTIFICATION SYSTEM
   ===================================================== */
let notificationLog = [];
let notificationCount = 0;
let notifiedFires = new Set();
let notifiedCorridors = new Set();

/* =====================================================
   SAFE UI HELPERS
   ===================================================== */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

function setFontSize(id, size) {
    const el = document.getElementById(id);
    if (el) el.style.fontSize = size;
}

function updateSelectedZoneUI(title, badge, temp, smoke, people) {
    setText('zoneNameLabel', title ?? '-');
    setText('zoneBadgeLabel', badge ?? '-');
    setText('zoneTempLabel', temp ?? '-');
    setText('zoneSmokeLabel', smoke ?? '-');
    setText('zonePeopleLabel', people ?? '-');
}

/* =====================================================
   Compatibility fix
   ===================================================== */
function updateSimTime(val) {
    const t = (Number(val) || 0).toFixed(1) + 's';
    const el = document.getElementById('simTimeDisplay');
    if (el) el.innerText = t;
}

/* =====================================================
   Notification system
   ===================================================== */
function getNotificationIconSVG(type) {
    if (type === 'critical') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 19h20L12 2z"/><line x1="12" y1="9" x2="12" y2="13"/>
            <circle cx="12" cy="17" r="0.5" fill="#ef4444"/></svg>`;
    }
    if (type === 'warning') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <circle cx="12" cy="16" r="0.5" fill="#f59e0b"/></svg>`;
    }
    if (type === 'success') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 12 11 14 15 10"/></svg>`;
    }
    // info (default)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}

/* =====================================================
   CORRIDORS DATA POLLING
   ===================================================== */
function pollCorridorsData() {
    fetch('/get_corridors_data')
        .then(res => res.json())
        .then(data => {
            if (!data || data.status !== 'ok' || !data.corridors) return;

            corridorStatus = data.corridors;
            updateMapColors();

            // Implementation note
            if (selectedCellCorridor !== undefined) {
                updateSelectedCorridorInfo();
            }

            const crowdedNames = [];
            Object.entries(corridorStatus).forEach(([name, info]) => {
                const people = Number(info?.total_people || 0);
                if (people >= 20) crowdedNames.push(name);
            });

            const ccEl = document.getElementById('crowdCount');
            if (ccEl) {
                if (crowdedNames.length === 0) {
                    ccEl.textContent = 'None';
                    ccEl.style.fontSize = '';
                } else {
                    ccEl.textContent = crowdedNames.join(', ');
                    ccEl.style.fontSize = crowdedNames.length > 2 ? '11px' : '14px';
                }
            }
        })
        .catch(err => console.error('Error fetching corridors data:', err));
}

/* =====================================================
   COLOR HELPERS
   ===================================================== */
function getBaseColor(node, originalKey) {
    if (!node) return '#879d86';

    if (fireCells.has(originalKey)) return '#f70000ff';
    if (warningCells.has(originalKey)) return '#ff7b00ff';

    let color = node.value === 2 ? '#eeff00ff' :
        node.value === 0 ? '#879d86' :
        node.value === 1 ? '#2a3229' :
        node.value === 3 ? '#5d85c3' : '#879d86';

    if (node.value === 0 && Array.isArray(node.corridor_id) && node.corridor_id.length > 0) {
        let maxPeople = 0;
        node.corridor_id.forEach(cid => {
            const cName = globalCorridors[cid]?.name;
            if (cName && corridorStatus[cName] && typeof corridorStatus[cName].total_people === 'number') {
                maxPeople = Math.max(maxPeople, Number(corridorStatus[cName].total_people || 0));
            }
        });
        if (maxPeople >= 45) return '#7b241c';
        if (maxPeople >= 20) return '#9b59b6';
    }

    return color;
}

function updateMapColors() {
    nodes.forEach(n => {
        const key = `${n.row}-${n.col}`;
        if (currentPath && currentPath.some(([r, c]) => r == n.row && c == n.col)) return;
        const baseColor = getBaseColor(n, key);
        d3.select(`#rect-${key}`).attr('fill', baseColor);
    });
}

/* =====================================================
   Compatibility fix
   ===================================================== */
function updateSelectedCorridorInfo() {
    if (selectedCellCorridor === undefined || selectedCellCorridor.length === 0) return;

    const corridorNames = selectedCellCorridor
        .map(cid => globalCorridors[cid]?.name || 'Unknown')
        .join(', ');

    let peopleSum = 0;
    let statuses = [];
    let congestionLevel = 'safe'; // safe | crowded | critical

    selectedCellCorridor.forEach(cid => {
        const cInfo = globalCorridors[cid];
        if (cInfo && cInfo.name) {
            const cName = cInfo.name;
            if (corridorStatus[cName]) {
                const people = Number(corridorStatus[cName].total_people || 0);
                peopleSum += people;
                if (corridorStatus[cName].fire_status) {
                    statuses.push('fire');
                } else if (people >= 45) {
                    statuses.push('critical');
                } else if (people >= 20) {
                    statuses.push('crowded');
                } else {
                    statuses.push('safe');
                }
            }
        }
    });

    // Implementation note
    let combinedStatus;
    if (statuses.includes('fire')) {
        combinedStatus = "<span style='color:#ff4d4d;font-weight:bold;'>Fire Detected</span>";
        congestionLevel = 'fire';
    } else if (statuses.includes('critical')) {
        combinedStatus = "<span style='color:#7b241c;font-weight:bold;'>Critical Congestion</span>";
        congestionLevel = 'critical';
    } else if (statuses.includes('crowded')) {
        combinedStatus = "<span style='color:#9b59b6;font-weight:bold;'>Crowded</span>";
        congestionLevel = 'crowded';
    } else if (statuses.length > 0) {
        combinedStatus = "<span style='color:#4caf50;font-weight:bold;'>Safe</span>";
        congestionLevel = 'safe';
    } else {
        combinedStatus = "<span style='color:#9ca3af;'>No Data</span>";
        congestionLevel = 'unknown';
    }

    const cellInfo = document.getElementById('cellInfo');
    if (cellInfo) {
        cellInfo.innerHTML = `
            <div class="zone-header">
                <span class="zone-name">Corridor: ${corridorNames}</span>
                <span class="zone-badge">Selected</span>
            </div>
            <div class="zone-detail">
                <span>Status</span>
                <span>${combinedStatus}</span>
            </div>
            <div class="zone-detail">
                <span>People Count</span>
                <span>${peopleSum}</span>
            </div>
        `;
    }

    // Implementation note
    setText('zoneNameLabel', corridorNames);
    setText('zoneBadgeLabel', 'Corridor');
    setText('zoneTempLabel', '—');
    setText('zoneSmokeLabel', '—');
    setText('zonePeopleLabel', peopleSum > 0 ? String(peopleSum) : '—');
}

/* =====================================================
   PEOPLE COUNT POLLING
   ===================================================== */
function updateTotalPeople() {
    fetch('/get_people')
        .then(res => res.json())
        .then(data => {
            const total = Number(data?.total_people || 0);
            const tpEl = document.getElementById('totalPeople');
            const ftpEl = document.getElementById('footerTotalPeople');
            if (tpEl) tpEl.innerText = total;
            if (ftpEl) ftpEl.innerText = total;
        })
        .catch(err => console.error('Error fetching total people:', err));
}

/* =====================================================
   FIRE PANEL HELPERS
   ===================================================== */
function addFireToPanel(key, shopName) {
    const fireList = document.getElementById('fireList');
    if (!fireList) return;

    if (fireList.innerText.trim() === 'No active fires') {
        fireList.innerHTML = '';
    }

    if (document.getElementById('fire-' + key)) return;

    const item = document.createElement('div');
    item.className = 'fireItem';
    item.innerText = 'Fire: ' + shopName;
    item.style.cursor = 'pointer';
    item.style.padding = '5px';
    item.id = 'fire-' + key;

    item.onclick = () => {
        selectedFireKey = key;
        colorSafestPath(firePaths[key]);
    };

    fireList.appendChild(item);
}

function colorSafestPath(path) {
    if (currentPath && currentPath.length > 0) {
        currentPath.forEach(([r, c]) => {
            const key = `${r}-${c}`;
            const node = nodes.find(n => n.row == r && n.col == c);
            if (node) d3.select(`#rect-${r}-${c}`).attr('fill', getBaseColor(node, key));
        });
    }

    currentPath = path ? [...path] : [];

    currentPath.forEach(([r, c]) => {
        const key = `${r}-${c}`;
        if (!fireCells.has(key)) {
            d3.select(`#rect-${r}-${c}`).attr('fill', '#00ff22ff');
        }
    });
}

function removeFireFromPanel(key) {
    const item = document.getElementById('fire-' + key);
    if (item) item.remove();

    if (Object.keys(firePaths).length === 0) {
        const fl = document.getElementById('fireList');
        if (fl) fl.innerText = 'No active fires';
    }
}

function removeFirePath(fireKey) {
    const path = firePaths[fireKey];
    if (!path) return;
    path.forEach(([r, c]) => {
        const node = nodes.find(n => n.row == r && n.col == c);
        if (!node) return;
        d3.select(`#rect-${r}-${c}`).attr('fill', getBaseColor(node, `${r}-${c}`));
    });
    delete firePaths[fireKey];
}

/* =====================================================
   Compatibility fix
   ===================================================== */
function extractFireCorridorNames(data) {
    const fireCorridorNames = new Set();

    if (data.corridors && typeof data.corridors === 'object') {
        Object.entries(data.corridors).forEach(([name, info]) => {
            if (info && info.fire_status) {
                fireCorridorNames.add(name);
            }
        });
    }

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    (data.fires || []).forEach(key => {
        const [r, c] = key.split('-').map(Number);

        directions.forEach(([dr, dc]) => {
            const neighborNode = nodes.find(n => n.row === r + dr && n.col === c + dc);
            if (neighborNode && neighborNode.value === 0 &&
                Array.isArray(neighborNode.corridor_id) && neighborNode.corridor_id.length > 0) {
                neighborNode.corridor_id.forEach(cid => {
                    const cName = globalCorridors[cid]?.name;
                    if (cName) fireCorridorNames.add(cName);
                });
            }
        });

        const fireNode = nodes.find(n => n.row == r && n.col == c);
        if (fireNode && fireNode.value === 0 &&
            Array.isArray(fireNode.corridor_id) && fireNode.corridor_id.length > 0) {
            fireNode.corridor_id.forEach(cid => {
                const cName = globalCorridors[cid]?.name;
                if (cName) fireCorridorNames.add(cName);
            });
        }
    });

    (data.warnings || []).forEach(key => {
        const [r, c] = key.split('-').map(Number);
        const warnNode = nodes.find(n => n.row == r && n.col == c);
        if (warnNode && warnNode.value === 0 &&
            Array.isArray(warnNode.corridor_id) && warnNode.corridor_id.length > 0) {
            warnNode.corridor_id.forEach(cid => {
                const cName = globalCorridors[cid]?.name;
                if (cName) fireCorridorNames.add(cName);
            });
        }
    });

    return fireCorridorNames;
}

/* =====================================================
   FIRE SYSTEM POLLING
   ===================================================== */
function pollFireSystem() {
    fetch('/update_fire')
        .then(res => res.json())
        .then(data => {
            console.log('=== POLL FIRE DATA ===', JSON.stringify(data).substring(0, 500));

            const previousFires = new Set(Object.keys(firePaths));
            const currentFires = new Set(data.fires || []);

            previousFires.forEach(key => {
                if (!currentFires.has(key)) {
                    removeFirePath(key);
                    if (selectedFireKey === key) {
                        const remainingKeys = Object.keys(firePaths);
                        selectedFireKey = remainingKeys[0] || null;
                        colorSafestPath(selectedFireKey ? firePaths[selectedFireKey] : []);
                    }
                }
            });

            warningCells.clear();
            fireCells.clear();
            firePaths = {};

            const fireListEl = document.getElementById('fireList');
            if (fireListEl) fireListEl.innerHTML = '';

            if (data.status === 'safe') {
                currentPath = [];
                selectedFireKey = null;
                updateMapColors();

                setText('fireList', 'No active fires');
                setText('activeAlertsCount', '0');
                setText('globalStatus', 'Safe');
                setText('footerFireDetected', 'No');
                setText('footerSysStatus', 'Operational');
                const fssEl = document.getElementById('footerSysStatus');
                if (fssEl) fssEl.className = 'text-success';

                setText('fireCorridors', 'None');
                setText('fireCount', '0');

                // Compatibility fix
                updateSimTime(data.sim_time);
                nodes.forEach(n => d3.select(`#text-${n.row}-${n.col}`).text(''));
                return;
            }

            // Fire simulation and alert logic
            updateMapColors();

            setText('globalStatus', 'Critical');
            setText('footerFireDetected', 'Yes (Active)');
            setText('footerSysStatus', 'Emergency');
            const fssEl2 = document.getElementById('footerSysStatus');
            if (fssEl2) fssEl2.className = 'text-danger';

            setText('activeAlertsCount', (data.fires || []).length);

            // Compatibility fix
            updateSimTime(data.sim_time);
            nodes.forEach(n => d3.select(`#text-${n.row}-${n.col}`).text(''));

            (data.fires || []).forEach(key => {
                fireCells.add(key);
                const [r, c] = key.split('-');
                d3.select(`#rect-${r}-${c}`).attr('fill', '#f70000ff');
                firePaths[key] = (data.paths || {})[key] || [];
                const node = nodes.find(n => n.row == r && n.col == c);
                const shopName = node?.label || `Shop (${r},${c})`;
                addFireToPanel(key, shopName);

                if (!notifiedFires.has(key)) {
                    notifiedFires.add(key);
                    const temp = data.fire_details?.[key]?.temp ?? '-';
                    const smoke = data.fire_details?.[key]?.smoke ?? '-';
                    addNotification(
                        'critical',
                        'critical',
                        'Fire Detected - ' + shopName,
                        `Location: Row ${r}, Col ${c} | Temp: ${temp} | Smoke: ${smoke}`,
                        'Just now'
                    );
                }
            });

            (data.warnings || []).forEach(key => {
                warningCells.add(key);
                const [r, c] = key.split('-');
                d3.select(`#rect-${r}-${c}`).attr('fill', '#ff7b00ff');
            });

            const fireCorridorNames = extractFireCorridorNames(data);

            const fireCorEl = document.getElementById('fireCorridors');
            if (fireCorEl) {
                if (fireCorridorNames.size === 0) {
                    fireCorEl.textContent = 'None';
                    fireCorEl.style.fontSize = '';
                } else {
                    fireCorEl.textContent = Array.from(fireCorridorNames).join(', ');
                    fireCorEl.style.fontSize = fireCorridorNames.size > 2 ? '11px' : '14px';
                }
            }

            setText('fireCount', fireCells.size);

            if (!selectedFireKey || !firePaths[selectedFireKey]) {
                const firstKey = Object.keys(firePaths)[0];
                if (firstKey) selectedFireKey = firstKey;
            }

            if (selectedFireKey && firePaths[selectedFireKey]) {
                colorSafestPath(firePaths[selectedFireKey]);
            } else {
                selectedFireKey = null;
                colorSafestPath([]);
            }

            previousFires.forEach(key => {
                if (!currentFires.has(key)) {
                    const [r, c] = key.split('-');
                    const node = nodes.find(n => n.row == r && n.col == c);
                    const shopName = node?.label || `Shop (${r},${c})`;
                    if (notifiedFires.has(key)) {
                        notifiedFires.delete(key);
                        addNotification(
                            'success',
                            'success',
                            'Fire Extinguished - ' + shopName,
                            'Zone is now clear. Normal operations resumed.',
                            'Just now'
                        );
                    }
                }
            });

            Object.entries(data.corridors || {}).forEach(([name, info]) => {
                const people = Number(info?.total_people || 0);
                if (people >= 45 && !notifiedCorridors.has(name + '_extreme')) {
                    notifiedCorridors.add(name + '_extreme');
                    notifiedCorridors.delete(name + '_high');
                    addNotification(
                        'critical',
                        'critical',
                        'Critical Congestion - ' + name,
                        `${people} people detected. Corridor nearly blocked.`,
                        'Just now'
                    );
                } else if (people >= 20 && !notifiedCorridors.has(name + '_high')) {
                    notifiedCorridors.add(name + '_high');
                    addNotification(
                        'warning',
                        'warning',
                        'High Congestion - ' + name,
                        `${people} people detected. Monitor corridor closely.`,
                        'Just now'
                    );
                } else if (people < 20) {
                    notifiedCorridors.delete(name + '_high');
                    notifiedCorridors.delete(name + '_extreme');
                }
            });

            if (selectedCellCorridor !== undefined) {
                updateSelectedCorridorInfo();
            }
        })
        .catch(err => console.error('Fire system error:', err));
}

/* =====================================================
   DRAW GRID
   ===================================================== */
function drawGrid() {
    const svg = d3.select('#map');
    svg.selectAll('*').remove();

    fetch('/grid')
        .then(res => res.json())
        .then(data => {
            nodes = data.nodes || [];
            globalCorridors = data.corridors || {};

            if (nodes.length === 0) return;

            const rows = Math.max(...nodes.map(n => n.row)) + 1;
            const cols = Math.max(...nodes.map(n => n.col)) + 1;
            const width = cols * CELL_SIZE;
            const height = rows * CELL_SIZE;

            svg.attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');

            const g = svg.append('g').attr('id', 'gridLayer');

            g.selectAll('rect')
                .data(nodes)
                .enter()
                .append('rect')
                .attr('id', d => `rect-${d.row}-${d.col}`)
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('width', CELL_SIZE)
                .attr('height', CELL_SIZE)
                .attr('stroke', 'rgba(0,0,0,0.1)')
                .attr('stroke-width', 1)
                .attr('fill', d => getBaseColor(d, `${d.row}-${d.col}`))
                .on('click', (event, d) => {
                    const rect = d3.select(event.currentTarget);

                    // Implementation note
                    if (d.value === 0 && Array.isArray(d.corridor_id) && d.corridor_id.length > 0) {
                        if (selectedCellCorridor !== undefined) {
                            nodes.forEach(n => {
                                if (!Array.isArray(n.corridor_id)) return;
                                const cKey = `${n.row}-${n.col}`;
                                d3.select(`#rect-${cKey}`).attr('fill', getBaseColor(n, cKey));
                            });
                        }

                        if (selectedCell) {
                            const prevData = selectedCell.datum();
                            const prevKey = `${prevData.row}-${prevData.col}`;
                            selectedCell.attr('fill', getBaseColor(prevData, prevKey));
                            selectedCell = null;
                        }

                        d.corridor_id.forEach(cid => {
                            nodes
                                .filter(n => Array.isArray(n.corridor_id) && n.corridor_id.includes(cid))
                                .forEach(n => {
                                    const cKey = `${n.row}-${n.col}`;
                                    d3.select(`#rect-${cKey}`).attr('fill', '#3cdce7');
                                });
                        });

                        selectedCell = null;
                        selectedCellCorridor = d.corridor_id;
                        updateSelectedCorridorInfo();
                        event.stopPropagation();
                        return;
                    }

                    // Implementation note
                    if (selectedCellCorridor !== undefined) {
                        nodes.forEach(n => {
                            if (!Array.isArray(n.corridor_id)) return;
                            const cKey = `${n.row}-${n.col}`;
                            d3.select(`#rect-${cKey}`).attr('fill', getBaseColor(n, cKey));
                        });
                        selectedCellCorridor = undefined;
                    }

                    if (selectedCell && selectedCell !== rect) {
                        const prevData = selectedCell.datum();
                        const prevKey = `${prevData.row}-${prevData.col}`;
                        selectedCell.attr('fill', getBaseColor(prevData, prevKey));
                    }

                    rect.attr('fill', '#3cdce7');
                    selectedCell = rect;

                    const cellInfo = document.getElementById('cellInfo');
                    if (cellInfo) {
                        const cellKey = `${d.row}-${d.col}`;
                        const isOnFire  = fireCells.has(cellKey);
                        const isWarning = warningCells.has(cellKey);

                        const statusHTML = isOnFire
                            ? `<span style="color:#f70000;font-weight:bold;">On Fire</span>`
                            : isWarning
                                ? `<span style="color:#ff7b00;font-weight:bold;">Warning</span>`
                                : `<span style="color:#4caf50;font-weight:bold;">Safe</span>`;

                        cellInfo.innerHTML = `
                            <div class="zone-header">
                                <span class="zone-name">${d.label || 'Selected Cell'}</span>
                                <span class="zone-badge">
                                    ${
                                        d.value === 2 ? 'Shop' :
                                        d.value === 1 ? 'Blocked' :
                                        d.value === 3 ? 'Emergency Exit' :
                                        'Road'
                                    }
                                </span>
                            </div>
                            <div class="zone-detail">
                                <span>Status</span>
                                <span>${statusHTML}</span>
                            </div>
                        `;
                    }

                    if (d.value === 2) {
                        const cellKey = `${d.row}-${d.col}`;
                        const isOnFire  = fireCells.has(cellKey);
                        const isWarning = warningCells.has(cellKey);
                        updateSelectedZoneUI(
                            d.label || 'Shop', 'Shop',
                            isOnFire ? 'High' : '-',
                            isOnFire ? 'High' : '-',
                            '-'
                        );
                    } else if (d.value === 0) {
                        updateSelectedZoneUI('Road', 'Road', '-', '-', '-');
                    } else if (d.value === 1) {
                        updateSelectedZoneUI('Wall', 'Blocked', '-', '-', '-');
                    } else if (d.value === 3) {
                        updateSelectedZoneUI('Exit', 'Emergency', '-', '-', '-');
                    } else {
                        updateSelectedZoneUI('Unknown', '-', '-', '-', '-');
                    }

                    event.stopPropagation();
                });

            g.selectAll('text.danger-label')
                .data(nodes)
                .enter()
                .append('text')
                .attr('class', 'danger-label')
                .attr('id', d => `text-${d.row}-${d.col}`)
                .attr('x', d => d.x + CELL_SIZE / 2)
                .attr('y', d => d.y + CELL_SIZE / 2)
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('fill', 'black')
                .style('font-size', '8px')
                .style('font-weight', 'normal')
                .style('pointer-events', 'none')
                .text('');

            // Implementation note
            d3.select('body').on('click', () => {
                if (selectedCell) {
                    const d = selectedCell.datum();
                    const key = `${d.row}-${d.col}`;
                    selectedCell.attr('fill', getBaseColor(d, key));
                    selectedCell = null;
                    updateSelectedZoneUI('-', '-', '-', '-', '-');
                }

                if (selectedCellCorridor !== undefined) {
                    nodes.forEach(n => {
                        if (!Array.isArray(n.corridor_id)) return;
                        const cKey = `${n.row}-${n.col}`;
                        d3.select(`#rect-${cKey}`).attr('fill', getBaseColor(n, cKey));
                    });
                    selectedCellCorridor = undefined;
                    updateSelectedZoneUI('-', '-', '-', '-', '-');
                }
            });
        })
        .catch(err => console.error('Error loading grid:', err));
}

/* =====================================================
   Notification system
   ===================================================== */
function addNotification(type, iconType, title, detail, time) {
    time = time || 'Just now';

    notificationLog.unshift({ type, iconType: iconType || type, title, detail, time });
    if (notificationLog.length > 20) notificationLog.pop();

    notificationCount++;
    updateNotificationBadge();
    renderNotificationPanel();

    if (typeof showToast === 'function') {
        showToast(
            title,
            detail,
            type === 'critical' ? 'fire' :
                type === 'warning' ? 'warning' :
                    type === 'info' ? 'info' : 'success'
        );
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge') ||
        document.querySelector('.notif-badge');
    if (!badge) return;

    if (notificationCount > 0) {
        badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    const countEl = panel.querySelector('#notificationCount') ||
        panel.querySelector('.notification-count');
    if (countEl) {
        countEl.textContent = notificationCount > 0 ? notificationCount + ' New' : 'No new';
        countEl.style.background = notificationCount > 0 ? '#dcfce7' : '#f1f5f9';
        countEl.style.color = notificationCount > 0 ? '#16a34a' : '#6b7280';
    }

    let dynamicArea = panel.querySelector('#dynamicNotifications');
    if (!dynamicArea) {
        dynamicArea = document.createElement('div');
        dynamicArea.id = 'dynamicNotifications';
        dynamicArea.style.cssText = 'max-height:320px;overflow-y:auto;';
        panel.appendChild(dynamicArea);
    }

    if (notificationLog.length === 0) {
        dynamicArea.innerHTML =
            '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">' +
            'No notifications yet. Start a simulation to see alerts here.' +
            '</div>';
        return;
    }

    dynamicArea.innerHTML = notificationLog.map(n => {
        const iconBg = n.type === 'critical' ? '#fee2e2' :
            n.type === 'warning' ? '#fef3c7' :
                n.type === 'info' ? '#dbeafe' : '#dcfce7';

        const borderColor = n.type === 'critical' ? '#ef4444' :
            n.type === 'warning' ? '#f59e0b' :
                n.type === 'info' ? '#3b82f6' : '#22c55e';

        const svgIcon = getNotificationIconSVG(n.iconType || n.type);

        return `<div class="notification-item ${n.type}" style="border-left:3px solid ${borderColor};">
            <div class="notification-icon" style="background:${iconBg};display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;flex-shrink:0;">${svgIcon}</div>
            <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                ${n.detail ? `<div style="font-size:11.5px;color:#6b7280;margin-top:2px;line-height:1.4;">${n.detail}</div>` : ''}
                <div class="notification-time">${n.time}</div>
            </div>
        </div>`;
    }).join('');
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    panel.classList.toggle('show');

    if (panel.classList.contains('show')) {
        notificationCount = 0;
        updateNotificationBadge();
    }
}

/* =====================================================
   INIT
   ===================================================== */
drawGrid();

setInterval(updateTotalPeople, 1000);
setInterval(pollFireSystem, 1000);
setInterval(pollCorridorsData, 1000);
