// QuitSmoke - Party Mode
let me = null;
document.getElementById('tabJoin').onclick = () => switchTab('join');
document.getElementById('tabCreate').onclick = () => switchTab('create');

function switchTab(tab) {
  document.getElementById('tabJoin').classList.toggle('active', tab === 'join');
  document.getElementById('tabCreate').classList.toggle('active', tab === 'create');
  document.getElementById('joinForm').classList.toggle('hidden', tab !== 'join');
  document.getElementById('createForm').classList.toggle('hidden', tab !== 'create');
  document.getElementById('authError').textContent = '';
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.color = msg.includes('uspje') || msg.includes('Kod') ? '#14b8a6' : '#ef4444';
}

function randomCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

document.getElementById('createBtn').onclick = async () => {
  const name = document.getElementById('createName').value.trim();
  if (!name) return showError('Unesi ime');

  showError('Pravim party...');
  const code = randomCode();

  try {
    const { data, error } = await supabase.from('parties').insert({
      code,
      created_by: name
    }).select().single();

    if (error) return showError('Greška party: ' + error.message);

    const { data: member, error: mErr } = await supabase.from('members').insert({
      party_id: data.id,
      name,
      last_cigarette: new Date().toISOString()
    }).select().single();

    if (mErr) return showError('Greška member: ' + mErr.message);

    me = member;
    localStorage.setItem('qs_member', JSON.stringify(member));
    localStorage.setItem('qs_party', code);
    enterApp(code);
  } catch (e) {
    showError('Greška: ' + e.message);
  }
};

document.getElementById('joinBtn').onclick = async () => {
  const code = document.getElementById('joinCode').value.trim();
  const name = document.getElementById('joinName').value.trim();
  if (!code || !name) return showError('Unesi kod i ime');

  showError('Pridružujem se...');

  const { data: party } = await supabase.from('parties').select('id').eq('code', code).single();
  if (!party) return showError('Party nije pronađen');

  const { data: member, error } = await supabase.from('members').insert({
    party_id: party.id,
    name,
    last_cigarette: new Date().toISOString()
  }).select().single();

  if (error) return showError(error.message);

  me = member;
  localStorage.setItem('qs_member', JSON.stringify(member));
  localStorage.setItem('qs_party', code);
  enterApp(code);
};

document.getElementById('logoutBtn').onclick = () => {
  localStorage.removeItem('qs_member');
  localStorage.removeItem('qs_party');
  location.reload();
};

function enterApp(code) {
  document.getElementById('join').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('welcome').textContent = `Zdravo, ${me.name}`;
  document.getElementById('partyCode').textContent = `Kod: ${code}`;
  updateUI();
  loadMembers();
  setInterval(updateUI, 1000);
  setInterval(loadMembers, 10000);
}

function updateUI() {
  if (!me?.last_cigarette) return;
  const last = new Date(me.last_cigarette).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - last) / 1000));

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  document.getElementById('timeCounter').textContent = `${days}d ${hours}h ${mins}m`;

  const level = Math.floor(seconds / (12 * 3600)) + 1;
  document.getElementById('levelBadge').textContent = `Level ${level}`;

  const health = Math.min(1, seconds / (30 * 86400));
  document.querySelectorAll('.lung').forEach(l => {
    l.style.opacity = 0.3 + health * 0.7;
    l.style.background = health > 0.5 ? '#14b8a6' : '#ef4444';
  });
  document.getElementById('lungsStatus').textContent =
    health < 0.3 ? 'Pluća se oporavljaju...' :
    health < 0.7 ? 'Pluća izgledaju bolje!' : 'Pluća su zdrava!';

  const cigs = Math.floor((seconds / 86400) * 15);
  document.getElementById('cigsAvoided').textContent = cigs;
  document.getElementById('moneySaved').textContent = `$${(cigs / 20 * 12).toFixed(2)}`;
}

document.getElementById('logCigBtn').onclick = async () => {
  if (!confirm('Jesi li sigurna? Brojač će se resetovati.')) return;
  const now = new Date().toISOString();
  await supabase.from('members').update({ last_cigarette: now }).eq('id', me.id);
  me.last_cigarette = now;
  localStorage.setItem('qs_member', JSON.stringify(me));
  updateUI();
};

async function loadMembers() {
  if (!me) return;
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('party_id', me.party_id)
    .order('last_cigarette', { ascending: false });

  const list = document.getElementById('membersList');
  list.innerHTML = '';
  (data || []).forEach(m => {
    const seconds = m.last_cigarette ? Math.floor((Date.now() - new Date(m.last_cigarette)) / 1000) : 0;
    const level = Math.floor(seconds / (12 * 3600)) + 1;
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `<strong>${m.name}${m.id === me.id ? ' (ti)' : ''}</strong><span>Level ${level}</span>`;
    list.appendChild(div);
  });
}

// Restore session
const saved = localStorage.getItem('qs_member');
const savedCode = localStorage.getItem('qs_party');
if (saved && savedCode) {
  me = JSON.parse(saved);
  enterApp(savedCode);
}