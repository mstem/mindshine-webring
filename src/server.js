import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — widget and API are called cross-origin by member sites
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static(join(ROOT, 'public')));

// --- Data helpers ---

function loadMembers() {
  return JSON.parse(readFileSync(join(ROOT, 'members.json'), 'utf8'));
}

function loadRing() {
  return JSON.parse(readFileSync(join(ROOT, 'ring.json'), 'utf8'));
}

function loadSubmissions() {
  const path = join(ROOT, 'submissions.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveSubmissions(submissions) {
  writeFileSync(join(ROOT, 'submissions.json'), JSON.stringify(submissions, null, 2));
}

function normalizeUrl(url) {
  try {
    return new URL(url).origin.toLowerCase();
  } catch {
    return url.replace(/\/$/, '').toLowerCase();
  }
}

function findMemberIndex(members, from) {
  const needle = normalizeUrl(from);
  return members.findIndex(m => normalizeUrl(m.url) === needle);
}

// --- Navigation routes ---

app.get('/next', (req, res) => {
  const members = loadMembers();
  if (members.length === 0) return res.redirect('/');
  const idx = findMemberIndex(members, req.query.from || '');
  const next = (idx === -1 ? 0 : (idx + 1) % members.length);
  res.redirect(members[next].url);
});

app.get('/prev', (req, res) => {
  const members = loadMembers();
  if (members.length === 0) return res.redirect('/');
  const idx = findMemberIndex(members, req.query.from || '');
  const prev = (idx === -1 ? 0 : (idx - 1 + members.length) % members.length);
  res.redirect(members[prev].url);
});

app.get('/random', (req, res) => {
  const members = loadMembers();
  if (members.length === 0) return res.redirect('/');
  const idx = findMemberIndex(members, req.query.from || '');
  const pool = members.length > 1 ? members.filter((_, i) => i !== idx) : members;
  res.redirect(pool[Math.floor(Math.random() * pool.length)].url);
});

// --- API ---

app.get('/api/ring', (req, res) => res.json(loadRing()));
app.get('/api/members', (req, res) => res.json(loadMembers()));

// --- Join / submission ---

app.post('/api/submit', (req, res) => {
  const ring = loadRing();
  if (!ring.join?.enabled) {
    return res.status(403).json({ error: 'Submissions are not enabled for this ring.' });
  }

  const { name, url, description, contact } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return res.status(400).json({ error: 'Invalid URL.' });
  }

  const submissions = loadSubmissions();
  const members = loadMembers();
  const allUrls = [...members, ...submissions].map(s => normalizeUrl(s.url));

  if (allUrls.includes(normalizeUrl(parsedUrl.href))) {
    return res.status(409).json({ error: 'This site is already in the ring or pending review.' });
  }

  submissions.push({
    name: name.trim().slice(0, 100),
    url: parsedUrl.origin,
    description: (description || '').trim().slice(0, 300),
    contact: (contact || '').trim().slice(0, 200),
    submittedAt: new Date().toISOString(),
  });

  saveSubmissions(submissions);
  res.json({ ok: true, message: 'Submission received! It will be reviewed before being added.' });
});

// --- Serve index for all other routes (SPA-style) ---
app.get('*', (req, res) => {
  res.sendFile(join(ROOT, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web ring running on http://localhost:${PORT}`));
