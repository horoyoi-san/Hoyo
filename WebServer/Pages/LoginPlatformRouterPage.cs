namespace March7thHoney.WebServer.Pages;

public static class LoginPlatformRouterPage
{
    public static string Render()
    {
        return """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login Platform</title>
</head>
<body>
  <script>
    function normalizeRoute(hash) {
      return (hash || "")
        .split("?")[0]
        .replace(/^#\/?/, "")
        .replace(/\/+$/, "")
        .toLowerCase();
    }

    function routeToPath(route) {
      if (!route) {
        return "/login-platform/register.html";
      }

      if (!/^[a-z0-9][a-z0-9/_-]*$/.test(route)) {
        return "/login-platform/404.html";
      }

      return `/login-platform/${route}.html`;
    }

    const target = routeToPath(normalizeRoute(window.location.hash));
    window.location.replace(target + window.location.search + window.location.hash);
  </script>
</body>
</html>
""";
    }
}
