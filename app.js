// QuitSmoke PWA
const STORAGE_KEY = "quitsmoke_data";

const healthMilestones = [
  { time: 20 * 60, icon: "💨", title: "20 minutes", desc: "Blood pressure and heart rate normalize" },
  { time: 8 * 3600, icon: "🩸", title: "8 hours", desc: "Oxygen levels rise and carbon monoxide drops" },
  { time: 24 * 3600, icon: "❤️", title: "24 hours", desc: "Risk of heart attack begins to decrease" },
  { time: 48 * 3600, icon: "👃", title: "48 hours", desc: "Sense of smell and taste improve" },
  { time: 72 * 3600, icon: "🫁", title: "72 hours", desc: "Breathing becomes easier; bronchial tubes relax" },
  { time: 2 * 7 * 86400, icon: "🚶", title: "2 weeks", desc: "Circulation improves; walking becomes easier" },
  { time: 1 * 30 * 86400, icon: "💪", title: "1 month", desc: "Lung function improves up to 30%" },
  { time: 1 * 365 * 86400, icon: "🎉", title: "1 year", desc: "Risk of heart disease cut in half" },
];

const tips = [
  "Take 10 slow, deep breaths. In through the nose, out through the mouth.",
  "Drink a glass of cold water slowly.",
  "Go for a short walk — even 5 minutes helps.",
  "Chew sugar-free gum or a carrot stick.",
  "Call or text a friend who supports you.",
  "Remind yourself why you quit. You've already come this far.",
  "The craving will pass in a few minutes. You've got this.",
  "Do 10 push-ups or squats to reset your body.",
  "Play a game or watch a short video to distract yourself.",
  "Write down one thing you're proud of about quitting."
];

const quotes = [
  "Every cigarette you don't smoke is a victory.",
  "You're not quitting forever. Just this one.",
  "Your future self is thanking you right now.",
  "The hardest part is behind you.",
  "Cravings are temporary. Your health is permanent.",
  "You are stronger than the urge.",
  "One day at a time. One breath at a time."
];

let data = loadData();

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return null;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showSetup() {
  document.getElementById("setup").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
  if (data) {
    const d = new Date(data.quitTimestamp);
    document.getElementById("quitDate").value = d.toISOString().slice(0, 16);
    document.getElementById("cigsPerDay").value = data.cigsPerDay;
    document.getElementById("costPerPack").value = data.costPerPack;
    document.getElementById("cigsPerPack").value = data.cigsPerPack;
  }
}

function showDashboard() {
  document.getElementById("setup").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  updateUI();
  setInterval(updateUI, 1000);
}

function startJourney() {
  const quitDate = document.getElementById("quitDate").value;
  if (!quitDate) {
    alert("Please choose a quit date and time.");
    return;
  }
  data = {
    quitTimestamp: new Date(quitDate).getTime(),
    cigsPerDay: Number(document.getElementById("cigsPerDay").value) || 15,
    costPerPack: Number(document.getElementById("costPerPack").value) || 12,
    cigsPerPack: Number(document.getElementById("cigsPerPack").value) || 20,
  };
  saveData();
  showDashboard();
}

function updateUI() {
  if (!data) return;
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - data.quitTimestamp) / 1000));

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  document.getElementById("timeCounter").textContent = `${days}d ${hours}h ${mins}m`;

  const quitDate = new Date(data.quitTimestamp);
  document.getElementById("since").textContent = `Since ${quitDate.toLocaleDateString()} ${quitDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

  const cigsAvoided = Math.floor((seconds / 86400) * data.cigsPerDay);
  document.getElementById("cigsAvoided").textContent = cigsAvoided.toLocaleString();

  const packsAvoided = cigsAvoided / data.cigsPerPack;
  const money = packsAvoided * data.costPerPack;
  document.getElementById("moneySaved").textContent = `$${money.toFixed(2)}`;

  renderMilestones(seconds);
  document.getElementById("quote").textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function renderMilestones(seconds) {
  const container = document.getElementById("healthMilestones");
  container.innerHTML = "";
  healthMilestones.forEach(m => {
    const done = seconds >= m.time;
    const div = document.createElement("div");
    div.className = `milestone ${done ? "done" : ""}`;
    div.innerHTML = `
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-text">
        <strong>${m.title}</strong><br>
        <span style="color:#94a3b8;font-size:0.9rem">${m.desc}</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function showCravingHelp() {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  document.getElementById("tipText").textContent = tip;
  document.getElementById("cravingHelp").classList.remove("hidden");
}

document.getElementById("startBtn").addEventListener("click", startJourney);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset all progress? This cannot be undone.")) {
    localStorage.removeItem(STORAGE_KEY);
    data = null;
    showSetup();
  }
});
document.getElementById("cravingBtn").addEventListener("click", showCravingHelp);
document.getElementById("closeTip").addEventListener("click", () => {
  document.getElementById("cravingHelp").classList.add("hidden");
});

// Init
if (data && data.quitTimestamp) {
  showDashboard();
} else {
  showSetup();
  // Default quit date = now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById("quitDate").value = now.toISOString().slice(0, 16);
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}