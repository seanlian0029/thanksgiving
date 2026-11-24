'use strict';

const get = id => document.getElementById(id);
const root = document.documentElement;
const student = get('student');

let welcomeTimer;

function clearWelcome() {
  clearTimeout(welcomeTimer);
  get('welcome').textContent = '';
}

const timeZone = 'Asia/Manila';
const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'long' });
const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone, timeStyle: 'medium' });
function updateClock() {
  const now = new Date();
  get('date').textContent = dateFormat.format(now);
  get('time').textContent = timeFormat.format(now);
}
updateClock();
setInterval(updateClock, 1000);

function setDark(enabled) {
  root.dataset.theme = enabled ? 'dark' : 'light';
  get('theme').setAttribute('aria-pressed', String(enabled));
}
get('theme').addEventListener('click', () => setDark(root.dataset.theme !== 'dark'));
const digitsOnly = value => value.replace(/\D/g, '');
student.addEventListener('input', () => {
  const digitsBeforeCaret = digitsOnly(student.value.slice(0, student.selectionStart)).length;
  const digits = digitsOnly(student.value).slice(0, 11);
  student.value = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6)].filter(Boolean).join('-');
  let position = 0;
  let seen = 0;
  while (position < student.value.length && seen < digitsBeforeCaret) {
    if (student.value[position] !== '-') seen++;
    position++;
  }
  student.setSelectionRange(position, position);
});


