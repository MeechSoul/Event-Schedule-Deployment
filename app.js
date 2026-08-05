/**
 * ATX ROX & Custom Event Schedule Engine
 * Live Google Sheets Auto-Sync, Multi-Day Tabs, Dual Layouts, Brand Kit Customizer,
 * Scoop Announcements Banner & Dynamic Sponsor Showcase
 */

// Global State
const CONFIG = {
  defaultCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRYBLvB4_05i_D7KHyR4v55tsRYfDS2PTN2zPRxjfxtT5gEfvuk1tuV2T-4HpYQgbgEz070Y7EDBnbz/pub?gid=1745454581&single=true&output=csv',
  syncIntervalMs: 60000, // 60 seconds auto-sync
};

let state = {
  rawCsvData: null,
  parsedSessions: [], // Array of session objects
  dayScoops: {},      // Map of day -> array of unique key scoop notes
  sponsorsFound: [],  // Array of sponsor objects { name, logoUrl }
  daysFound: [],      // Array of day strings (e.g. ['FRIYAY', 'SATURYAY', 'SUNYAY'])
  roomsFound: [],     // Unique list of rooms/locations
  activeDay: 'ALL',   // 'ALL', 'FRIYAY', 'SATURYAY', etc.
  activeCategory: 'ALL',
  activeRoom: 'ALL',
  searchQuery: '',
  currentView: 'agenda', // 'agenda' or 'grid'
  lastSyncTimestamp: null,
  syncTimer: null,
  selectedSessionForModal: null,
  themeSettings: {
    preset: 'atx-rox',
    primary: '#ff2a85',
    secondary: '#00f0ff',
    bg: '#0d0b1a',
    card: '#18152e',
    title: 'A MAGICAL WESTIE WEEKEND 🦄',
    subtitle: 'ATX ROX 2026 • AUSTIN, TX • SEPT 18-20, 2026'
  }
};

// DOM Elements Registry
const DOM = {};

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  const mode = getQueryParam('mode');
  const isIframe = window.self !== window.top;
  if (mode === 'public' || mode === 'embed' || isIframe) {
    document.body.classList.add('is-public-mode');
  }

  cacheDOMElements();
  loadSavedTheme();
  initEventListeners();
  fetchGoogleSheetSchedule(false); // Initial load
  startAutoSyncTimer();
});

// Cache DOM Elements
function cacheDOMElements() {
  DOM.eventTitle = document.getElementById('eventTitle');
  DOM.eventSubtitle = document.getElementById('eventSubtitle');
  DOM.liveStatusText = document.getElementById('liveStatusText');
  DOM.syncSpinner = document.getElementById('syncSpinner');
  DOM.lastSyncTime = document.getElementById('lastSyncTime');
  DOM.btnSyncNow = document.getElementById('btnSyncNow');
  
  DOM.dayTabsContainer = document.getElementById('dayTabsContainer');
  DOM.searchInput = document.getElementById('searchInput');
  DOM.btnClearSearch = document.getElementById('btnClearSearch');
  DOM.roomFilter = document.getElementById('roomFilter');
  DOM.categoryPillsContainer = document.getElementById('categoryPillsContainer');
  
  DOM.viewBtnAgenda = document.getElementById('viewBtnAgenda');
  DOM.viewBtnGrid = document.getElementById('viewBtnGrid');
  DOM.agendaView = document.getElementById('agendaView');
  DOM.gridView = document.getElementById('gridView');
  DOM.agendaTimeline = document.getElementById('agendaTimeline');
  DOM.sheetGridTable = document.getElementById('sheetGridTable');
  DOM.gridTableHead = document.getElementById('gridTableHead');
  DOM.gridTableBody = document.getElementById('gridTableBody');
  DOM.sponsorsContainer = document.getElementById('sponsorsContainer');
  
  DOM.loadingState = document.getElementById('loadingState');
  DOM.errorState = document.getElementById('errorState');
  DOM.errorMessage = document.getElementById('errorMessage');
  DOM.emptyState = document.getElementById('emptyState');
  DOM.btnRetry = document.getElementById('btnRetry');
  DOM.btnResetFilters = document.getElementById('btnResetFilters');

  // Embed Modal
  DOM.btnOpenEmbedModal = document.getElementById('btnOpenEmbedModal');
  DOM.embedModal = document.getElementById('embedModal');
  DOM.btnCloseEmbedModal = document.getElementById('btnCloseEmbedModal');
  DOM.btnDoneEmbed = document.getElementById('btnDoneEmbed');
  DOM.embedSheetUrl = document.getElementById('embedSheetUrl');
  DOM.embedHeight = document.getElementById('embedHeight');
  DOM.embedThemeSelect = document.getElementById('embedThemeSelect');
  DOM.embedCodeTextarea = document.getElementById('embedCodeTextarea');
  DOM.btnCopyEmbed = document.getElementById('btnCopyEmbed');
  DOM.footerEmbedLink = document.getElementById('footerEmbedLink');

  // Theme Drawer
  DOM.btnOpenThemeDrawer = document.getElementById('btnOpenThemeDrawer');
  DOM.themeDrawer = document.getElementById('themeDrawer');
  DOM.btnCloseThemeDrawer = document.getElementById('btnCloseThemeDrawer');
  DOM.btnResetTheme = document.getElementById('btnResetTheme');
  DOM.btnApplyTheme = document.getElementById('btnApplyTheme');
  DOM.colorPrimary = document.getElementById('colorPrimary');
  DOM.colorSecondary = document.getElementById('colorSecondary');
  DOM.colorBackground = document.getElementById('colorBackground');
  DOM.colorCard = document.getElementById('colorCard');
  DOM.hexPrimary = document.getElementById('hexPrimary');
  DOM.hexSecondary = document.getElementById('hexSecondary');
  DOM.hexBackground = document.getElementById('hexBackground');
  DOM.hexCard = document.getElementById('hexCard');
  DOM.customTitleInput = document.getElementById('customTitleInput');
  DOM.customSubtitleInput = document.getElementById('customSubtitleInput');

  // Event Detail Modal
  DOM.eventDetailModal = document.getElementById('eventDetailModal');
  DOM.btnCloseEventDetailModal = document.getElementById('btnCloseEventDetailModal');
  DOM.eventDetailModalBody = document.getElementById('eventDetailModalBody');
  DOM.modalCategoryBadge = document.getElementById('modalCategoryBadge');
  DOM.btnAddToCalGoogle = document.getElementById('btnAddToCalGoogle');
  DOM.btnAddToCalIcs = document.getElementById('btnAddToCalIcs');
}

