using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using March7thHoney.Database.Account;
using March7thHoney.GameServer.Game.Calyx;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Util;
using March7thHoney.WebServer.Server;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

public static class JsonRoutes
{
    private static readonly Logger logger = Logger.GetByClassName();

    public static void MapJsonRoutes(this IEndpointRouteBuilder app)
    {
        app.MapPost("/sr-tools", SrTools);
        app.MapPost("/console/exec", ConsoleExec);
        app.MapPost("/console/self-reset", ConsoleSelfReset);
        app.MapGet("/sr-tools-export", DownloadFreedata);
    }

    private static async Task<IResult> SrTools(HttpRequest request)
    {
        try
        {
            using var reader = new StreamReader(request.Body, Encoding.UTF8);
            string body = await reader.ReadToEndAsync();

            var obj = JsonNode.Parse(body);
            string username = obj?["username"]?.ToString() ?? "";
            string password = obj?["password"]?.ToString() ?? "";
            string dataJson = obj?["data"]?.ToJsonString() ?? "";

            if (!int.TryParse(username, out var uid))
                return Results.Text("Username field must be the player's UID (integer).", "text/plain", null, 400);

            var acc = AccountData.GetAccountByUid(uid);
            if (acc == null)
                return Results.Text("uid not found on server", "text/plain", null, 400);

            if (ConfigManager.Config.WebSecurity.EnableRsaLoginDecrypt &&
                (string.IsNullOrEmpty(password) || !acc.VerifyPassword(password)))
                return Results.Text("Invalid password for this uid.", "text/plain", null, 401);

            Connection? con = null;
            foreach (var item in March7thHoneyListener.GetSnapshot())
            {
                if (item is not Connection c) continue;
                if (c.Player?.Uid == acc.Uid)
                {
                    con = c;
                    break;
                }
            }

            if (con?.Player == null)
                return Results.Text("player offline", "text/plain", null, 400);

            if (dataJson != string.Empty)
            {
                var player = con.Player;
                await FreesrShared.ImportJson(dataJson, player, async msg =>
                {
                    if (msg[0] == "Game.Command.Json.ImportSummary" || msg[0] == "Game.Command.Json.AvatarExcelNotFound")
                        return;
                    throw new Exception(I18NManager.Translate(msg[0], msg.Skip(1).ToArray()));
                });
            }

            return Results.Text("Successfully synced data from website!", "application/json");
        }
        catch (Exception ex)
        {
            return Results.Text(ex.Message, "text/plain", null, 500);
        }
    }