const config = window.ASSEMBLY_CONFIG;
const sheet = "'" + config.attendanceSheet.replace(/'/g, "''") + "'!";
const connect = get('connect');
const record = get('record');
const notice = get('notice');
let accessToken = '';
let expiresAt = 0;
let ready = false;
let busy = false;

const stampFormat = new Intl.DateTimeFormat('en-US', {
  timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
});

function attendanceStamp(now) {
  const parts = Object.fromEntries(stampFormat.formatToParts(now).map(part => [part.type, Number(part.value)]));
  const { year, month, day, hour, minute, second } = parts;
  const date = (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86400000;
  const time = (hour * 3600 + minute * 60 + second) / 86400;
  return [date, time];
}

function updateControls() {
  connect.disabled = busy;
  connect.textContent = ready ? 'Disconnect' : 'Connect Google';
  get('status').textContent = ready ? 'Connected' : 'Not connected';
  get('theme').hidden = !ready;
  student.disabled = !ready;
  record.disabled = !ready || busy;
}

function disconnect(message = '') {
  accessToken = '';
  expiresAt = 0;
  ready = false;
  get('count').textContent = '—';
  student.value = '';
  clearWelcome();
  setDark(false);
  notice.textContent = message;
  updateControls();
}

async function sheetsRequest(path, query = {}, body) {
  if (!accessToken || Date.now() >= expiresAt) {
    disconnect('Google session expired. Connect again to continue.');
    throw new Error(notice.textContent);
  }
  const url = new URL('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(config.spreadsheetId) + path);
  url.searchParams.set('key', config.apiKey);
  for (const [key, value] of Object.entries(query)) {
    for (const item of [value].flat()) url.searchParams.append(key, item);
  }
  const headers = { Authorization: 'Bearer ' + accessToken };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers, body: body && JSON.stringify(body) });
  if (response.status === 401) {
    disconnect('Google session expired. Connect again to continue.');
    throw new Error(notice.textContent);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google Sheets request failed.');
  return data;
}

async function readRoster() {
  const data = await sheetsRequest('/values:batchGet', {
    ranges: [sheet + 'C2:D', sheet + 'L2:L']
  });
  const [roster, statuses] = data.valueRanges.map(range => range.values || []);
  const rows = roster.flatMap(([number, name], index) => {
    const displayedId = String(number ?? '').trim();
    if (!/^(\d{4}-\d{2}-\d{5}|\d{11})$/.test(displayedId)) return [];
    return [{
      row: index + 2,
      id: digitsOnly(displayedId),
      name: String(name ?? '').trim(),
      present: String(statuses[index]?.[0] ?? '').trim().toLowerCase() === 'present'
    }];
  });
  get('count').textContent = new Set(rows.filter(row => row.present).map(row => row.id)).size;
  return rows;
}

function showWelcome(message) {
  clearWelcome();
  get('welcome').textContent = message;
  welcomeTimer = setTimeout(clearWelcome, 10000);
}

connect.addEventListener('click', () => {
  if (busy) return;
  if (ready) {
    disconnect();
    return;
  }
  if (!config.spreadsheetId || config.spreadsheetId === 'PASTE_SPREADSHEET_ID_HERE' || !/^[\w-]+$/.test(config.spreadsheetId)) {
    notice.textContent = 'Setup required. Add the spreadsheet ID in config.js before connecting Google.';
    return;
  }
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) {
    notice.textContent = 'Google sign-in is loading. Check your connection and try again.';
    return;
  }
  busy = true;
  updateControls();
  notice.textContent = 'Waiting for Google sign-in…';

  function signInFailed(message) {
    busy = false;
    disconnect(message);
  }

  try {
    oauth.initTokenClient({
      client_id: config.clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      error_callback: () => signInFailed('Google sign-in was closed or blocked. Try again.'),
      callback: async response => {
        if (!response.access_token) {
          signInFailed(response.error_description || 'Google sign-in did not grant Sheets access.');
          return;
        }
        accessToken = response.access_token;
        expiresAt = Date.now() + Number(response.expires_in) * 1000;
        notice.textContent = 'Loading the attendance roster…';
        try {
          await readRoster();
          ready = true;
          notice.textContent = '';
        } catch (error) {
          disconnect(error.message);
        } finally {
          busy = false;
          updateControls();
          if (ready) student.focus();
        }
      }
    }).requestAccessToken({ prompt: 'select_account' });
  } catch (error) {
    signInFailed(error.message);
  }
});

get('checkin').addEventListener('submit', async event => {
  event.preventDefault();
  if (!ready || busy || !student.checkValidity()) return;
  const id = digitsOnly(student.value);
  student.value = '';
  student.focus();
  busy = true;
  updateControls();
  notice.textContent = 'Checking the attendance roster…';
  let saving = false;
  try {
    const rows = await readRoster();
    const matches = rows.filter(row => row.id === id);
    if (matches.length === 0) {
      notice.textContent = 'Student number was not found in ATTENDANCE.';
      return;
    }
    if (matches.length > 1) {
      notice.textContent = 'This student number appears more than once. Ask the organizer to check the roster.';
      return;
    }
    const match = matches[0];
    if (!match.name) {
      notice.textContent = 'The matching row needs a student name in column D.';
      return;
    }
    if (match.present) {
      notice.textContent = '';
      showWelcome(match.name + ' is already checked in.');
      return;
    }
    saving = true;
    await sheetsRequest('/values:batchUpdate', {}, {
      valueInputOption: 'RAW',
      data: [
        { range: sheet + 'A' + match.row + ':B' + match.row, values: [attendanceStamp(new Date())] },
        { range: sheet + 'L' + match.row, values: [['Present']] }
      ]
    });
    get('count').textContent = Number(get('count').textContent) + 1;
    notice.textContent = '';
    showWelcome('Welcome, ' + match.name + '! Attendance recorded.');
  } catch (error) {
    notice.textContent = saving && ready ? 'Save could not be confirmed. Check ATTENDANCE before retrying. ' + error.message : error.message;
  } finally {
    busy = false;
    updateControls();
  }
});

document.querySelectorAll('.logos img').forEach(img => {
  function showLogo() {
    if (!img.naturalWidth) return;
    img.nextElementSibling.hidden = true;
    img.hidden = false;
  }
  img.addEventListener('load', showLogo);
  img.addEventListener('error', () => {
    img.hidden = true;
    img.nextElementSibling.hidden = false;
  });
  if (img.complete) showLogo();
});

updateControls();
