// QuitSmoke App Logic
let currentUser = null;
let profile = null;

// === AUTH ===
document.getElementById('tabLogin').onclick = () => switchTab('login');
document.getElementById('tabRegister').onclick = () => switchTab('register');

function switchTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('authError').textContent = '';
}

document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) showError(error.message);
  else loadApp();
};

document.getElementById('registerBtn').onclick = async () => {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPass').value;
  if (!username) return showError('Unesi korisničko ime');

  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) return showError(error.message);

  // Create profile
  await supabase.from('profiles').insert({
    id: data.user.id,
    username,
    last_cigarette: new Date().toISOString(),
    cigs_per_day: 15,
    cost_per_pack: 12
  });
  showError('Registracija uspješna! Provjeri email i prijavi se.');
};

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

function showError(msg) {
  document.getElementById('authError').textContent = msg;
}

// === APP ===
async function loadApp() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  currentUser = user;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  profile = data;

  document.getElementById('auth').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('welcome').textContent = `Zdravo, ${profile?.username || 'korisniče'}`;

  updateUI();
  loadFriends();
  setInterval(updateUI, 1000);
}

function updateUI() {
  if (!profile?.last_cigarette) return;
  const last = new Date(profile.last_cigarette).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - last) / 1000));

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  document.getElementById('timeCounter').textContent = `${days}d ${hours}h ${mins}m`;

  // Level every 12 hours
  const level = Math.floor(seconds / (12 * 3600)) + 1;
  document.getElementById('levelBadge').textContent = `Level ${level}`;

  const nextLevelIn = 12 * 3600 - (seconds % (12 * 3600));
  const h = Math.floor(nextLevelIn / 3600);
  const m = Math.floor((nextLevelIn % 3600) / 60);
  document.getElementById('levelProgress').textContent = `Do levela ${level + 1}: ${h}h ${m}m`;

  // Lungs visual
  const health = Math.min(1, seconds / (30 * 86400)); // 30 days = fully healthy
  document.querySelectorAll('.lung').forEach(l => {
    l.style.opacity = 0.3 + health * 0.7;
    l.style.background = health > 0.5 ? '#14b8a6' : '#ef4444';
  });
  document.getElementById('lungsStatus').textContent =
    health < 0.3 ? 'Pluća se oporavljaju...' :
    health < 0.7 ? 'Pluća izgledaju bolje!' : 'Pluća su zdrava!';

  // Stats
  const cigs = Math.floor((seconds / 86400) * (profile.cigs_per_day || 15));
  document.getElementById('cigsAvoided').textContent = cigs;
  const money = (cigs / 20) * (profile.cost_per_pack || 12);
  document.getElementById('moneySaved').textContent = `$${money.toFixed(2)}`;
}

document.getElementById('logCigBtn').onclick = async () => {
  if (!confirm('Jesi li sigurna da si zapalila cigaretu? Brojač će se resetovati.')) return;
  const now = new Date().toISOString();
  await supabase.from('profiles').update({ last_cigarette: now }).eq('id', currentUser.id);
  profile.last_cigarette = now;
  updateUI();
};

// === FRIENDS ===
async function loadFriends() {
  const { data } = await supabase
    .from('friendships')
    .select('friend_id, profiles!friendships_friend_id_fkey(username, last_cigarette)')
    .eq('user_id', currentUser.id);

  const list = document.getElementById('friendsList');
  list.innerHTML = '';
  if (!data || data.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:10px">Nema prijatelja</p>';
    return;
  }

  data.forEach(f => {
    const p = f.profiles;
    const seconds = p.last_cigarette ? Math.floor((Date.now() - new Date(p.last_cigarette)) / 1000) : 0;
    const level = Math.floor(seconds / (12 * 3600)) + 1;
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `<strong>${p.username}</strong><span>Level ${level}</span>`;
    list.appendChild(div);
  });
}

document.getElementById('addFriendBtn').onclick = async () => {
  const username = document.getElementById('friendUsername').value.trim();
  if (!username) return;

  const { data: friend } = await supabase.from('profiles').select('id').eq('username', username).single();
  if (!friend) return alert('Korisnik nije pronađen');

  await supabase.from('friendships').insert({
    user_id: currentUser.id,
    friend_id: friend.id
  });
  document.getElementById('friendUsername').value = '';
  loadFriends();
};

// Check session on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) loadApp();
});