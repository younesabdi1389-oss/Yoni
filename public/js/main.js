/* راه‌اندازی: ورود، بارگذاری تنظیمات، شروع */
function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); closeMenu(); closeModal(); }
async function startApp() {
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  buildNav();
  try { const s = await api('/api/settings'); applyTheme(s.theme); S.currency = s.currency; S.name = s.display_name; S.layout = s.dash_layout; } catch {}
  go('dashboard');
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const fd = new FormData(e.target); const btn = $('button[type=submit]', e.target); btn.disabled = true;
  try { await api('/api/login', 'POST', { username: fd.get('username'), password: fd.get('password') }); e.target.reset(); $('#loginErr').textContent = ''; startApp(); }
  catch (er) { $('#loginErr').textContent = er.message; } finally { btn.disabled = false; }
});
window.addEventListener('error', (e) => console.error('JS error:', e.message));
(async () => {
  try { const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => r.json()); me.authenticated ? startApp() : showLogin(); }
  catch { showLogin(); $('#loginErr').textContent = 'ارتباط با سرور برقرار نشد.'; }
})();
