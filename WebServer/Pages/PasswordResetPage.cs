using System.Net;

namespace March7thHoney.WebServer.Pages;

public static class PasswordResetPage
{
    public static string Render(int minimumPasswordLength, string serverName, string registrationPageIcon)
    {
        var displayName = string.IsNullOrWhiteSpace(serverName) ? "March7thHoney" : serverName.Trim();
        var encodedDisplayName = WebUtility.HtmlEncode(displayName);
        var encodedTitle = WebUtility.HtmlEncode($"Reset password - {displayName}");
        var iconMarkup = RegistrationPage.RenderIconMarkup(registrationPageIcon, displayName);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{encodedTitle}}</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f5f7fb;
      --muted: #a9b2c4;
      --line: #303849;
      --surface: #161b26;
      --field: #202737;
      --accent: #4f8cff;
      --accent-strong: #3674eb;
      --success: #72d79b;
      --danger: #ff8f8a;
      --shadow: 0 24px 70px rgba(0, 0, 0, 0.44);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      background: linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(114, 215, 155, 0.10)), #0d111a;
    }
    main { min-height: 100vh; display: grid; place-items: center; padding: 28px; }
    .panel {
      width: min(100%, 420px);
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 30px;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
    .mark { width: 42px; height: 42px; flex: 0 0 42px; overflow: hidden; display: grid; place-items: center; }
    .mark span { width: 100%; height: 100%; border-radius: 8px; background: #2f6fe4; display: grid; place-items: center; font-weight: 800; }
    .mark img { width: 100%; height: 100%; object-fit: contain; display: block; }
    h1 { font-size: 24px; line-height: 1.2; margin: 0; letter-spacing: 0; }
    .subtitle { margin: 4px 0 0; color: var(--muted); font-size: 14px; line-height: 1.45; }
    form { display: grid; gap: 16px; }
    label { display: grid; gap: 7px; font-size: 13px; font-weight: 700; color: var(--ink); }
    input {
      width: 100%;
      min-height: 46px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--field);
      color: var(--ink);
      font: inherit;
      padding: 11px 13px;
      outline: none;
    }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.24); background: #242c3d; }
    button {
      min-height: 46px;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    button:hover:not(:disabled) { background: var(--accent-strong); }
    button:disabled { cursor: not-allowed; opacity: 0.7; }
    .message { min-height: 22px; margin: 2px 0 0; color: var(--muted); font-size: 14px; line-height: 1.45; }
    .message.success { color: var(--success); }
    .message.error { color: var(--danger); }
  </style>
</head>
<body>
  <main>
    <section class="panel" aria-labelledby="title">
      <div class="brand">
        <div class="mark" aria-hidden="true">{{iconMarkup}}</div>
        <div>
          <h1 id="title">Reset password</h1>
          <p class="subtitle">{{encodedDisplayName}}</p>
        </div>
      </div>

      <form id="reset-form" autocomplete="on">
        <label>
          New password
          <input id="password" name="password" type="password" autocomplete="new-password" required minlength="{{minimumPasswordLength}}">
        </label>
        <label>
          Confirm password
          <input id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" required minlength="{{minimumPasswordLength}}">
        </label>
        <button id="submit-button" type="submit">Set password</button>
        <p id="message" class="message" role="status" aria-live="polite"></p>
      </form>
    </section>
  </main>

  <script>
    const minimumPasswordLength = {{minimumPasswordLength}};
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid") || "";
    const token = params.get("token") || "";
    const form = document.getElementById("reset-form");
    const button = document.getElementById("submit-button");
    const message = document.getElementById("message");

    function setMessage(text, kind) {
      message.textContent = text;
      message.className = kind ? `message ${kind}` : "message";
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      if (password.length < minimumPasswordLength) {
        setMessage(`Password must be at least ${minimumPasswordLength} characters long.`, "error");
        return;
      }
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.", "error");
        return;
      }

      button.disabled = true;
      setMessage("Updating password...", "");
      try {
        const response = await fetch("/account/password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, token, password, confirm_password: confirmPassword })
        });
        const body = await response.json();
        if (!response.ok || body.retcode !== 0) {
          throw new Error(body.message || "Password reset failed");
        }
        form.reset();
        setMessage("Password updated.", "success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Password reset failed", "error");
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
""";
    }
}
