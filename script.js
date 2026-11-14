/* ===== Config =====
   API_BASE: leave '' when the Node backend serves this site itself.
   If the frontend is on GitHub Pages and the backend is hosted elsewhere
   (e.g. Render), put the backend URL here, like 'https://hustle-connect.onrender.com'.
   If no backend can be reached, the site falls back to demo mode (data saved in this browser only). */
const API_BASE = '';

const SERVICES = [
  { title: 'Graphics Design', category: 'Graphics Design', img: 'graphics-design.jpg', desc: 'Logos, brand kits and polished graphics that give your ideas a clear identity.', kw: 'logo branding flyer illustration social media print graphic design' },
  { title: 'Web Development', category: 'Web Development', img: 'web-development.jpg', desc: 'Thoughtful websites and digital experiences, built around what you need to do.', kw: 'website frontend ecommerce landing page code web development' },
  { title: 'Video Editing', category: 'Video Editing', img: 'video-editing.jpg', desc: 'Bring your footage together with clean edits, motion and a story that flows.', kw: 'film reels motion content production youtube' },
  { title: 'Typing and CV Writing', category: 'Typing and CV Writing', img: 'typing-cv.jpg', desc: 'Clear, well-presented documents and CVs that put your experience into words.', kw: 'resume cv writing typing proofreading documents' },
  { title: 'Digital Marketing', category: 'Digital Marketing', img: 'digital-marketing.jpg', desc: 'Reach the right people with considered campaigns and engaging social content.', kw: 'social media strategy ads growth campaigns seo' },
  { title: 'Photography', category: 'Photography', img: 'photography.jpg', desc: 'Make your moments, products and projects stand out with compelling images.', kw: 'portrait product event photo camera shoot' },
];
const CATEGORIES = SERVICES.map(s => s.category);
const SAMPLE_PROVIDERS = [
  { id: 's1', title: 'Logo & brand kit', category: 'Graphics Design', description: 'Memorable logos and complete brand kits for small businesses.', price: 'From ₦15,000', owner: 'Sample listing', contact: '', sample: true },
  { id: 's2', title: 'Business websites', category: 'Web Development', description: 'Fast, mobile-friendly websites for shops, schools and startups.', price: 'From ₦80,000', owner: 'Sample listing', contact: '', sample: true },
  { id: 's3', title: 'Professional CV rewrite', category: 'Typing and CV Writing', description: 'Get a CV that stands out, with a matching cover letter.', price: 'From ₦5,000', owner: 'Sample listing', contact: '', sample: true },
];

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} },
};
let user = store.get('hc_user', null);
let token = store.get('hc_token', null);

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3000); }
function say(el, msg, ok) { el.textContent = msg; el.className = 'form-msg ' + (ok ? 'ok' : 'err'); }

/* ===== API with demo-mode fallback ===== */
async function api(path, method = 'GET', body) {
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!(res.headers.get('content-type') || '').includes('json')) return demo(path, method, body); // no backend here (e.g. GitHub Pages)
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { server: true });
    return data;
  } catch (e) {
    if (e.server) throw e;
    return demo(path, method, body); // backend unreachable
  }
}
function demo(path, method, body) {
  const users = store.get('hc_demo_users', []), listings = store.get('hc_demo_listings', []);
  if (path === '/api/signup' && method === 'POST') {
    if (users.some(u => u.email === body.email.toLowerCase())) throw new Error('That email is already registered');
    users.push({ name: body.name, email: body.email.toLowerCase(), password: body.password }); store.set('hc_demo_users', users);
    return { token: 'demo', user: { name: body.name, email: body.email.toLowerCase() } };
  }
  if (path === '/api/login' && method === 'POST') {
    const u = users.find(x => x.email === body.email.toLowerCase() && x.password === body.password);
    if (!u) throw new Error('Wrong email or password');
    return { token: 'demo', user: { name: u.name, email: u.email } };
  }
  if (path.startsWith('/api/providers') && method === 'GET') return { providers: [...listings, ...SAMPLE_PROVIDERS] };
  if (path === '/api/providers' && method === 'POST') {
    if (!user) throw new Error('Please log in first');
    listings.unshift({ id: 'd' + Date.now(), ...body, owner: user.name }); store.set('hc_demo_listings', listings); return { ok: true };
  }
  if (path === '/api/contact') return { ok: true };
  throw new Error('Not available');
}

/* ===== Navbar ===== */
$('#menu-toggle').addEventListener('click', () => {
  const open = $('#nav').classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded', open);
});
$('#nav').addEventListener('click', () => $('#nav').classList.remove('open'));