    // Launcher console entry: authenticate with UID + password (same as
    // sr-tools) and run a command with the EXACT permissions of in-game chat.
    // An empty command performs a credential check only (used by "Connect").
    private static async Task<IResult> ConsoleExec(HttpRequest request)
    {
        try
        {
            using var reader = new StreamReader(request.Body, Encoding.UTF8);
            string body = await reader.ReadToEndAsync();

            var obj = JsonNode.Parse(body);
            string username = obj?["username"]?.ToString() ?? "";
            string password = obj?["password"]?.ToString() ?? "";
            string command = obj?["command"]?.ToString() ?? "";

            if (!int.TryParse(username, out var uid))
                return ConsoleJson(1, "Username field must be the player's UID (integer).", null, 400);

            var acc = AccountData.GetAccountByUid(uid);
            if (acc == null)
                return ConsoleJson(1, "uid not found on server", null, 400);

            // Always verify the password when the account has one set, regardless of
            // the RSA-login flag — command execution must not be password-bypassable.
            if (acc.HasPassword() && (string.IsNullOrEmpty(password) || !acc.VerifyPassword(password)))
                return ConsoleJson(1, "Invalid password for this uid.", null, 401);

            command = command.Trim();
            if (command.Length > 4096)
                return ConsoleJson(1, "Command too long.", null, 400);

            // Use the same active-connection lookup the command pipeline uses.
            var con = Listener.GetActiveConnection(acc.Uid);
            var online = con?.Player != null;

            // Signing in must succeed while offline: resetting save data does not need
            // a live session, so only real command execution is gated on being online.
            if (string.IsNullOrWhiteSpace(command))
            {
                var status = online
                    ? "Status: online."
                    : "Status: offline - commands require you to be in-game, but resetting save data does not.";
                return ConsoleJson(0, "OK", $"Connected as UID {acc.Uid} (role: {acc.GetRole()}). {status}");
            }

            // Commands run against the live session, so the player must be online.
            if (!online)
                return ConsoleJson(1, "player offline", null, 400);

            // Run through the MUIP pipeline with a non-admin session bound to the
            // player's account and targeting their own uid. MuipCommandSender then
            // resolves permissions via Account.HasPermission, identical to chat.
            var sessionId = $"console-{Guid.NewGuid():N}";
            MuipManager.Sessions[sessionId] = new MuipSession
            {
                SessionId = sessionId,
                ExpireTimeStamp = DateTime.Now.AddMinutes(1).ToUnixSec(),
                IsAdmin = false,
                IsAuthorized = true,
                Account = acc
            };

            try
            {
                var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(command));
                var response = MuipManager.ExecuteCommand(sessionId, encoded, acc.Uid);
                if (response.Code != 0)
                    return ConsoleJson(1, response.Message, null, 400);

                var output = string.Empty;
                if (!string.IsNullOrWhiteSpace(response.Data?.Message))
                    output = Encoding.UTF8.GetString(Convert.FromBase64String(response.Data.Message));

                return ConsoleJson(0, "OK", output.TrimEnd());
            }
            finally
            {
                MuipManager.Sessions.Remove(sessionId);
            }
        }
        catch (Exception ex)
        {
            logger.Error("Console command execution failed", ex);
            return ConsoleJson(1, "Internal server error.", null, 500);
        }
    }

    // Launcher self-reset: authenticate with UID + password and reset ONLY that
    // player's own gameplay data (self-only by construction). Works offline, so a
    // crash-locked account can be reset before logging back in.
    private static async Task<IResult> ConsoleSelfReset(HttpRequest request)
    {
        try
        {
            using var reader = new StreamReader(request.Body, Encoding.UTF8);
            string body = await reader.ReadToEndAsync();

            var obj = JsonNode.Parse(body);
            string username = obj?["username"]?.ToString() ?? "";
            string password = obj?["password"]?.ToString() ?? "";
            var confirmed = string.Equals(obj?["confirm"]?.ToString(), "true", StringComparison.OrdinalIgnoreCase);

            if (!int.TryParse(username, out var uid))
                return ConsoleJson(1, "Username field must be the player's UID (integer).", null, 400);

            var acc = AccountData.GetAccountByUid(uid);
            if (acc == null)
                return ConsoleJson(1, "uid not found on server", null, 400);

            if (acc.HasPassword() && (string.IsNullOrEmpty(password) || !acc.VerifyPassword(password)))
                return ConsoleJson(1, "Invalid password for this uid.", null, 401);

            if (!confirmed)
                return ConsoleJson(1, "Reset requires confirmation.", null, 400);

            await PlayerResetHelper.ResetGameplayAsync(acc.Uid);

            return ConsoleJson(0, "OK", $"Your save data has been reset (UID {acc.Uid}). Please log in again.");
        }
        catch (Exception ex)
        {
            logger.Error("Console self-reset failed", ex);
            return ConsoleJson(1, "Internal server error.", null, 500);
        }
    }

    private static IResult ConsoleJson(int retcode, string message, string? output, int statusCode = 200)
    {
        var json = JsonSerializer.Serialize(new ConsoleResult(retcode, message, output ?? string.Empty),
            WebJsonContext.Default.ConsoleResult);
        return Results.Text(json, "application/json", null, statusCode);
    }

    private static async Task<IResult> DownloadFreedata(HttpRequest request, HttpResponse response)
    {
        int uid = 0;
        if (request.Query.ContainsKey("uid"))
            int.TryParse(request.Query["uid"], out uid);

        if (uid == 0)
            return Results.Text("Error: Missing valid uid parameter", "text/plain", null, 400);

        var acc = AccountData.GetAccountByUid(uid);
        if (acc == null)
            return Results.Text("uid not found on server", "text/plain", null, 400);

        // Always verify the password when the account has one set, regardless of the RSA-login
        // flag (same rule as ConsoleExec) — this endpoint exports a player's full save data and
        // must not be reachable by uid alone.
        var password = request.Query.TryGetValue("password", out var pw) ? pw.ToString() : "";
        if (acc.HasPassword() && (string.IsNullOrEmpty(password) || !acc.VerifyPassword(password)))
            return Results.Text("Invalid password for this uid.", "text/plain", null, 401);

        var json = await FreesrShared.ExportPlayerDataAsync(uid, true);

        response.Headers["Content-Disposition"] =
            "attachment; filename=freesr-data.json; filename*=UTF-8''freesr-data.json";
        return Results.Text(json, "application/octet-stream");
    }
}
