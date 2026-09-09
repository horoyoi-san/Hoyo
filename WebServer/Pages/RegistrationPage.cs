using System.Net;

namespace March7thHoney.WebServer.Pages;

public static class RegistrationPage
{
    public static string Render(
        int minimumPasswordLength,
        string serverName,
        string registrationPageIcon,
        bool registrationEnabled)
    {
        var displayName = string.IsNullOrWhiteSpace(serverName) ? "March7thHoney" : serverName.Trim();
        var encodedDisplayName = WebUtility.HtmlEncode(displayName);
        var encodedTitle = WebUtility.HtmlEncode($"Register - {displayName}");
        var iconMarkup = RenderIconMarkup(registrationPageIcon, displayName);
        var disabledAttribute = registrationEnabled ? "" : " disabled";
        var initialMessage = registrationEnabled ? "" : "Registration is disabled.";
        var encodedInitialMessage = WebUtility.HtmlEncode(initialMessage);
        var messageClass = registrationEnabled ? "message" : "message error";
        var registrationEnabledJson = registrationEnabled ? "true" : "false";

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

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      background:
        linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(114, 215, 155, 0.10)),
        #0d111a;
    }

    main {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px;
    }

    .panel {
      width: min(100%, 420px);
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 30px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 26px;
    }

    .mark {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border-radius: 0;
      background: transparent;
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 17px;
      overflow: hidden;
    }

    .mark span {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      background: #2f6fe4;
      display: grid;
      place-items: center;
      max-width: 100%;
      padding: 0 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    h1 {
      font-size: 24px;
      line-height: 1.2;
      margin: 0;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }

    form {
      display: grid;
      gap: 16px;
    }

    label {
      display: grid;
      gap: 7px;
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }

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

    input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.24);
      background: #242c3d;
    }

    input:disabled {
      color: var(--muted);
      cursor: not-allowed;
      opacity: 0.8;
    }

    button {
      min-height: 46px;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      margin-top: 2px;
    }

    button:hover:not(:disabled) {
      background: var(--accent-strong);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .message {
      min-height: 22px;
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }

    .message.success {
      color: var(--success);
    }

    .message.error {
      color: var(--danger);
    }

    .result {
      display: none;
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .result strong {
      color: var(--ink);
    }

    @media (max-width: 480px) {
      main {
        padding: 18px;
      }

      .panel {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="panel" aria-labelledby="title">
      <div class="brand">
        <div class="mark" aria-hidden="true">{{iconMarkup}}</div>
        <div>
          <h1 id="title">Create account</h1>
          <p class="subtitle">{{encodedDisplayName}}</p>
        </div>
      </div>

      <form id="register-form" autocomplete="on">
        <label>
          Username
          <input id="username" name="username" autocomplete="username" required maxlength="64"{{disabledAttribute}}>
        </label>

        <label>
          Email
          <input id="email" name="email" type="email" autocomplete="email" required maxlength="254"{{disabledAttribute}}>
        </label>

        <label>
          Password
          <input id="password" name="password" type="password" autocomplete="new-password" required minlength="{{minimumPasswordLength}}"{{disabledAttribute}}>
        </label>

        <label>
          Confirm password
          <input id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" required minlength="{{minimumPasswordLength}}"{{disabledAttribute}}>
        </label>

        <button id="submit-button" type="submit"{{disabledAttribute}}>Create account</button>
        <p id="message" class="{{messageClass}}" role="status" aria-live="polite">{{encodedInitialMessage}}</p>
      </form>

      <div id="result" class="result">
        UID <strong id="uid"></strong><br>
        <span id="next-step"></span>
      </div>
    </section>
  </main>

  <script>
    const minimumPasswordLength = {{minimumPasswordLength}};
    const registrationEnabled = {{registrationEnabledJson}};
    const form = document.getElementById("register-form");
    const button = document.getElementById("submit-button");
    const message = document.getElementById("message");
    const result = document.getElementById("result");
    const uid = document.getElementById("uid");
    const nextStep = document.getElementById("next-step");

    function setMessage(text, kind) {
      message.textContent = text;
      message.className = kind ? `message ${kind}` : "message";
    }

    function getOrCreateDeviceId() {
      const key = "march7thhoney.registration.device_id";
      try {
        const existing = window.localStorage.getItem(key);
        if (existing) return existing;

        const generated = window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(key, generated);
        return generated;
      } catch {
        return "";
      }
    }

    function getDeviceFingerprint() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const size = window.screen
        ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
        : "";

      return JSON.stringify({
        userAgent: navigator.userAgent || "",
        language: navigator.language || "",
        platform: navigator.platform || "",
        timezone,
        size,
        cores: navigator.hardwareConcurrency || 0,
        touch: navigator.maxTouchPoints || 0
      });
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      result.style.display = "none";

      if (!registrationEnabled) {
        setMessage("Registration is disabled.", "error");
        return;
      }

      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (!username) {
        setMessage("Username cannot be empty.", "error");
        return;
      }

      if (!email) {
        setMessage("Email cannot be empty.", "error");
        return;
      }

      if (password.length < minimumPasswordLength) {
        setMessage(`Password must be at least ${minimumPasswordLength} characters long.`, "error");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("Passwords do not match.", "error");
        return;
      }

      button.disabled = true;
      setMessage("Creating account...", "");

      try {
        const response = await fetch("/account/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            password,
            confirm_password: confirmPassword,
            device_id: getOrCreateDeviceId(),
            device_fp: getDeviceFingerprint()
          })
        });

        const body = await response.json();
        if (!response.ok || body.retcode !== 0) {
          throw new Error(body.message || "Registration failed");
        }

        const accountUid = body.data?.account?.uid || body.data?.user_info?.aid || "";
        const verificationRequired = Boolean(body.data?.email_verification_required);
        const emailSent = Boolean(body.data?.email_sent);
        uid.textContent = accountUid;
        nextStep.textContent = verificationRequired
          ? (emailSent
            ? "Check your email and verify the account before logging in."
            : "Email verification is required, but the verification email could not be sent. Contact an administrator.")
          : "Return to the game login screen and sign in with your username or email.";
        result.style.display = "block";
        setMessage(verificationRequired ? "Account created. Email verification required." : "Account created.", "success");
        form.reset();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Registration failed", "error");
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
""";
    }

    public static string RenderIconMarkup(string configuredIcon, string serverName)
    {
        var icon = string.IsNullOrWhiteSpace(configuredIcon) ? BuildInitials(serverName) : configuredIcon.Trim();

        if (TryCreateImageSource(icon, out var imageSource))
        {
            var encodedSource = WebUtility.HtmlEncode(imageSource);
            return $"""<img src="{encodedSource}" alt="">""";
        }

        return $"<span>{WebUtility.HtmlEncode(icon)}</span>";
    }

    private static string BuildInitials(string serverName)
    {
        var chars = serverName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part[0])
            .Where(char.IsLetterOrDigit)
            .Take(2)
            .ToArray();

        if (chars.Length == 0)
        {
            chars = serverName.Where(char.IsLetterOrDigit).Take(2).ToArray();
        }

        return chars.Length == 0 ? "M7" : new string(chars).ToUpperInvariant();
    }

    private static bool TryCreateImageSource(string icon, out string source)
    {
        source = string.Empty;

        if (icon.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) ||
            (Uri.TryCreate(icon, UriKind.Absolute, out var uri) &&
             (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
        {
            source = icon;
            return true;
        }

        if (!IsSupportedImagePath(icon))
            return false;

        if (TryCreateLocalImageDataUri(icon, out source))
            return true;

        source = icon.StartsWith('/') ? icon : "/" + icon.Replace('\\', '/').TrimStart('/');
        return true;
    }

    private static bool TryCreateLocalImageDataUri(string iconPath, out string source)
    {
        source = string.Empty;
        var normalizedPath = iconPath.Replace('\\', Path.DirectorySeparatorChar);
        var candidates = new[]
        {
            normalizedPath,
            Path.Combine(Environment.CurrentDirectory, normalizedPath)
        };

        foreach (var candidate in candidates)
        {
            try
            {
                if (!File.Exists(candidate))
                    continue;

                var mimeType = GetImageMimeType(candidate);
                var bytes = File.ReadAllBytes(candidate);
                source = $"data:{mimeType};base64,{Convert.ToBase64String(bytes)}";
                return true;
            }
            catch
            {
                // Fall back to rendering the configured value as a web path.
            }
        }

        return false;
    }

    private static bool IsSupportedImagePath(string value)
    {
        return GetImageMimeType(value) != "application/octet-stream";
    }

    private static string GetImageMimeType(string value)
    {
        return Path.GetExtension(value).ToLowerInvariant() switch
        {
            ".gif" => "image/gif",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".svg" => "image/svg+xml",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }
}
