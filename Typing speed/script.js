const quoteDisplayElement = document.getElementById('quoteDisplay');
const quoteInputElement = document.getElementById('quoteInput');
const timerElement = document.getElementById('timer');
const wpmElement = document.getElementById('wpm');
const oppWpmElement = document.getElementById('opp-wpm');
const resultsScreen = document.getElementById('results-screen');
const peerIdDisplay = document.getElementById('peer-id-display');
const goalCountDisplay = document.getElementById('goal-count');
const streakCountDisplay = document.getElementById('streak-count');

const API_URL = 'https://baconipsum.com/api/?type=meat-and-filler&sentences=15&format=json';
const DAILY_GOAL = 10;

let selectedTime = 60;
let timeLeft = selectedTime;
let timer = null;
let isTyping = false;
let wpmTimeline = []; 
let timelineChart = null;
let comparisonChart = null;

// --- MULTIPLAYER ---
const peer = new Peer();
let conn = null;
peer.on('open', id => peerIdDisplay.innerText = `ID: ${id}`);
peer.on('connection', c => { conn = c; setupConn(); });
function setupConn() {
    conn.on('data', data => {
        if (data.type === 'quote') syncQuote(data.quote);
        if (data.type === 'stats') oppWpmElement.innerText = data.wpm;
    });
}
function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?join=${peer.id}`;
    navigator.clipboard.writeText(link); alert("Link Copied!");
}

// --- UNIQUE WORD GENERATION ---
function getUniqueWords(text) {
    // Remove punctuation and split into words
    const words = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/);
    // Use Set to get unique values, then shuffle
    const uniqueSet = [...new Set(words)];
    return uniqueSet.sort(() => Math.random() - 0.5).join(' ');
}

// --- STREAK & GOAL ---
function updateDailyProgress(isFinishedTest = false) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let stats = JSON.parse(localStorage.getItem('typingStats')) || { lastDate: today, dailyCount: 0, streak: 0, streakQualified: false };

    if (stats.lastDate !== today) {
        if (stats.lastDate !== yesterday) stats.streak = 0;
        stats.dailyCount = 0;
        stats.streakQualified = false;
        stats.lastDate = today;
    }
    if (isFinishedTest) {
        stats.dailyCount++;
        if (stats.dailyCount === DAILY_GOAL && !stats.streakQualified) {
            stats.streak++;
            stats.streakQualified = true;
        }
    }
    localStorage.setItem('typingStats', JSON.stringify(stats));
    goalCountDisplay.innerText = stats.dailyCount;
    streakCountDisplay.innerText = stats.streak;
    if (stats.dailyCount >= DAILY_GOAL) goalCountDisplay.classList.add('goal-reached');
}

// --- CORE GAMEPLAY ---
async function renderNewQuote() {
    resultsScreen.classList.add('hidden');
    quoteDisplayElement.innerText = "Processing unique words...";
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const uniqueText = getUniqueWords(data.join(' '));
        if (conn) conn.send({ type: 'quote', quote: uniqueText });
        syncQuote(uniqueText);
    } catch { quoteDisplayElement.innerText = "Error. Press ESC."; }
}

function syncQuote(quote) {
    quoteDisplayElement.innerHTML = '';
    quote.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.innerText = char;
        if (i === 0) span.classList.add('active-char');
        quoteDisplayElement.appendChild(span);
    });
    resetState();
}

function resetState() {
    clearInterval(timer);
    isTyping = false;
    timeLeft = selectedTime;
    wpmTimeline = [];
    timerElement.innerText = timeLeft;
    wpmElement.innerText = 0;
    quoteInputElement.value = '';
    quoteInputElement.disabled = false;
    quoteInputElement.focus();
}

quoteInputElement.addEventListener('input', () => {
    if (!isTyping) { startTimer(); isTyping = true; }
    const spans = quoteDisplayElement.querySelectorAll('span');
    const inputChars = quoteInputElement.value.split('');
    let correct = 0;
    spans.forEach((span, i) => {
        const char = inputChars[i];
        span.classList.remove('active-char', 'correct', 'incorrect');
        if (char == null) { if (i === inputChars.length) span.classList.add('active-char'); }
        else if (char === span.innerText) { span.classList.add('correct'); correct++; }
        else span.classList.add('incorrect');
    });
    const elapsed = selectedTime - timeLeft;
    const currentWpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0;
    wpmElement.innerText = currentWpm;
    if (conn) conn.send({ type: 'stats', wpm: currentWpm });
    if (inputChars.length >= spans.length) renderNewQuote();
});

function startTimer() {
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            timerElement.innerText = timeLeft;
            const correct = quoteDisplayElement.querySelectorAll('.correct').length;
            const elapsed = selectedTime - timeLeft;
            wpmTimeline.push(Math.round((correct / 5) / (elapsed / 60)));
        } else { finishTest(); }
    }, 1000);
}

// --- ANALYTICS ---
function finishTest() {
    clearInterval(timer);
    quoteInputElement.disabled = true;
    updateDailyProgress(true);
    
    const finalWpm = parseInt(wpmElement.innerText);
    const storageKey = `history_${selectedTime}`;
    const history = JSON.parse(localStorage.getItem(storageKey)) || [];
    history.push({ wpm: finalWpm, date: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
    localStorage.setItem(storageKey, JSON.stringify(history));

    document.getElementById('results-title').innerText = `${selectedTime}s Mode Analysis`;
    document.getElementById('lb-title').innerText = `🏆 Best ${selectedTime}s Scores`;
    renderCharts(finalWpm, history);
    updateLeaderboard(history);
    resultsScreen.classList.remove('hidden');
}

function renderCharts(currentWpm, history) {
    const tCtx = document.getElementById('timelineChart').getContext('2d');
    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(tCtx, {
        type: 'line',
        data: {
            labels: wpmTimeline.map((_, i) => i + 1 + "s"),
            datasets: [{ label: 'WPM', data: wpmTimeline, borderColor: '#e2b714', backgroundColor: 'rgba(226, 183, 20, 0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const cCtx = document.getElementById('comparisonChart').getContext('2d');
    const lastScores = history.slice(-5);
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(cCtx, {
        type: 'bar',
        data: {
            labels: lastScores.map(h => h.date),
            datasets: [{ label: 'WPM History', data: lastScores.map(h => h.wpm), backgroundColor: '#4caf50' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateLeaderboard(history) {
    const sorted = [...history].sort((a,b) => b.wpm - a.wpm).slice(0, 9);
    document.getElementById('leaderboard-list').innerHTML = sorted.map(s => `<li>${s.date} <span>${s.wpm} WPM</span></li>`).join('');
}

function closeResults() { renderNewQuote(); }

document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTime = parseInt(btn.getAttribute('data-time'));
        renderNewQuote();
    });
});

window.addEventListener('keydown', e => { if (e.key === "Escape") renderNewQuote(); });
updateDailyProgress();
renderNewQuote();