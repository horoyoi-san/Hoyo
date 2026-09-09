using System.Net;
using System.Text.Json;
using March7thHoney.Command;
using March7thHoney.WebServer;

namespace March7thHoney.WebServer.Pages;

public static class AdminPageRenderer
{
    public static string Render(string serverName)
    {
        var displayName = string.IsNullOrWhiteSpace(serverName) ? "March7thHoney" : serverName.Trim();
        var encodedDisplayName = WebUtility.HtmlEncode(displayName);
        var encodedTitle = WebUtility.HtmlEncode($"Admin console - {displayName}");
        var serverNameJson = JsonSerializer.Serialize(displayName, WebJsonContext.Default.String);
        var knownPermissionsJson =
            JsonSerializer.Serialize(CommandPermissions.KnownPermissions().ToArray(), WebJsonContext.Default.StringArray);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{encodedTitle}}</title>
  <style>
{{AdminPageStyles.Render()}}
  </style>
</head>
<body>
  <section id="login-panel" class="login-view">
    <div class="login-card">
      <div>
        <p class="eyebrow">Admin console</p>
        <h1>{{encodedDisplayName}}</h1>
      </div>
      <form id="login-form" class="stack">
        <label>
          <span>Admin key</span>
          <input id="admin-key" name="admin_key" type="password" autocomplete="current-password" required>
        </label>
        <button class="button primary" type="submit">Log in</button>
        <div id="login-message" class="message" role="status" aria-live="polite"></div>
      </form>
    </div>
  </section>

  <section id="admin-app" class="admin-app hidden">
    <header class="topbar">
      <div>
        <p class="eyebrow">March7thHoney</p>
        <h1>Admin console</h1>
        <p class="server-name">{{encodedDisplayName}}</p>
      </div>
      <div class="topbar-actions">
        <span id="session-chip" class="chip good">Signed in</span>
        <button id="global-refresh-button" class="button subtle" type="button">Refresh</button>
        <button id="logout-button" class="button subtle" type="button">Log out</button>
      </div>
    </header>

    <div class="admin-layout">
      <aside class="sidebar">
        <nav id="module-nav" class="module-nav" aria-label="Admin modules"></nav>
      </aside>

      <main class="content">
        <section class="module-heading">
          <div>
            <p id="module-kicker" class="eyebrow">Overview</p>
            <h2 id="module-title">Overview</h2>
          </div>
          <div id="status-message" class="message inline" role="status" aria-live="polite"></div>
        </section>

        <section id="module-root" class="module-root"></section>
      </main>
    </div>
  </section>

  <script>
    window.M7_ADMIN_CONFIG = {
      serverName: {{serverNameJson}},
      knownPermissions: {{knownPermissionsJson}}
    };
  </script>
  <script>
{{AdminPageScripts.Render()}}
  </script>
</body>
</html>
""";
    }
}