/* ==========================================================================
   LIVE GOOGLE SHEET DATA FETCHING & SEAMLESS REFRESH
   ========================================================================== */

async function fetchGoogleSheetSchedule(isSilent = false) {
  if (!isSilent && state.parsedSessions.length === 0) {
    showLoading(true);
  }

  DOM.syncSpinner.classList.add('spinning');
  if (DOM.liveStatusText) DOM.liveStatusText.textContent = 'SYNCING...';

  try {
    const csvUrl = getQueryParam('sheet') || CONFIG.defaultCsvUrl;
    let csvText = '';

    // Strategy 1: Direct Fetch
    try {
      const res1 = await fetch(csvUrl);
      if (res1.ok) {
        const txt = await res1.text();
        if (txt && txt.length > 50 && !txt.trim().toLowerCase().startsWith('<!doctype')) {
          csvText = txt;
        }
      }
    } catch (e1) {
      console.log('Direct CSV fetch failed, trying proxy fallback...');
    }

    // Strategy 2: Proxy Fallback
    if (!csvText) {
      try {
        const res2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`);
        if (res2.ok) {
          const txt = await res2.text();
          if (txt && txt.length > 50 && !txt.trim().toLowerCase().startsWith('<!doctype')) {
            csvText = txt;
          }
        }
      } catch (e2) {
        console.log('Proxy fetch failed...');
      }
    }

    if (csvText) {
      if (state.rawCsvData === csvText && state.parsedSessions.length > 0) {
        state.lastSyncTimestamp = new Date();
        updateSyncTimeDisplay();
        showLoading(false);
        if (DOM.liveStatusText) DOM.liveStatusText.textContent = 'GET READY TO ROX!';
        return;
      }

      state.rawCsvData = csvText;
      const savedScrollY = window.scrollY;
      parseCSVAndBuildSchedule(csvText);
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });

      state.lastSyncTimestamp = new Date();
      updateSyncTimeDisplay();
      showLoading(false);
      DOM.errorState.classList.add('hidden');
      if (DOM.liveStatusText) DOM.liveStatusText.textContent = 'GET READY TO ROX!';
    } else {
      if (state.parsedSessions.length === 0) {
        useFallbackScheduleData();
      }
      showLoading(false);
      DOM.errorState.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Google Sheet fetch error:', err);
    if (state.parsedSessions.length === 0) {
      useFallbackScheduleData();
    }
    showLoading(false);
    DOM.errorState.classList.add('hidden');
  } finally {
    DOM.syncSpinner.classList.remove('spinning');
  }
}

// Background Auto-Sync Polling
function startAutoSyncTimer() {
  if (state.syncTimer) clearInterval(state.syncTimer);
  state.syncTimer = setInterval(() => {
    fetchGoogleSheetSchedule(true);
  }, CONFIG.syncIntervalMs);
}

function updateSyncTimeDisplay() {
  if (!state.lastSyncTimestamp) return;
  const timeStr = state.lastSyncTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  DOM.lastSyncTime.textContent = timeStr;
}

/* ==========================================================================
   ROBUST CSV PARSER FOR CONCURRENT EVENTS, SCOOP & SPONSORS
   ========================================================================== */

function parseCSVAndBuildSchedule(csvText) {
  const lines = parseCSVRows(csvText);
  const sessions = [];
  const daysFound = new Set();
  const roomsFound = new Set();
  const dayScoopsMap = {};
  const sponsorsSet = new Set();

  let currentDay = 'FRIYAY'; // Default initial day
  let lastKnownTime = '';    // Track last seen time for concurrent sessions

  lines.forEach((cols, rowIndex) => {
    if (!cols || cols.length < 3) return;

    // Check if row is a Day Section Divider (e.g. FRIYAY, SATURYAY, SUNYAY, DAY 1, etc.)
    const col2Str = (cols[2] || '').trim().toUpperCase();
    const col0Str = (cols[0] || '').trim().toUpperCase();
    const col1Str = (cols[1] || '').trim().toUpperCase();

    const possibleDayMarker = [col0Str, col1Str, col2Str].find(val => 
      ['FRIYAY', 'SATURYAY', 'SUNYAY', 'THURSYAY', 'MONYAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'THURSDAY', 'DAY 1', 'DAY 2', 'DAY 3', 'DAY 4'].includes(val)
    );

    if (possibleDayMarker) {
      currentDay = possibleDayMarker;
      lastKnownTime = ''; // Reset time on new day section
      daysFound.add(currentDay);
      if (!dayScoopsMap[currentDay]) dayScoopsMap[currentDay] = [];
      return;
    }

    // Extract Sponsors from Column Q (index 16) or Column 15
    const sponsorVal = (cols[16] || cols[15] || '').trim();
    if (sponsorVal && !sponsorVal.toUpperCase().startsWith('SPONSOR') && !sponsorVal.toUpperCase().startsWith('THANK YOU')) {
      sponsorsSet.add(sponsorVal);
    }

    // Extract Scoop Note (Column M = index 12, or fallback to 11/10)
    const rawScoopVal = (cols[12] || cols[11] || cols[10] || '').trim();
    
    // Asterisk Display Rules:
    // ** (double asterisk): Listed ONLY at Top-of-Day Scoop Banner, NOT on event card.
    // *  (single asterisk): Listed in BOTH Top-of-Day Scoop Banner AND on event card.
    //    (no asterisk):     Listed ONLY on event card, NOT in Top-of-Day banner.
    const isDoubleAsterisk = rawScoopVal.startsWith('**');
    const isSingleAsterisk = rawScoopVal.startsWith('*') && !isDoubleAsterisk;
    const cleanScoopVal = rawScoopVal.replace(/^\*+\s*/, '').trim();

    if (cleanScoopVal && cleanScoopVal !== '💥' && !cleanScoopVal.toUpperCase().includes('SCOOP')) {
      // Include in Top-of-Day Banner if it has * or **
      if (isSingleAsterisk || isDoubleAsterisk) {
        if (!dayScoopsMap[currentDay]) dayScoopsMap[currentDay] = [];
        if (!dayScoopsMap[currentDay].includes(cleanScoopVal)) {
          dayScoopsMap[currentDay].push(cleanScoopVal);
        }
      }
    }

    // Check time column
    const rawTimeVal = (cols[3] || cols[2] || cols[1] || '').trim();
    const isTimeFormat = /^(\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\s*(?:AM|PM))/i.test(rawTimeVal);

    let timeVal = '';
    if (isTimeFormat) {
      timeVal = rawTimeVal;
      lastKnownTime = timeVal;
    } else if (lastKnownTime) {
      timeVal = lastKnownTime;
    }

    const title = (cols[5] || cols[4] || cols[6] || '').trim();
    const isHeaderRow = ['THE MAGIC', 'FORMAT', 'ARTISTS', 'ARTISTS & LOCATIONS', 'TITLE'].includes(title.toUpperCase());

    if (title && !isHeaderRow && timeVal) {
      const icon = (cols[2] || cols[1] || '🦄').trim();
      const format = (cols[6] || cols[5] || 'EVENT').trim();
      
      const artist1 = (cols[7] || '').trim();
      const artist2 = (cols[8] || '').trim();
      let artists = '';
      if (artist1 && artist2 && artist1 !== artist2) {
        artists = `${artist1} • ${artist2}`;
      } else {
        artists = artist1 || artist2 || '';
      }

      // Extract Room / Location (Column J = index 9 "LOCAL")
      let location = (cols[9] || '').trim();

      // Ensure location is a valid room and NOT a DJ/MC staff name
      const isStaffOrDj = /^(DJ|DJs|MC|MCs)\s+/i.test(location) || location.toUpperCase().includes('DJ ');
      if (!location || isStaffOrDj || /^[🎓🦄🏆🍄🍬🛟🥇🪄🎼]+$/.test(location)) {
        location = 'Big Room'; // Default to main ballroom
      }

      if (location) roomsFound.add(location);
      daysFound.add(currentDay);

      // Event Card Scoop: Displayed UNLESS it starts with double asterisk (**)
      const eventCardScoop = isDoubleAsterisk ? '' : cleanScoopVal;

      sessions.push({
        id: `session_${rowIndex}`,
        day: currentDay,
        icon: icon || '✨',
        time: timeVal,
        title: title,
        format: format,
        artists: artists,
        location: location,
        scoop: eventCardScoop,
        isTopDayScoop: (isSingleAsterisk || isDoubleAsterisk),
        rawCols: cols
      });
    }
  });

  // Calculate Concurrent Event Counts
  const timeSlotCounts = {};
  sessions.forEach(s => {
    const key = `${s.day}_${s.time}`;
    timeSlotCounts[key] = (timeSlotCounts[key] || 0) + 1;
  });

  sessions.forEach(s => {
    const key = `${s.day}_${s.time}`;
    s.isConcurrent = timeSlotCounts[key] > 1;
    s.concurrentCount = timeSlotCounts[key];
  });

  // Enforce explicitly requested primary room list and order
  const PRIMARY_ROOMS = ['Big Room', 'Side Room', 'Small Room', 'Bliss Room'];

  state.parsedSessions = sessions;
  state.daysFound = Array.from(daysFound);
  state.roomsFound = PRIMARY_ROOMS;
  state.dayScoops = dayScoopsMap;
  state.sponsorsFound = Array.from(sponsorsSet).map(s => {
    // Check if sponsor text is an image URL or formula
    const isUrl = /^https?:\/\/.+\.(png|jpg|jpeg|svg|gif|webp)$/i.test(s);
    return { name: s, logoUrl: isUrl ? s : null };
  });

  updateDayTabsUI();
  updateRoomFilterUI();
  renderSponsorsUI();
  renderCurrentView();
}

// Utility: Correctly parse CSV rows accounting for quotes and commas
function parseCSVRows(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

/* ==========================================================================
   DYNAMIC UI RENDERING (AGENDA CARDS, SCOOP BANNERS & SPONSORS)
   ========================================================================== */

function updateDayTabsUI() {
  let html = `
    <button class="tab-btn ${state.activeDay === 'ALL' ? 'active' : ''}" data-day="ALL">
      <i class="fa-solid fa-wand-magic-sparkles"></i> Full Schedule
    </button>
  `;

  state.daysFound.forEach(day => {
    let dayLabel = day;
    if (day === 'FRIYAY') dayLabel = 'FRIYAY (Day 1)';
    else if (day === 'SATURYAY') dayLabel = 'SATURYAY (Day 2)';
    else if (day === 'SUNYAY') dayLabel = 'SUNYAY (Day 3)';

    html += `
      <button class="tab-btn ${state.activeDay === day ? 'active' : ''}" data-day="${day}">
        ${dayLabel}
      </button>
    `;
  });

  DOM.dayTabsContainer.innerHTML = html;
}

function updateRoomFilterUI() {
  if (!DOM.roomFilter) return;
  let html = `<option value="ALL">All Rooms & Locations</option>`;
  state.roomsFound.forEach(room => {
    html += `<option value="${escapeHtml(room)}" ${state.activeRoom === room ? 'selected' : ''}>${escapeHtml(room)}</option>`;
  });
  DOM.roomFilter.innerHTML = html;
}

function renderSponsorsUI() {
  if (!DOM.sponsorsContainer) return;
  if (state.sponsorsFound.length === 0) {
    DOM.sponsorsContainer.classList.add('hidden');
    return;
  }

  DOM.sponsorsContainer.classList.remove('hidden');
  let html = `
    <div class="sponsors-bar">
      <div class="sponsors-header">
        <i class="fa-solid fa-trophy"></i>
        <span>THANK YOU TO OUR EVENT SPONSORS</span>
      </div>
      <div class="sponsors-grid">
  `;

  state.sponsorsFound.forEach(sp => {
    if (sp.logoUrl) {
      html += `<div class="sponsor-card sponsor-logo"><img src="${sp.logoUrl}" alt="${escapeHtml(sp.name)}" title="${escapeHtml(sp.name)}"></div>`;
    } else {
      html += `<div class="sponsor-card sponsor-badge"><i class="fa-solid fa-star"></i> ${escapeHtml(sp.name)}</div>`;
    }
  });

  html += `
      </div>
    </div>
  `;

  DOM.sponsorsContainer.innerHTML = html;
}

function getFilteredSessions() {
  return state.parsedSessions.filter(s => {
    // Day Filter
    if (state.activeDay !== 'ALL' && s.day !== state.activeDay) return false;

    // Room Filter
    if (state.activeRoom !== 'ALL') {
      const filterRoom = state.activeRoom.toLowerCase();
      const sessionRoom = s.location.toLowerCase();
      if (!sessionRoom.includes(filterRoom)) return false;
    }

    // Category Filter
    if (state.activeCategory !== 'ALL') {
      const cat = state.activeCategory.toUpperCase();
      const sessionFormat = s.format.toUpperCase();
      const sessionTitle = s.title.toUpperCase();
      if (!sessionFormat.includes(cat) && !sessionTitle.includes(cat)) {
        return false;
      }
    }

    // Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchArtist = s.artists.toLowerCase().includes(q);
      const matchRoom = s.location.toLowerCase().includes(q);
      const matchScoop = s.scoop.toLowerCase().includes(q);
      const matchFormat = s.format.toLowerCase().includes(q);
      if (!matchTitle && !matchArtist && !matchRoom && !matchScoop && !matchFormat) {
        return false;
      }
    }

    return true;
  });
}

function renderCurrentView() {
  const filtered = getFilteredSessions();

  if (filtered.length === 0) {
    DOM.emptyState.classList.remove('hidden');
    DOM.agendaView.classList.add('hidden');
    DOM.gridView.classList.add('hidden');
    return;
  } else {
    DOM.emptyState.classList.add('hidden');
  }

  if (state.currentView === 'agenda') {
    DOM.agendaView.classList.remove('hidden');
    DOM.gridView.classList.add('hidden');
    renderAgendaTimeline(filtered);
  } else {
    DOM.gridView.classList.remove('hidden');
    DOM.agendaView.classList.add('hidden');
    renderSheetGridTable(filtered);
  }

  updateStickyHeaderOffset();
}

// Render Agenda List Timeline Cards with Day Scoop Banners & Concurrent Indicators
function renderAgendaTimeline(sessions) {
  let html = '';
  let lastGroupDay = null;

  sessions.forEach(session => {
    // Inject Day Group Header & Daily Scoop Banner if day changes
    if (session.day !== lastGroupDay) {
      lastGroupDay = session.day;
      let dayTitle = lastGroupDay;
      if (lastGroupDay === 'FRIYAY') dayTitle = '🎉 FRIYAY - DAY 1';
      else if (lastGroupDay === 'SATURYAY') dayTitle = '🔥 SATURYAY - DAY 2';
      else if (lastGroupDay === 'SUNYAY') dayTitle = '🌟 SUNYAY - DAY 3';

      html += `
        <div class="day-header-banner" data-day="${session.day}" id="day_banner_${session.day}">
          <h2>${dayTitle}</h2>
        </div>
      `;

      // Render Day Scoop Key Notes Announcement Box if notes exist for this day
      const scoops = state.dayScoops[lastGroupDay] || [];
      if (scoops.length > 0) {
        html += `
          <div class="day-scoop-banner" data-day="${session.day}">
            <div class="day-scoop-title">
              <i class="fa-solid fa-bullhorn"></i>
              <span>${lastGroupDay} SCOOP & IMPORTANT NOTES</span>
            </div>
            <ul class="day-scoop-list">
              ${scoops.map(sc => `<li><i class="fa-solid fa-lightbulb"></i> ${escapeHtml(sc)}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    // Generate Room Badge Color
    let roomColorStyle = '';
    const loc = session.location.toLowerCase();
    if (loc.includes('big room')) roomColorStyle = 'background: rgba(255, 42, 133, 0.15); color: #ff2a85; border-color: rgba(255, 42, 133, 0.3);';
    else if (loc.includes('side room')) roomColorStyle = 'background: rgba(0, 240, 255, 0.15); color: #00f0ff; border-color: rgba(0, 240, 255, 0.3);';
    else if (loc.includes('small room')) roomColorStyle = 'background: rgba(255, 215, 0, 0.15); color: #ffd700; border-color: rgba(255, 215, 0, 0.3);';
    else if (loc.includes('bliss')) roomColorStyle = 'background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.3);';

    html += `
      <div class="session-card ${session.isConcurrent ? 'is-concurrent' : ''}" data-id="${session.id}" data-day="${session.day}">
        <div class="session-time-col">
          <span class="session-icon">${session.icon}</span>
          <span class="session-time">${escapeHtml(session.time)}</span>
          ${session.isConcurrent ? `<span class="badge-concurrent" title="${session.concurrentCount} events happening simultaneously"><i class="fa-solid fa-layer-group"></i> Concurrent Track</span>` : ''}
        </div>
        <div class="session-main-col">
          <div class="session-top-meta">
            <span class="badge-format">${escapeHtml(session.format)}</span>
            <span class="badge-room" style="${roomColorStyle}"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(session.location)}</span>
          </div>
          <h3 class="session-title">${escapeHtml(session.title)}</h3>
          ${session.artists ? `
            <div class="session-artists">
              <i class="fa-solid fa-wand-magic-sparkles"></i> ${escapeHtml(session.artists)}
            </div>
          ` : ''}
          ${session.scoop && session.scoop !== '💥' ? `
            <div class="session-scoop">
              💡 <strong>The Scoop:</strong> ${escapeHtml(session.scoop)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  DOM.agendaTimeline.innerHTML = html;

  DOM.agendaTimeline.querySelectorAll('.session-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const session = state.parsedSessions.find(s => s.id === id);
      if (session) openEventDetailModal(session);
    });
  });
}

// Render Sheet Grid View Table
function renderSheetGridTable(sessions) {
  DOM.gridTableHead.innerHTML = `
    <tr>
      <th>Day</th>
      <th style="font-size: 1.1rem; text-align: center;">🦄</th>
      <th>Time</th>
      <th>Activity</th>
      <th>Format</th>
      <th>Artists / Staff</th>
      <th>Room / Location</th>
      <th>The Scoop / Key Notes</th>
    </tr>
  `;

  let bodyHtml = '';
  sessions.forEach(s => {
    bodyHtml += `
      <tr>
        <td><strong>${escapeHtml(s.day)}</strong></td>
        <td style="font-size: 1.2rem;">${s.icon}</td>
        <td><strong style="color: var(--secondary-color);">${escapeHtml(s.time)}</strong> ${s.isConcurrent ? '<i class="fa-solid fa-layer-group" style="font-size: 0.7rem; color: var(--primary-color);" title="Concurrent event"></i>' : ''}</td>
        <td><strong>${escapeHtml(s.title)}</strong></td>
        <td><span class="badge-format">${escapeHtml(s.format)}</span></td>
        <td style="color: var(--accent-gold);">${escapeHtml(s.artists || '-')}</td>
        <td><strong>${escapeHtml(s.location)}</strong></td>
        <td style="color: var(--text-muted);"><span class="grid-scoop-highlight">${escapeHtml(s.scoop || '-')}</span></td>
      </tr>
    `;
  });

  DOM.gridTableBody.innerHTML = bodyHtml;
}

/* ==========================================================================
   EVENT DETAIL MODAL & CALENDAR (.ICS / GOOGLE CAL)
   ========================================================================== */

function openEventDetailModal(session) {
  state.selectedSessionForModal = session;
  DOM.modalCategoryBadge.textContent = session.format.toUpperCase();
  
  DOM.eventDetailModalBody.innerHTML = `
    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${session.icon}</div>
    <h2 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-main); margin-bottom: 0.5rem;">
      ${escapeHtml(session.title)}
    </h2>
    <div style="display: flex; flex-wrap: wrap; gap: 1rem; color: var(--secondary-color); font-weight: 700; font-size: 1rem; margin-bottom: 1rem;">
      <span><i class="fa-regular fa-clock"></i> ${escapeHtml(session.time)} (${session.day})</span>
      <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(session.location)}</span>
      ${session.isConcurrent ? `<span style="color: var(--primary-color);"><i class="fa-solid fa-layer-group"></i> Concurrent Track</span>` : ''}
    </div>
    ${session.artists ? `
      <p style="color: var(--accent-gold); font-weight: 600; margin-bottom: 0.75rem;">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Featuring: ${escapeHtml(session.artists)}
      </p>
    ` : ''}
    ${session.scoop && session.scoop !== '💥' ? `
      <div style="background: rgba(0,0,0,0.3); border-left: 3px solid var(--primary-color); padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.9rem; color: var(--text-muted);">
        <strong>The Scoop:</strong> ${escapeHtml(session.scoop)}
      </div>
    ` : ''}
  `;

  DOM.eventDetailModal.classList.remove('hidden');
}

function generateGoogleCalendarUrl(session) {
  const title = encodeURIComponent(`${session.icon} ${session.title} - ATX ROX`);
  const details = encodeURIComponent(`Format: ${session.format}\nArtists: ${session.artists}\nLocation: ${session.location}\nNotes: ${session.scoop}`);
  const location = encodeURIComponent(`${session.location}, ATX ROX Convention`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
}

function downloadIcsFile(session) {
  const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ATX ROX Schedule App//EN
BEGIN:VEVENT
SUMMARY:${session.icon} ${session.title}
DESCRIPTION:Format: ${session.format}\\nArtists: ${session.artists}\\nNotes: ${session.scoop}
LOCATION:${session.location}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ==========================================================================
   THEME MANAGER & BRAND KIT CUSTOMIZER
   ========================================================================== */

function applyThemeSettings(settings) {
  state.themeSettings = { ...state.themeSettings, ...settings };
  const root = document.documentElement;

  root.style.setProperty('--primary-color', state.themeSettings.primary);
  root.style.setProperty('--primary-glow', hexToRgba(state.themeSettings.primary, 0.35));
  root.style.setProperty('--secondary-color', state.themeSettings.secondary);
  root.style.setProperty('--secondary-glow', hexToRgba(state.themeSettings.secondary, 0.25));
  root.style.setProperty('--bg-color', state.themeSettings.bg);
  root.style.setProperty('--card-bg', state.themeSettings.card);

  document.body.className = `theme-${state.themeSettings.preset}`;

  DOM.eventTitle.textContent = state.themeSettings.title;
  DOM.eventSubtitle.textContent = state.themeSettings.subtitle;

  DOM.colorPrimary.value = state.themeSettings.primary;
  DOM.hexPrimary.textContent = state.themeSettings.primary;
  DOM.colorSecondary.value = state.themeSettings.secondary;
  DOM.hexSecondary.textContent = state.themeSettings.secondary;
  DOM.colorBackground.value = state.themeSettings.bg;
  DOM.hexBackground.textContent = state.themeSettings.bg;
  DOM.colorCard.value = state.themeSettings.card;
  DOM.hexCard.textContent = state.themeSettings.card;
  DOM.customTitleInput.value = state.themeSettings.title;
  DOM.customSubtitleInput.value = state.themeSettings.subtitle;

  saveThemeToLocalStorage();
  updateEmbedSnippetCode();
}

function saveThemeToLocalStorage() {
  localStorage.setItem('atx_schedule_theme', JSON.stringify(state.themeSettings));
}

function loadSavedTheme() {
  const saved = localStorage.getItem('atx_schedule_theme');
  if (saved) {
    try {
      applyThemeSettings(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to parse saved theme settings');
    }
  }
}

const PRESET_THEMES = {
  'atx-rox': { primary: '#ff2a85', secondary: '#00f0ff', bg: '#0d0b1a', card: '#18152e', preset: 'atx-rox' },
  'cyberpunk': { primary: '#00ff66', secondary: '#ff0055', bg: '#05050a', card: '#0c1410', preset: 'cyberpunk' },
  'minimalist': { primary: '#2563eb', secondary: '#0f172a', bg: '#f8fafc', card: '#ffffff', preset: 'minimalist' },
  'vibrant': { primary: '#f59e0b', secondary: '#ef4444', bg: '#1e1b4b', card: '#25215c', preset: 'vibrant' }
};

/* ==========================================================================
   EMBED CODE GENERATOR
   ========================================================================== */

function updateEmbedSnippetCode() {
  const currentUrl = window.location.href.split('?')[0];
  const sheetUrl = encodeURIComponent(CONFIG.defaultCsvUrl);
  const theme = state.themeSettings.preset;
  const height = DOM.embedHeight.value || '850px';

  const embedUrl = `${currentUrl}?sheet=${encodeURIComponent(sheetUrl)}&theme=${theme}&mode=public`;

  const iframeSnippet = `<!-- START EVENT SCHEDULE EMBED CODE -->
<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="${height}" 
  frameborder="0" 
  style="border: none; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);"
  allow="clipboard-write"
  title="Event Schedule">
</iframe>
<!-- END EVENT SCHEDULE EMBED CODE -->`;

  DOM.embedCodeTextarea.value = iframeSnippet;
}

/* ==========================================================================
   EVENT LISTENERS & CONTROLS
   ========================================================================== */

function initEventListeners() {
  DOM.btnSyncNow.addEventListener('click', () => fetchGoogleSheetSchedule(true));
  DOM.btnRetry.addEventListener('click', () => fetchGoogleSheetSchedule(false));

  DOM.dayTabsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    state.activeDay = btn.getAttribute('data-day');
    updateDayTabsUI();
    renderCurrentView();
  });

  DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    DOM.btnClearSearch.style.display = state.searchQuery ? 'block' : 'none';
    renderCurrentView();
  });

  DOM.btnClearSearch.addEventListener('click', () => {
    state.searchQuery = '';
    DOM.searchInput.value = '';
    DOM.btnClearSearch.style.display = 'none';
    renderCurrentView();
  });

  if (DOM.roomFilter) {
    DOM.roomFilter.addEventListener('change', (e) => {
      state.activeRoom = e.target.value;
      renderCurrentView();
    });
  }

  DOM.categoryPillsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;
    DOM.categoryPillsContainer.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.getAttribute('data-category');
    renderCurrentView();
  });

  DOM.viewBtnAgenda.addEventListener('click', () => {
    state.currentView = 'agenda';
    DOM.viewBtnAgenda.classList.add('active');
    DOM.viewBtnGrid.classList.remove('active');
    renderCurrentView();
  });

  DOM.viewBtnGrid.addEventListener('click', () => {
    state.currentView = 'grid';
    DOM.viewBtnGrid.classList.add('active');
    DOM.viewBtnAgenda.classList.remove('active');
    renderCurrentView();
  });

  DOM.btnResetFilters.addEventListener('click', () => {
    state.activeDay = 'ALL';
    state.activeRoom = 'ALL';
    state.activeCategory = 'ALL';
    state.searchQuery = '';
    DOM.searchInput.value = '';
    DOM.btnClearSearch.style.display = 'none';
    updateDayTabsUI();
    updateRoomFilterUI();
    renderCurrentView();
  });

  if (DOM.btnOpenEmbedModal) {
    DOM.btnOpenEmbedModal.addEventListener('click', () => {
      updateEmbedSnippetCode();
      DOM.embedModal.classList.remove('hidden');
    });
  }
  if (DOM.footerEmbedLink) {
    DOM.footerEmbedLink.addEventListener('click', (e) => {
      e.preventDefault();
      updateEmbedSnippetCode();
      DOM.embedModal.classList.remove('hidden');
    });
  }
  DOM.btnCloseEmbedModal.addEventListener('click', () => DOM.embedModal.classList.add('hidden'));
  DOM.btnDoneEmbed.addEventListener('click', () => DOM.embedModal.classList.add('hidden'));
  DOM.embedHeight.addEventListener('input', () => updateEmbedSnippetCode());
  DOM.embedThemeSelect.addEventListener('change', (e) => {
    const presetKey = e.target.value;
    if (PRESET_THEMES[presetKey]) {
      applyThemeSettings(PRESET_THEMES[presetKey]);
    }
  });

  DOM.btnCopyEmbed.addEventListener('click', () => {
    DOM.embedCodeTextarea.select();
    navigator.clipboard.writeText(DOM.embedCodeTextarea.value);
    DOM.btnCopyEmbed.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      DOM.btnCopyEmbed.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Code';
    }, 2000);
  });

  DOM.btnOpenThemeDrawer.addEventListener('click', () => DOM.themeDrawer.classList.remove('hidden'));
  DOM.btnCloseThemeDrawer.addEventListener('click', () => DOM.themeDrawer.classList.add('hidden'));
  
  DOM.themeDrawer.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      DOM.themeDrawer.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const presetKey = card.getAttribute('data-preset');
      if (PRESET_THEMES[presetKey]) {
        applyThemeSettings(PRESET_THEMES[presetKey]);
      }
    });
  });

  DOM.colorPrimary.addEventListener('input', (e) => {
    DOM.hexPrimary.textContent = e.target.value;
    applyThemeSettings({ primary: e.target.value });
  });

  DOM.colorSecondary.addEventListener('input', (e) => {
    DOM.hexSecondary.textContent = e.target.value;
    applyThemeSettings({ secondary: e.target.value });
  });

  DOM.colorBackground.addEventListener('input', (e) => {
    DOM.hexBackground.textContent = e.target.value;
    applyThemeSettings({ bg: e.target.value });
  });

  DOM.colorCard.addEventListener('input', (e) => {
    DOM.hexCard.textContent = e.target.value;
    applyThemeSettings({ card: e.target.value });
  });

  DOM.btnApplyTheme.addEventListener('click', () => {
    applyThemeSettings({
      title: DOM.customTitleInput.value,
      subtitle: DOM.customSubtitleInput.value
    });
    DOM.themeDrawer.classList.add('hidden');
  });

  DOM.btnResetTheme.addEventListener('click', () => {
    applyThemeSettings(PRESET_THEMES['atx-rox']);
  });

  DOM.btnCloseEventDetailModal.addEventListener('click', () => DOM.eventDetailModal.classList.add('hidden'));
  
  DOM.btnAddToCalGoogle.addEventListener('click', () => {
    if (state.selectedSessionForModal) {
      window.open(generateGoogleCalendarUrl(state.selectedSessionForModal), '_blank');
    }
  });

  DOM.btnAddToCalIcs.addEventListener('click', () => {
    if (state.selectedSessionForModal) {
      downloadIcsFile(state.selectedSessionForModal);
    }
  });
}

/* ==========================================================================
   FALLBACK DATA (WHEN OFFLINE OR CORS RESTRICTED)
   ========================================================================== */

function useFallbackScheduleData() {
  const fallbackCsv = `,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,ATX ROX - 2026 SCHEDULE ,,,,,,,,,,,,,,,,,,,,,,,,,,
,, FRIYAY,,,THE MAGIC,FORMAT,ARTISTS,ARTISTS,LOCAL,,,THE SCOOP,,,,SPONSORS!
,,🎓,3:00 PM,,Registration Desk Opens! ,Welcome!,RYAN & KELLY,,Foyer,🎓,,💥
,,🎓,4:00 PM,,Ballroom Opens for Social Dancing!,FUN,DJ LIZ,,Big Room,🎓,,REGISTRATION OPENS 3PM,,,,AWA
,,🎓,5:00 PM,,WCS: MAGIC MOMENTS (All Levels),WCS,THIBAULT & NICOLE,,Big Room,🎓,,FRIDAY CONTEST SIGN-UP DEADLINE
,,🎓,6:00 PM,,WCS: MAGIC MOVEMENT (All Levels),WCS,EMILY & SEBASTIAN,,Big Room,🎓,,FRIDAY 6:00PM
,,🎓,,,WCS: JACK & JILL PREP CLASS (Intermediate),WCS,GLENN BALL,,Side Room,🎓,,COMPS ARE IN THE BIG ROOM
,,🎓,,,WCS: MAGIC SWITCHES (All Levels),WCS,SAM B. & VICTORIA,,Small Room,🎓,,Now on 2 Floors!,,,,SWING CITY CHICAGO
,,🦄,7:00 PM,,Open Dancing!,FUN,DJ ANDRES,,Big Room,🦄,,💥
,,🏆,7:30 PM,,Allstar J&J (Prelims),ALLSK8,DJ RUBY ROX,MC Glenn,Big Room,🏆,,SIDE ROOM: PHOENIX NORTH
,,🏆,8:00 PM,,Novice J&J (Prelims - Floor 1),ALLSK8,DJ RUBY ROX,MC Glenn,Big Room,🏆,,SMALL ROOM: AUSTIN ROOM
,,🍄,12:00 PM,,Late Night Magic -- KICKOFF!,LATE NITE,DJ RUBY ROX,,Big Room,🍄,,LATE NIGHT PARTY,,,,FLOORPLAY SWING VACATION
,, SATURYAY,,,THE MAGIC,FORMAT,ARTISTS,ARTISTS,LOCAL,,,THE SCOOP
,,🦄,9:00 AM,,BLISS: CACAO & INTENTION SETTING,BLISS,TALETHA RIVAS,,Bliss Room,🦄,,MORNING INTENTION
,,🎓,10:00 AM,,WCS: MAGIC GROOVES (All Levels),WCS,CHRIS & ALEXIS,,Big Room,🎓,,WORKSHOP
,,🎓,11:00 AM,,WCS: MAGIC TIMELESS MOVES (All Levels),WCS,KP & BRYN,,Big Room,🎓,,ADVANCED MOVES,,,,WESTIE REMIX
,,🏆,1:15 PM,,ProAm Strictly - New/Nov, & Int,ALLSK8,DJ ANDRES,MC Tara,Big Room,🏆,,COMPETITIONS
,,🛟,6:00 PM,,POOL PARTY & Dinner Break!,POOL PARTY,DJ BREE,,Pool,🛟,,POOL PARTY
,,🦄,8:30 PM,,THE SHOW 1ST ACT: PRO AM ROUTINES,SHOW,DJ KOICHI,MC Sheven,Big Room,🦄,,PRO-AM SHOWCASE
,,🍄,11:30 PM,,LATE NIGHT MAGIC,LATE NITE,DJ LIZ,DJ ARIEL,Big Room,🍄,,MIDNIGHT DANCING
,, 🍄 ,1:00 AM,,SWITCH LATE NIGHT FINALS!,LATE NITE,DJ BREE,MC Tara,Side Room,🍄,,SWITCH FINALS @ 1AM
,, SUNYAY,,,THE MAGIC,FORMAT,ARTISTS,ARTISTS,LOCAL,,,THE SCOOP
,,🎓,9:30 AM,,WCS: MAGIC MOVES (All Levels),WCS,GLENN BALL,,Big Room,🎓,,SUNDAY MORNING
,,🎓,10:30 AM,,MAGIC FOOTWORK (All Levels),WCS,KEERIGAN & MIA,,Big Room,🎓,,FOOTWORK CLASS
,,🏆,2:00 PM,,ALL YOU-NICORN JJ,ALLSK8,DJ RUBY ROX,MC Glenn,Big Room,🏆,,SPECIAL CONTEST
,,🥇,5:45 AM,,AWARDS,AWARDS,DJ KOICHI,MC Sheven,Big Room,🥇,,CONTEST AWARDS
,,🍄,10:00 PM,,Meech'n'You-Nicorns,LATE NITE,DJ Meechy,,Big Room,🍄,,SUNDAY LATE NIGHT`;

  parseCSVAndBuildSchedule(fallbackCsv);
}

/* ==========================================================================
   HELPERS & UTILITIES
   ========================================================================== */

function showLoading(show) {
  if (show) {
    DOM.loadingState.classList.remove('hidden');
    DOM.agendaView.classList.add('hidden');
    DOM.gridView.classList.add('hidden');
  } else {
    DOM.loadingState.classList.add('hidden');
  }
}

function showError(msg) {
  DOM.errorMessage.textContent = msg;
  DOM.errorState.classList.remove('hidden');
  showLoading(false);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  if (c.length === 3) {
    const r = parseInt(c[0] + c[0], 16);
    const g = parseInt(c[1] + c[1], 16);
    const b = parseInt(c[2] + c[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ==========================================================================
   SCROLLSPY: AUTO-HIGHLIGHT ACTIVE DAY TAB ON SCROLL
   ========================================================================== */
window.addEventListener('scroll', () => {
  if (state.activeDay !== 'ALL' || state.currentView !== 'agenda') return;

  const banners = document.querySelectorAll('.day-header-banner');
  let currentScrollDay = null;

  banners.forEach(b => {
    const rect = b.getBoundingClientRect();
    if (rect.top <= 240) {
      currentScrollDay = b.getAttribute('data-day');
    }
  });

  if (currentScrollDay) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const dayAttr = btn.getAttribute('data-day');
      if (dayAttr === currentScrollDay) {
        btn.classList.add('active');
      } else if (dayAttr !== 'ALL') {
        btn.classList.remove('active');
      }
    });
  }
});

/* Dynamic calculation of navigation bar height for seamless sticky table header alignment */
function updateStickyHeaderOffset() {
  const navSec = document.querySelector('.navigation-section');
  if (navSec) {
    const navHeight = navSec.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--nav-height', `${Math.round(navHeight)}px`);
  }
}
window.addEventListener('resize', updateStickyHeaderOffset);
window.addEventListener('scroll', updateStickyHeaderOffset);
document.addEventListener('DOMContentLoaded', updateStickyHeaderOffset);
setTimeout(updateStickyHeaderOffset, 500);
