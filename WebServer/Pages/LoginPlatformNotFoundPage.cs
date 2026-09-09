using System.Net;

namespace March7thHoney.WebServer.Pages;

public static class LoginPlatformNotFoundPage
{
    public static string Render(string serverName, string registrationPageIcon)
    {
        var displayName = string.IsNullOrWhiteSpace(serverName) ? "March7thHoney" : serverName.Trim();
        var encodedDisplayName = WebUtility.HtmlEncode(displayName);
        var iconMarkup = RenderIcon(registrationPageIcon, displayName);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 - Page not found</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #f5f7fb;
      --muted: #a9b2c4;
      --surface: #161b26;
      --accent: #4f8cff;
      --accent-strong: #3674eb;
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

    .code {
      color: var(--danger);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0;
      margin: 0 0 10px;
    }

    .actions {
      display: flex;
      margin-top: 24px;
    }

    .button-link {
      min-height: 46px;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      padding: 0 18px;
      text-decoration: none;
    }

    .button-link:hover {
      background: var(--accent-strong);
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
          <h1 id="title">Page not found</h1>
          <p class="subtitle">{{encodedDisplayName}}</p>
        </div>
      </div>

      <p class="code">404</p>
      <p class="subtitle">The requested login page does not exist.</p>

      <div class="actions">
        <a class="button-link" href="/login-platform/register.html">Create account</a>
      </div>
    </section>
  </main>
</body>
</html>
""";
    }

    private static string RenderIcon(string configuredIcon, string serverName)
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