/* ===== Auth ===== */
let mode = 'login';
function renderUser() {
  $('#auth-btn').textContent = user ? 'Logout' : 'Login';
  const chip = $('#user-chip'); chip.hidden = !user; chip.textContent = user ? 'Hi, ' + user.name.split(' ')[0] : '';
}
function setMode(m) {
  mode = m; const signup = m === 'signup';
  $('#auth-title').textContent = signup ? 'Create account' : 'Login';
  $('#auth-submit').textContent = signup ? 'Sign up' : 'Login';
  $('#auth-name').hidden = !signup; $('#auth-name').required = signup;
  $('#auth-switch-text').textContent = signup ? 'Already have an account?' : 'No account yet?';
  $('#auth-switch').textContent = signup ? 'Login' : 'Sign up';
  $('#auth-msg').textContent = '';
}
function openAuth(m) { setMode(m || 'login'); $('#auth-modal').hidden = false; $('#auth-form input:not([hidden])').focus(); }
function closeAuth() { $('#auth-modal').hidden = true; }
$('#auth-btn').addEventListener('click', () => {
  if (user) { user = null; token = null; store.del('hc_user'); store.del('hc_token'); renderUser(); toast('Logged out'); } else openAuth('login');
});
$('#auth-close').addEventListener('click', closeAuth);
$('#auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth(); });
$('#auth-switch').addEventListener('click', e => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); });
$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  try {
    const r = await api(mode === 'signup' ? '/api/signup' : '/api/login', 'POST', f);
    user = r.user; token = r.token; store.set('hc_user', user); store.set('hc_token', token);
    renderUser(); closeAuth(); e.target.reset(); toast('Welcome, ' + user.name.split(' ')[0] + '!');
  } catch (err) { say($('#auth-msg'), err.message, false); }
});

/* ===== Scroll reveal + counters ===== */
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return; en.target.classList.add('in'); io.unobserve(en.target);
  en.target.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || ''; let n = 0;
    const step = Math.max(1, Math.ceil(end / 40));
    const t = setInterval(() => { n = Math.min(end, n + step); el.textContent = n + suf; if (n >= end) clearInterval(t); }, 30);
  });
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ===== Talent listings (used on several pages) ===== */
async function loadProviders(gridId = 'provider-grid', category = 'All services') {
  const grid = document.getElementById(gridId); if (!grid) return;
  try {
    const qs = category !== 'All services' ? '?category=' + encodeURIComponent(category) : '';
    let { providers } = await api('/api/providers' + qs);
    if (category !== 'All services') providers = providers.filter(p => p.category === category);
    grid.innerHTML = providers.length ? providers.map(p => `
      <article class="provider reveal in">
        <div class="avatar">${esc((p.owner || '?')[0].toUpperCase())}</div>
        <h3>${esc(p.title)}${p.sample ? '<span class="tag">sample</span>' : ''}</h3>
        <p class="by">${esc(p.owner)} · ${esc(p.category)}</p>
        <p>${esc(p.description)}</p>
        <div class="meta"><span>${esc(p.price || 'Ask for price')}</span><span>${esc(p.contact || '')}</span></div>
      </article>`).join('') : '<p>No one has listed this skill yet. Be the first!</p>';
  } catch { grid.innerHTML = '<p>Could not load talent right now.</p>'; }
}

/* ===== Slideshows (arrows, dots, autoplay, swipe, keyboard) ===== */
function initSlideshow(root) {
  const slides = [...root.querySelectorAll('.ss-slide')]; if (!slides.length) return;
  const dots = root.querySelector('.ss-dots'); let i = 0, timer;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  slides.forEach((_, n) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Go to slide ' + (n + 1)); b.onclick = () => { show(n); play(); }; dots.appendChild(b); });
  function show(n) {
    slides[i].classList.remove('active'); dots.children[i].classList.remove('on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('active'); dots.children[i].classList.add('on');
  }
  function play() { clearInterval(timer); if (!still) timer = setInterval(() => show(i + 1), +root.dataset.autoplay || 6000); }
  root.querySelector('.ss-prev').onclick = () => { show(i - 1); play(); };
  root.querySelector('.ss-next').onclick = () => { show(i + 1); play(); };
  root.addEventListener('mouseenter', () => clearInterval(timer));
  root.addEventListener('mouseleave', play);
  root.tabIndex = 0;
  root.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { show(i - 1); play(); } if (e.key === 'ArrowRight') { show(i + 1); play(); } });
  let x0 = null;
  root.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => { if (x0 === null) return; const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 40) { show(i + (d < 0 ? 1 : -1)); play(); } x0 = null; });
  show(0); play();
}
document.querySelectorAll('.slideshow').forEach(initSlideshow);
renderUser();
