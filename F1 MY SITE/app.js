document.addEventListener('DOMContentLoaded', () => {
    if (typeof tournamentData === 'undefined' || !tournamentData.allEvents) {
        console.error("Database (tournamentData) not found or is invalid.");
        return;
    }

    const db = tournamentData;
    const parseTimeToSeconds = (timeStr) => {
        if (typeof timeStr !== 'string') return Infinity;
        const parts = timeStr.split(/[:.]/);
        if (parts.length < 3) return Infinity;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2], 10) / 1000;
    };

    // --- STATE MANAGEMENT ---
    let activeEventId = db.allEvents[db.allEvents.length - 1].id;
    let activeDay = null;
    let activeSessionId = null;
    let activeView = 'table'; // 'table', 'strategy', or 'fastest-lap'

    // --- DOM ELEMENTS ---
    const eventSelectorEl = document.getElementById('event-selector-container');
    const daySelectorEl = document.getElementById('day-selector-container');
    const sessionSelectorEl = document.getElementById('session-selector-container');
    const eventTitleEl = document.getElementById('event-title');
    const tableViewContainer = document.getElementById('table-view-container');
    const strategyViewContainer = document.getElementById('strategy-view-container');
    const fastestLapViewContainer = document.getElementById('fastest-lap-view-container');
    const tbodyEl = document.getElementById('results-tbody');
    
    const allTheads = document.querySelectorAll('#results-viewer thead');
    const theadPractice = document.getElementById('thead-practice');
    const theadCombined = document.getElementById('thead-combined');
    const theadRace = document.getElementById('thead-race');

    // --- INITIALIZATION ---
    function initialize() {
        updateStateForActiveEvent();
        render();
    }

    // --- STATE UPDATE ---
    function updateStateForActiveEvent() {
        const event = db.allEvents.find(e => e.id === activeEventId);
        if (!event) return;

        if (event.eventType === 'testing') {
            activeView = 'table';
            if (!event.days.some(d => d.day === activeDay)) {
                activeDay = event.days[0].day;
            }
            const day = event.days.find(d => d.day === activeDay);
            activeSessionId = day.sessions[0].id;
        } else {
            activeDay = null;
            const raceSession = event.sessions.find(s => s.type === 'race') || event.sessions[0];
            activeSessionId = raceSession.id;
            activeView = 'table';
        }
    }

    // --- MAIN RENDER FUNCTION ---
    function render() {
        renderEventTabs();
        renderHeaderAndDayTabs();
        renderSessionTabs();

        strategyViewContainer.style.display = 'none';
        tableViewContainer.style.display = 'none';
        fastestLapViewContainer.style.display = 'none';

        if (activeView === 'strategy') {
            strategyViewContainer.style.display = 'block';
            renderStrategyView();
        } else if (activeView === 'fastest-lap') {
            fastestLapViewContainer.style.display = 'block';
            renderFastestLapView();
        } else {
            tableViewContainer.style.display = 'block';
            renderTable();
        }
    }

    // --- RENDER COMPONENTS ---
    function renderEventTabs() {
        eventSelectorEl.innerHTML = db.allEvents.map(event => `
            <button class="event-tab ${event.id === activeEventId ? 'active' : ''}" data-event-id="${event.id}">
                ${event.shortName}
            </button>
        `).join('');
        addEventListeners(eventSelectorEl, '.event-tab', handleEventTabClick);
    }

    function renderHeaderAndDayTabs() {
        const event = db.allEvents.find(e => e.id === activeEventId);
        eventTitleEl.textContent = event.name;
        if (event.eventType === 'testing') {
            daySelectorEl.style.display = 'flex';
            daySelectorEl.innerHTML = event.days.map(day => `<button class="day-tab-dark ${day.day === activeDay ? 'active' : ''}" data-day="${day.day}">${day.name}</button>`).join('');
            addEventListeners(daySelectorEl, '.day-tab-dark', handleDayTabClick);
        } else {
            daySelectorEl.style.display = 'none';
            daySelectorEl.innerHTML = '';
        }
    }
    
    function renderSessionTabs() {
        const event = db.allEvents.find(e => e.id === activeEventId);
        let sessions = [];

        if (event.eventType === 'testing') {
            const day = event.days.find(d => d.day === activeDay);
            sessions = day ? day.sessions : [];
        } else {
            sessions = event.sessions;
        }

        let tabsHtml = sessions.map(session => `
            <button class="session-tab-dark ${session.id === activeSessionId && activeView === 'table' ? 'active' : ''}" data-session-id="${session.id}">
                ${session.name}
            </button>
        `).join('');

        if (event.eventType === 'race') {
            tabsHtml += `<button class="session-tab-dark ${activeView === 'strategy' ? 'active' : ''}" data-session-id="strategy">Strategy</button>`;
            tabsHtml += `<button class="session-tab-dark ${activeView === 'fastest-lap' ? 'active' : ''}" data-session-id="fastest-lap">Fastest Laps</button>`;
        }

        sessionSelectorEl.innerHTML = tabsHtml;
        addEventListeners(sessionSelectorEl, '.session-tab-dark', handleSessionTabClick);
    }

    function renderTable() {
        const event = db.allEvents.find(e => e.id === activeEventId);
        let session;
        if (event.eventType === 'testing') {
            const day = event.days.find(d => d.day === activeDay);
            session = day ? day.sessions.find(s => s.id === activeSessionId) : null;
        } else {
            session = event.sessions.find(s => s.id === activeSessionId);
        }
        if (!session || !session.results) {
            tbodyEl.innerHTML = `<tr><td colspan="7" class="no-data">No results available.</td></tr>`;
            return;
        }
        allTheads.forEach(th => th.style.display = 'none');
        switch(session.type) {
            case 'practice': case 'qualifying':
                theadPractice.style.display = 'table-header-group';
                tbodyEl.innerHTML = renderPracticeQualiRows(session.results);
                break;
            case 'combined':
                theadCombined.style.display = 'table-header-group';
                tbodyEl.innerHTML = renderCombinedRows(session.results);
                break;
            case 'race':
                theadRace.style.display = 'table-header-group';
                tbodyEl.innerHTML = renderRaceRows(session.results);
                break;
            default:
                tbodyEl.innerHTML = `<tr><td colspan="7" class="no-data">Unknown session type.</td></tr>`;
        }
    }

    function renderStrategyView() {
        strategyViewContainer.innerHTML = '';
        const template = document.getElementById('strategy-card-template');
        const event = db.allEvents.find(e => e.id === activeEventId);
        if (!event || event.eventType !== 'race' || !strategyData[activeEventId]) {
            strategyViewContainer.innerHTML = `<div class="no-data">Strategy analysis not available.</div>`;
            return;
        }
        const eventStrategyData = strategyData[activeEventId];
        const qualiResults = event.sessions.find(s => s.type === 'qualifying')?.results || [];
        const raceResults = event.sessions.find(s => s.type === 'race')?.results || [];
        const startPositionMap = new Map(qualiResults.map(r => [r.driverId, parseInt(r.pos)]));

        raceResults.forEach(raceResult => {
            const driverId = raceResult.driverId;
            const driverData = db.drivers[driverId];
            const teamData = db.teams[driverData.teamId];
            const driverStrategy = eventStrategyData[driverId];
            if (!driverStrategy) return;
            const clone = template.content.cloneNode(true);
            const startPos = startPositionMap.get(driverId) || 0;
            const endPos = parseInt(raceResult.pos) || (raceResults.length + 1);
            const gainLoss = startPos ? startPos - endPos : 0;
            clone.querySelector('[data-pos]').textContent = raceResult.pos;
            clone.querySelector('[data-driver-name]').textContent = driverData.name;
            clone.querySelector('[data-team-logo]').src = teamData.logoUrl;
            clone.querySelector('[data-analysis]').textContent = driverStrategy.analysis;
            const gainLossEl = clone.querySelector('[data-gain-loss]');
            if (gainLoss > 0) { gainLossEl.textContent = `▲ +${gainLoss}`; gainLossEl.classList.add('up'); }
            else if (gainLoss < 0) { gainLossEl.textContent = `▼ ${gainLoss}`; gainLossEl.classList.add('down'); }
            else { gainLossEl.textContent = `▬ =`; gainLossEl.classList.add('same'); }
            const stintsEl = clone.querySelector('[data-stints]');
            const stints = driverStrategy.strategy.split('-');
            stintsEl.innerHTML = stints.map(stint => `<span class="tyre-icon tyre-${stint}">${stint}</span>`).join('<span class="stint-arrow">→</span>');
            const stops = stints.length - 1;
            clone.querySelector('[data-stops]').textContent = `${stops} STOP${stops !== 1 ? 'S' : ''}`;
            strategyViewContainer.appendChild(clone);
        });
    }

    function renderFastestLapView() {
        fastestLapViewContainer.innerHTML = '';
        const template = document.getElementById('fastest-lap-item-template');
        const event = db.allEvents.find(e => e.id === activeEventId);
        const raceSession = event?.sessions.find(s => s.type === 'race');
        if (!raceSession || !raceSession.results.some(r => r.bestLap)) {
            fastestLapViewContainer.innerHTML = `<div class="no-data">Fastest lap data not available.</div>`;
            return;
        }

        const lapData = raceSession.results
            .filter(r => r.bestLap)
            .map(r => ({ driverId: r.driverId, time: r.bestLap, timeInSeconds: parseTimeToSeconds(r.bestLap) }))
            .sort((a, b) => a.timeInSeconds - b.timeInSeconds);

        const fastestTime = lapData[0]?.timeInSeconds;

        lapData.forEach((lap, index) => {
            const driver = db.drivers[lap.driverId];
            const team = db.teams[driver.teamId];
            const clone = template.content.cloneNode(true);

            clone.querySelector('.fastest-lap-item').classList.toggle('leader', index === 0);
            clone.querySelector('[data-rank]').textContent = index + 1;
            clone.querySelector('[data-driver-photo]').src = driver.imageUrl;
            clone.querySelector('[data-name]').textContent = driver.name;
            clone.querySelector('[data-team-name]').textContent = team.name;
            clone.querySelector('[data-team-bar]').className = `team-color-bar ${team.className}`;
            clone.querySelector('[data-time]').textContent = lap.time;

            const gap = lap.timeInSeconds - fastestTime;
            clone.querySelector('[data-gap]').textContent = index === 0 ? '-' : `+${gap.toFixed(3)}`;

            fastestLapViewContainer.appendChild(clone);
        });
    }

    function renderPracticeQualiRows(results) {
        return results.map(res => {
            const driver = db.drivers[res.driverId]; const team = db.teams[driver.teamId];
            return `<tr><td>${res.pos}</td><td class="driver-col"><img src="${driver.imageUrl}" alt="${driver.name}" class="driver-photo"><span class="team-color-bar ${team.className}"></span><div>${driver.name}<small>${team.name}</small></div></td><td class="time">${res.time || 'N/A'}</td><td class="gap">${res.gap || '-'}</td><td>${res.laps || '-'}</td></tr>`;
        }).join('');
    }
    function renderCombinedRows(results) {
        return results.map(res => {
            const driver = db.drivers[res.driverId]; const team = db.teams[driver.teamId];
            return `<tr><td>${res.pos}</td><td class="driver-col"><img src="${driver.imageUrl}" alt="${driver.name}" class="driver-photo"><span class="team-color-bar ${team.className}"></span><div>${driver.name}<small>${team.name}</small></div></td><td class="time">${res.time}</td><td class="gap">${res.gap}</td><td>${res.laps}</td><td><span class="session-tag-dark ${res.sessionSetIn.toLowerCase()}">${res.sessionSetIn}</span></td></tr>`;
        }).join('');
    }
    function renderRaceRows(results) {
        return results.map(res => {
            const driver = db.drivers[res.driverId]; const team = db.teams[driver.teamId];
            return `<tr><td>${res.pos}</td><td>${driver.driverNumber}</td><td class="driver-col-race">${driver.name}</td><td><img src="${team.logoUrl}" alt="${team.name}" class="team-logo-rank"> ${team.name}</td><td>${res.laps}</td><td>${res.timeOrStatus}</td><td class="pts-cell">${res.points > 0 ? `<span class="pts">${res.points}</span>` : ''}</td></tr>`;
        }).join('');
    }

    // --- EVENT HANDLERS ---
    function handleEventTabClick(e) {
        activeEventId = e.target.dataset.eventId;
        updateStateForActiveEvent();
        render();
    }
    function handleDayTabClick(e) {
        activeDay = parseInt(e.target.dataset.day);
        const event = db.allEvents.find(e => e.id === activeEventId);
        const day = event.days.find(d => d.day === activeDay);
        activeSessionId = day.sessions[0].id;
        activeView = 'table';
        render();
    }
    function handleSessionTabClick(e) {
        const selectedSession = e.target.dataset.sessionId;
        if (selectedSession === 'strategy') { activeView = 'strategy'; activeSessionId = null; }
        else if (selectedSession === 'fastest-lap') { activeView = 'fastest-lap'; activeSessionId = null; }
        else { activeView = 'table'; activeSessionId = selectedSession; }
        render();
    }
    function addEventListeners(parent, selector, handler) {
        parent.querySelectorAll(selector).forEach(el => el.addEventListener('click', handler));
    }

    initialize();
});