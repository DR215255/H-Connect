(function () {
  if (!$('#search-form')) return; // home page only
  let activeCategory = 'All services';
function fillSelects() {
  const opts = c => `<option>${esc(c)}</option>`;
  $('#search-category').innerHTML = ['All services', ...CATEGORIES].map(opts).join('');
  $('#offer-category').innerHTML = '<option value="" disabled selected>Choose a category</option>' + CATEGORIES.map(opts).join('');
}
/* ===== Hero slider ===== */
const slides = document.querySelectorAll('.slider-image'), dots = $('#dots');
let cur = 0, timer;
slides.forEach((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Go to picture ' + (i + 1)); b.onclick = () => { go(i); restart(); }; dots.appendChild(b); });
function go(i) { slides[cur].classList.remove('active'); dots.children[cur].classList.remove('on'); cur = (i + slides.length) % slides.length; slides[cur].classList.add('active'); dots.children[cur].classList.add('on'); }
function restart() { clearInterval(timer); timer = setInterval(() => go(cur + 1), 4000); }
go(0); restart();

/* ===== Services: search + filter ===== */
function fillSelects() {
  const opts = c => `<option>${esc(c)}</option>`;
  $('#search-category').innerHTML = ['All services', ...CATEGORIES].map(opts).join('');
  $('#offer-category').innerHTML = '<option value="" disabled selected>Choose a category</option>' + CATEGORIES.map(opts).join('');
}
function renderFilters() {
  $('#filters').innerHTML = ['All services', ...CATEGORIES].map(c =>
    `<button class="filter" data-c="${esc(c)}" aria-pressed="${c === activeCategory}">${esc(c)}</button>`).join('');
}
function renderServices() {
  const q = $('#search-input').value.trim().toLowerCase();
  const list = SERVICES.filter(s => (activeCategory === 'All services' || s.category === activeCategory) &&
    `${s.title} ${s.category} ${s.desc} ${s.kw}`.toLowerCase().includes(q));
  $('#result-count').textContent = `${list.length} ${list.length === 1 ? 'service' : 'services'} to explore`;
  $('#empty').hidden = list.length > 0; $('#service-grid').hidden = !list.length;
  $('#service-grid').innerHTML = list.map(s => `
    <article class="service-card reveal in">
      <img src="${s.img}" alt="${esc(s.title)}" loading="lazy">
      <div class="card-body">
        <span class="card-cat">${esc(s.category)}</span>
        <h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>
        <a class="card-link" href="#providers" data-c="${esc(s.category)}">See talent ↗</a>
      </div></article>`).join('');
  renderFilters();
}
function setCategory(c) { activeCategory = c; $('#search-category').value = c; renderServices(); loadProviders('provider-grid', activeCategory); }
$('#filters').addEventListener('click', e => { const b = e.target.closest('.filter'); if (b) setCategory(b.dataset.c); });
$('#service-grid').addEventListener('click', e => { const a = e.target.closest('.card-link'); if (a) setCategory(a.dataset.c); });
$('#search-input').addEventListener('input', renderServices);
$('#search-category').addEventListener('change', e => setCategory(e.target.value));
$('#search-form').addEventListener('submit', e => { e.preventDefault(); renderServices(); $('#directory').scrollIntoView(); });
$('#show-all').addEventListener('click', () => { $('#search-input').value = ''; setCategory('All services'); });
document.querySelectorAll('.popular-links a').forEach(a => a.addEventListener('click', () => { $('#search-input').value = a.dataset.q; activeCategory = 'All services'; $('#search-category').value = activeCategory; renderServices(); }));

/* ===== Offer + contact forms ===== */
$('#offer-form').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#offer-msg');
  if (!user) { say(msg, 'Please log in or sign up first.', false); openAuth('signup'); return; }
  try {
    await api('/api/providers', 'POST', Object.fromEntries(new FormData(e.target)));
    e.target.reset(); say(msg, 'Your service is live!', true); loadProviders(); toast('Service posted');
  } catch (err) { say(msg, err.message, false); }
});
$('#contact-form').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#contact-msg');
  try { await api('/api/contact', 'POST', Object.fromEntries(new FormData(e.target))); e.target.reset(); say(msg, 'Message sent. Thank you!', true); }
  catch (err) { say(msg, err.message, false); }
});

  fillSelects(); renderServices(); loadProviders('provider-grid', 'All services');
})();

/* ===== Explore page: filter talent by category ===== */
(function () {
  const grid = $('#ex-providers'); if (!grid) return;
  let cat = 'All services';
  const bar = $('#ex-filters');
  const draw = () => { bar.innerHTML = ['All services', ...CATEGORIES].map(c => `<button class="filter" data-c="${esc(c)}" aria-pressed="${c === cat}">${esc(c)}</button>`).join(''); };
  const set = c => { cat = c; draw(); loadProviders('ex-providers', c); };
  bar.addEventListener('click', e => { const b = e.target.closest('.filter'); if (b) set(b.dataset.c); });
  document.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { set(b.dataset.cat); $('#ex-talent').scrollIntoView({ behavior: 'smooth' }); }));
  draw(); loadProviders('ex-providers', cat);
})();
if ($('#sv-providers')) loadProviders('sv-providers', 'All services');
