/**
 * Login page HTML — rendered server-side, multi-step via JS for admin OTP.
 */

export function renderLoginPage(errorMsg?: string): string {
  const errorHtml = errorMsg ? `<p class="msg error">${errorMsg}</p>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login – AWS re/Start Ghana</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: #f0f2f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #222;
    }
    .card {
      padding: 2.5rem 2rem;
      width: 100%; max-width: 420px;
    }
    .logo { text-align: center; margin-bottom: 1.8rem; }
    .logo h1 { font-size: 1.35rem; font-weight: 700; color: #232f3e; margin: 0 0 4px; }
    .logo p { color: #888; font-size: 0.88rem; margin: 0; }
    label {
      display: block; font-size: 0.83rem;
      font-weight: 600; color: #444; margin-bottom: 4px;
    }
    input[type="email"], input[type="password"], input[type="text"] {
      width: 100%; padding: 10px 12px;
      border: 1px solid #d0d0d0; border-radius: 3.5px;
      font-size: 0.97rem; outline: none; margin-bottom: 14px;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #e47911; box-shadow: 0 0 0 2px #fae8d0; }
    .btn {
      width: 100%; padding: 11px;
      border: none; border-radius: 3.5px;
      font-size: 0.97rem; font-weight: 600;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-primary { background: #e47911; color: #fff; }
    .btn-primary:hover { background: #c76a00; }
    .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
    .btn-ghost {
      background: none; color: #555;
      border: 1px solid #ccc; border-radius: 3.5px; margin-top: 10px;
    }
    .btn-ghost:hover { background: #f5f5f5; }
    .divider {
      display: flex; align-items: center; gap: 10px;
      margin: 18px 0; color: #aaa; font-size: 0.82rem;
    }
    .divider::before, .divider::after {
      content: ""; flex: 1; height: 1px; background: #e0e0e0;
    }
    .msg {
      border-radius: 3.5px; padding: 10px 12px;
      font-size: 0.88rem; margin-bottom: 14px;
    }
    .error { background: #fce4e4; border: 1px solid #f5c6c6; color: #c0392b; }
    .info { background: #eaf4fb; border: 1px solid #b3d9f5; color: #1a6fa0; }
    .hidden { display: none !important; }
    .otp-input {
      text-align: center; font-size: 1.8rem !important;
      letter-spacing: 0.5em; font-weight: 700;
    }
    .spinner {
      display: inline-block; width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle; margin-left: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .back { font-size: 0.83rem; color: #888; cursor: pointer;
      text-decoration: underline; display: block; text-align: center; margin-top: 10px; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>AWS re/Start Ghana</h1>
    <p>GHACC63 · Grading Portal</p>
  </div>

  ${errorHtml}

  <!-- ── STEP 1: Entry ─────────────────────── -->
  <div id="step-entry">
    <!-- Admin credentials -->
    <label for="admin-email">Admin email</label>
    <input type="email" id="admin-email" placeholder="you@example.com"
           autocomplete="off">

    <label for="admin-password">Password</label>
    <input type="password" id="admin-password" placeholder="••••••••"
           autocomplete="off"
           onkeydown="if(event.key==='Enter') submitAdminLogin()">

    <div id="login-error" class="msg error hidden"></div>

    <button class="btn btn-primary" id="login-btn"
            onclick="submitAdminLogin()">Admin Login</button>

    <div class="divider">or</div>

    <!-- Guest access -->
    <form method="POST" action="/auth/guest">
      <button type="submit" class="btn btn-ghost">Continue as Guest</button>
    </form>
  </div>

  <!-- ── STEP 2: OTP ───────────────────────── -->
  <div id="step-otp" class="hidden">
    <p class="msg info">
      Enter the verification code to continue.
    </p>
    <label for="otp-code">Verification code</label>
    <input type="text" id="otp-code" class="otp-input"
           maxlength="6" inputmode="numeric" placeholder="000000"
           oninput="this.value=this.value.replace(/[^0-9]/g,'')"
           onkeydown="if(event.key==='Enter') submitOtp()">

    <div id="otp-error" class="msg error hidden"></div>

    <button class="btn btn-primary" id="otp-btn"
            onclick="submitOtp()">Verify &amp; Login</button>
    <span class="back" onclick="goBack()">← Back</span>
  </div>
</div>

<script>
  function setLoading(id, on, label) {
    const b = document.getElementById(id);
    b.disabled = on;
    b.innerHTML = on ? label + '<span class="spinner"></span>' : label;
  }
  function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg; el.classList.remove('hidden');
  }
  function hideError(id) { document.getElementById(id).classList.add('hidden'); }

  async function submitAdminLogin() {
    hideError('login-error');
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    if (!email || !password) { showError('login-error', 'Email and password are required.'); return; }
    setLoading('login-btn', true, 'Admin Login');
    try {
      const res = await fetch('/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { showError('login-error', data.error || 'Invalid credentials.'); }
      else {
        document.getElementById('step-entry').classList.add('hidden');
        document.getElementById('step-otp').classList.remove('hidden');
        setTimeout(() => document.getElementById('otp-code').focus(), 50);
      }
    } catch {
      showError('login-error', 'Could not reach server. Please try again.');
    }
    setLoading('login-btn', false, 'Admin Login');
  }

  async function submitOtp() {
    hideError('otp-error');
    const otp = document.getElementById('otp-code').value.trim();
    if (otp.length !== 6) { showError('otp-error', 'Enter the 6-digit code.'); return; }
    setLoading('otp-btn', true, 'Verify &amp; Login');
    try {
      const res = await fetch('/auth/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (!res.ok) { showError('otp-error', data.error || 'Invalid code.'); }
      else { window.location.href = '/'; }
    } catch {
      showError('otp-error', 'Could not reach server. Please try again.');
    }
    setLoading('otp-btn', false, 'Verify &amp; Login');
  }

  function goBack() {
    document.getElementById('step-otp').classList.add('hidden');
    document.getElementById('step-entry').classList.remove('hidden');
    document.getElementById('otp-code').value = '';
    hideError('otp-error');
  }
</script>
</body>
</html>`;
}
