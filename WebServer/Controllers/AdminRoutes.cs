using System.Diagnostics;
using System.Text;
using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.Database.Player;
using March7thHoney.Command;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.Kcp;
using March7thHoney.Util;
using March7thHoney.WebServer.Handler;
using March7thHoney.WebServer.Pages;
using March7thHoney.WebServer.Server;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

public static class AdminRoutes
{
    public static void MapAdminRoutes(this IEndpointRouteBuilder app)
    {
        // One route: the matcher treats "/admin" and "/admin/" as equivalent, so registering both
        // is an ambiguous match (500). This single template serves both.
        app.MapGet("/admin", () => Results.Redirect("/admin/index.html"));
        app.MapGet("/admin/index.html",
            () => Results.Text(AdminPageRenderer.Render(ConfigManager.Config.GameServer.GameServerName),
                "text/html; charset=utf-8"));

        app.MapPost("/admin/api/login", Login);
        app.MapPost("/admin/api/logout", Logout);
        app.MapGet("/admin/api/accounts", GetAccounts);
        app.MapGet("/admin/api/overview", GetOverview);
        app.MapPost("/admin/api/registration", SetRegistration);
        app.MapPost("/admin/api/registration-identity-limit", SetRegistrationIdentityLimit);
        app.MapGet("/admin/api/access", GetAccess);
        app.MapPost("/admin/api/commands", ExecuteCommand);
        app.MapPost("/admin/api/accounts", CreateAccount);
        app.MapPut("/admin/api/accounts/{uid:int}", UpdateAccount);
        app.MapPut("/admin/api/accounts/{uid:int}/password", SetPassword);
        app.MapPost("/admin/api/accounts/{uid:int}/email/verification", SendAccountVerificationEmail);
        app.MapPost("/admin/api/accounts/{uid:int}/ban", BanAccount);
        app.MapDelete("/admin/api/accounts/{uid:int}/ban", UnbanAccount);
        app.MapPost("/admin/api/accounts/{uid:int}/tokens/revoke", RevokeAccountTokens);
        app.MapPost("/admin/api/accounts/{uid:int}/session/kick", KickAccountSession);
        app.MapPost("/admin/api/accounts/{uid:int}/gameplay/reset", ResetAccountGameplay);
        app.MapDelete("/admin/api/accounts/{uid:int}", DeleteAccount);
    }

    private static IResult Login(HttpContext ctx, AdminLoginRequest? request)
    {
        request ??= new AdminLoginRequest();
        if (!AdminSessionManager.TryCreateSession(request.admin_key ?? string.Empty, out var session, out var message))
            return Error(message, statusCode: StatusCodes.Status401Unauthorized);

        return Success(new AdminLoginData(session.Token, session.ExpiresAt.ToUnixTimeSeconds()));
    }

    private static IResult Logout(HttpContext ctx)
    {
        AdminSessionManager.Revoke(GetAdminToken(ctx));
        return Success(new EmptyData());
    }

    private static IResult GetAccounts(HttpContext ctx)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var accounts = GetAllAccounts()
            .Select(ToAccountSummary)
            .OrderBy(account => account.uid)
            .ToList();

        return Success(new AccountsData(
            accounts,
            accounts.Count,
            GetRoleNames(),
            CommandRoles.NormalizeRole(null, ConfigManager.Config.ServerOption.DefaultPermissionRole,
                GetConfiguredRoles())));
    }

    private static IResult GetOverview(HttpContext ctx)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var accounts = GetAllAccounts()
            .Select(ToAccountSummary)
            .OrderBy(account => account.uid)
            .ToList();
        var onlinePlayers = GetOnlinePlayers();
        var process = Process.GetCurrentProcess();

        var stats = new OverviewStats(
            accounts.Count,
            onlinePlayers.Count,
            accounts.Count(account => account.banned),
            accounts.Count(account => !account.email_verified),
            GetConfiguredRoles().Count);

        var server = new OverviewServer(
            ConfigManager.Config.GameServer.GameServerName,
            ConfigManager.Config.GameServer.GetDisplayAddress(),
            ConfigManager.Config.Database.DatabaseType,
            Math.Max(0, (long)(DateTime.Now - process.StartTime).TotalSeconds),
            Math.Round(process.WorkingSet64 / 1024d / 1024d, 1),
            Extensions.GetUnixSec(),
            ConfigManager.Config.ServerOption.Auth.EnableRegistration,
            ConfigManager.Config.ServerOption.Auth.AntiAbuse.LimitRegistrationPerIdentity);

        var roleBreakdown = accounts
            .GroupBy(account => account.role)
            .Select(group => new RoleCount(group.Key, group.Count()))
            .OrderBy(item => item.role)
            .ToList();

        var attention = accounts
            .Where(account => account.banned || !account.email_verified || !account.has_password)
            .Select(account => new AttentionItem(
                account.uid,
                account.username,
                account.email,
                account.role,
                account.banned
                    ? "Banned"
                    : !account.email_verified
                        ? "Email unverified"
                        : "Password missing"))
            .Take(8)
            .ToList();

        return Success(new OverviewData(stats, server, onlinePlayers, roleBreakdown, attention));
    }

    private static IResult SetRegistration(HttpContext ctx, AdminRegistrationRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminRegistrationRequest();
        ConfigManager.Config.ServerOption.Auth.EnableRegistration = request.enabled;
        ConfigManager.SaveConfig();

        return Success(new RegistrationData(ConfigManager.Config.ServerOption.Auth.EnableRegistration));
    }

    private static IResult SetRegistrationIdentityLimit(HttpContext ctx, AdminRegistrationRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminRegistrationRequest();
        ConfigManager.Config.ServerOption.Auth.AntiAbuse.LimitRegistrationPerIdentity = request.enabled;
        ConfigManager.SaveConfig();

        return Success(new IdentityLimitData(
            ConfigManager.Config.ServerOption.Auth.AntiAbuse.LimitRegistrationPerIdentity));
    }

    private static IResult GetAccess(HttpContext ctx)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var serverOption = ConfigManager.Config.ServerOption;
        var roles = GetConfiguredRoles()
            .Select(role => new AccessRole(
                role.Key,
                role.Value.OrderBy(permission => permission).ToList(),
                CommandRoles
                    .GetPermissions(role.Key, serverOption.DefaultPermissionRole, GetConfiguredRoles())
                    .OrderBy(permission => permission)
                    .ToList()))
            .OrderBy(role => role.name)
            .ToList();

        return Success(new AccessData(
            roles,
            NormalizeRole(null),
            serverOption.DefaultPermissions.OrderBy(permission => permission).ToList(),
            CommandPermissions.KnownPermissions().OrderBy(permission => permission).ToList()));
    }

    private static IResult ExecuteCommand(HttpContext ctx, AdminExecuteCommandRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminExecuteCommandRequest();
        var command = (request.command ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(command))
            return Error("Command cannot be empty");

        var sessionId = $"admin-page-{Guid.NewGuid():N}";
        MuipManager.Sessions[sessionId] = new MuipSession
        {
            SessionId = sessionId,
            ExpireTimeStamp = DateTime.Now.AddMinutes(1).ToUnixSec(),
            IsAdmin = true,
            IsAuthorized = true
        };

        try
        {
            var response = MuipManager.ExecuteCommand(sessionId, command, request.target_uid.GetValueOrDefault());
            if (response.Code != 0)
                return Error(response.Message);

            var output = string.Empty;
            if (!string.IsNullOrWhiteSpace(response.Data?.Message))
                output = Encoding.UTF8.GetString(Convert.FromBase64String(response.Data.Message));

            return Success(new ExecCommandData(output.TrimEnd(), request.target_uid.GetValueOrDefault()));
        }
        catch (Exception ex)
        {
            return Error(ex.Message);
        }
        finally
        {
            MuipManager.Sessions.Remove(sessionId);
        }
    }

    private static IResult CreateAccount(HttpContext ctx, AdminCreateAccountRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminCreateAccountRequest();
        var username = (request.username ?? string.Empty).Trim();
        var email = (request.email ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(username))
            return Error("Username cannot be empty");

        if (string.IsNullOrWhiteSpace(email))
            return Error("Email cannot be empty");

        if (string.IsNullOrWhiteSpace(request.password))
            return Error("Password cannot be empty");

        var uid = request.uid.GetValueOrDefault();
        try
        {
            var role = NormalizeRole(request.role);
            AccountHelper.CreateAccount(username, email, request.password, uid, role,
                request.email_verified.GetValueOrDefault());
            var account = AccountData.GetAccountByUserName(username);
            if (account == null)
                return Error("Failed to create account");

            account.SyncPermissionsWithRole();
            account.SetPermissionOverrides(request.permissions);

            return Success(new AccountWrap(ToAccountSummary(account)));
        }
        catch (Exception ex)
        {
            return Error(ex.Message);
        }
    }

    private static async Task<IResult> UpdateAccount(HttpContext ctx, int uid, AdminUpdateAccountRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminUpdateAccountRequest();
        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        var username = (request.username ?? string.Empty).Trim();
        var email = (request.email ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(username))
            return Error("Username cannot be empty");

        if (string.IsNullOrWhiteSpace(email))
            return Error("Email cannot be empty");

        var existing = AccountData.GetAccountByUserName(username);
        if (existing != null && existing.Uid != uid)
            return Error("Username already exists");

        var existingEmail = AccountData.GetAccountByEmail(email);
        if (existingEmail != null && existingEmail.Uid != uid)
            return Error("Email already exists");

        var previousNormalizedEmail = account.NormalizedEmail;
        if (string.IsNullOrWhiteSpace(previousNormalizedEmail))
            previousNormalizedEmail = AccountData.NormalizeEmail(account.Email);
        var previousEmailVerified = account.IsEmailVerified;
        var requestedEmailVerified = request.email_verified.GetValueOrDefault(account.IsEmailVerified);

        try
        {
            account.Username = username;
            AccountHelper.SetEmail(account, email, requestedEmailVerified);
            account.SetRole(request.role);
            account.SetPermissionOverrides(request.permissions);
        }
        catch (Exception ex)
        {
            return Error(ex.Message);
        }

        var emailSent = false;
        var emailChanged = !string.Equals(previousNormalizedEmail, account.NormalizedEmail, StringComparison.OrdinalIgnoreCase);
        var changedFromVerifiedToUnverified = previousEmailVerified && !account.IsEmailVerified;
        if (!account.IsEmailVerified && (emailChanged || changedFromVerifiedToUnverified))
            emailSent = await AccountRecoveryHandler.SendVerificationEmailForAccount(account, ctx.Request);

        return Success(new AccountEmailWrap(ToAccountSummary(account), emailSent));
    }

    private static IResult SetPassword(HttpContext ctx, int uid, AdminSetPasswordRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminSetPasswordRequest();
        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        try
        {
            AccountHelper.SetPassword(account, request.password ?? string.Empty);
            return Success(new AccountWrap(ToAccountSummary(account)));
        }
        catch (Exception ex)
        {
            return Error(ex.Message);
        }
    }

    private static async Task<IResult> SendAccountVerificationEmail(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(account.Email))
            return Error("Account does not have an email address");

        var emailSent = await AccountRecoveryHandler.SendVerificationEmailForAccount(account, ctx.Request,
            markUnverified: true);
        return Success(new AccountEmailWrap(ToAccountSummary(account), emailSent));
    }

    private static IResult BanAccount(HttpContext ctx, int uid, AdminBanAccountRequest? request)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        request ??= new AdminBanAccountRequest();
        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        if (!TryResolveBanExpireAt(request, out var expireAt, out var error))
            return Error(error);

        account.AddKnownIdentityKeys(GetActiveConnectionIdentityKeys(account.Uid));
        account.Ban(request.reason, expireAt);
        KickBannedConnection(account.Uid, account.GetBanStatus());

        return Success(new AccountWrap(ToAccountSummary(account)));
    }

    private static IResult UnbanAccount(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        account.ClearBan();
        return Success(new AccountWrap(ToAccountSummary(account)));
    }

    private static IResult RevokeAccountTokens(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        account.ClearLoginTokens();

        return Success(new AccountWrap(ToAccountSummary(account)));
    }

    private static IResult KickAccountSession(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        var activeConnection = Listener.GetActiveConnection(uid);
        ConnectionDisconnectHelper.KickByGm(activeConnection);

        return Success(new AccountOnlineWrap(ToAccountSummary(account), activeConnection != null));
    }

    private static async Task<IResult> ResetAccountGameplay(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        if (DatabaseHelper.Instance == null)
            return Error("Database is not initialized");

        var wasOnline = await PlayerResetHelper.ResetGameplayAsync(uid);

        return Success(new AccountOnlineWrap(ToAccountSummary(account), wasOnline));
    }

    private static IResult DeleteAccount(HttpContext ctx, int uid)
    {
        if (!IsAuthorized(ctx, out var unauthorized))
            return unauthorized;

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return Error("Account not found", statusCode: StatusCodes.Status404NotFound);

        DatabaseHelper.Instance?.DeleteUidData(uid);
        return Success(new DeletedUid(uid));
    }

    private static bool IsAuthorized(HttpContext ctx, out IResult error)
    {
        if (AdminSessionManager.IsAuthorized(GetAdminToken(ctx)))
        {
            error = Success(new EmptyData());
            return true;
        }

        error = Error("Not authorized", statusCode: StatusCodes.Status401Unauthorized);
        return false;
    }

    private static string? GetAdminToken(HttpContext ctx)
    {
        var authorization = ctx.Request.Headers.Authorization.ToString();
        if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return authorization["Bearer ".Length..].Trim();

        return ctx.Request.Headers["X-Admin-Session"].FirstOrDefault();
    }

    private static List<AccountData> GetAllAccounts()
    {
        return (DatabaseHelper.GetAllInstanceFromMap<AccountData>() ?? DatabaseHelper.GetAllInstance<AccountData>() ?? [])
            .GroupBy(account => account.Uid)
            .Select(group => group.First())
            .ToList();
    }

    private static AccountSummary ToAccountSummary(AccountData account)
    {
        var player = DatabaseHelper.Instance?.GetInstance<PlayerData>(account.Uid);
        var role = account.GetRole();
        var permissionOverrides = account.GetPermissionOverrides();
        var basePermissions = account.GetBasePermissions();
        var effectivePermissions = account.GetEffectivePermissions();
        var banStatus = account.GetBanStatus();
        return new AccountSummary(
            account.Uid,
            account.Username ?? "",
            account.Email ?? "",
            account.IsEmailVerified,
            account.EmailVerifiedAt,
            player?.Name ?? "",
            player?.Level,
            account.HasPassword(),
            role,
            permissionOverrides,
            basePermissions,
            effectivePermissions,
            account.DispatchTokenExpireAt,
            account.ComboTokenExpireAt,
            Listener.GetActiveConnection(account.Uid) != null,
            banStatus.IsActive,
            banStatus.Reason,
            banStatus.ExpireAt,
            banStatus.CreatedAt,
            banStatus.IsPermanent,
            banStatus.RemainingSeconds);
    }

    private static List<OnlinePlayer> GetOnlinePlayers()
    {
        return March7thHoneyListener.GetSnapshot()
            .OfType<Connection>()
            .Where(connection => connection.Player != null && connection.State == SessionStateEnum.ACTIVE)
            .Select(connection => new OnlinePlayer(
                connection.Player!.Uid,
                connection.Player.Data.Name ?? "",
                connection.Player.Data.Level,
                connection.RemoteEndPoint.ToString(),
                connection.State.ToString()))
            .ToList();
    }

    private static string NormalizePermissions(string? permissions)
    {
        return CommandPermissions.Normalize(permissions);
    }

    private static string NormalizeRole(string? role)
    {
        return CommandRoles.NormalizeRole(role, ConfigManager.Config.ServerOption.DefaultPermissionRole,
            GetConfiguredRoles());
    }

    private static List<string> GetRoleNames()
    {
        return GetConfiguredRoles().Keys
            .OrderBy(role => role == CommandRoles.User ? 0 :
                role == CommandRoles.Moderator ? 1 :
                role == CommandRoles.Administrator ? 2 :
                role == CommandRoles.Developer ? 3 : 4)
            .ThenBy(role => role, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyDictionary<string, HashSet<string>> GetConfiguredRoles()
    {
        return ConfigManager.Config.ServerOption.PermissionRoles ?? CommandRoles.DefaultRoles();
    }

    private static IResult Success<T>(T data)
    {
        return Results.Json(new AdminResult<T>(0, "OK", data));
    }

    private static IResult Error(string message, int retcode = -201, int statusCode = StatusCodes.Status400BadRequest)
    {
        return Results.Json(new StatusResult(retcode, message), statusCode: statusCode);
    }

    private static bool TryResolveBanExpireAt(AdminBanAccountRequest request, out long expireAt, out string error)
    {
        expireAt = 0;
        error = string.Empty;

        if (request.permanent.GetValueOrDefault(true))
            return true;

        var now = Extensions.GetUnixSec();
        if (request.expire_at.HasValue)
        {
            expireAt = request.expire_at.Value;
            if (expireAt <= now)
            {
                error = "Ban expiry must be in the future";
                return false;
            }

            return true;
        }

        if (request.duration_seconds.HasValue)
        {
            if (request.duration_seconds.Value <= 0)
            {
                error = "Ban duration must be greater than zero";
                return false;
            }

            expireAt = now + request.duration_seconds.Value;
            return true;
        }

        error = "Timed bans require an expiry or duration";
        return false;
    }

    private static IReadOnlyCollection<string> GetActiveConnectionIdentityKeys(int uid)
    {
        var activeConnection = Listener.GetActiveConnection(uid);
        return activeConnection == null
            ? []
            : AccountBanHelper.BuildIdentityKeys([], activeConnection.RemoteEndPoint.Address.ToString());
    }

    private static void KickBannedConnection(int uid, AccountBanStatus banStatus)
    {
        ConnectionDisconnectHelper.KickBanned(Listener.GetActiveConnection(uid), banStatus);
    }

    public class AdminLoginRequest
    {
        public string? admin_key { get; set; }
    }

    public class AdminCreateAccountRequest
    {
        public string? username { get; set; }
        public string? email { get; set; }
        public string? password { get; set; }
        public int? uid { get; set; }
        public string? role { get; set; }
        public string? permissions { get; set; }
        public bool? email_verified { get; set; }
    }

    public class AdminUpdateAccountRequest
    {
        public string? username { get; set; }
        public string? email { get; set; }
        public string? role { get; set; }
        public string? permissions { get; set; }
        public bool? email_verified { get; set; }
    }

    public class AdminSetPasswordRequest
    {
        public string? password { get; set; }
    }

    public class AdminBanAccountRequest
    {
        public string? reason { get; set; }
        public bool? permanent { get; set; }
        public long? expire_at { get; set; }
        public int? duration_seconds { get; set; }
    }

    public class AdminExecuteCommandRequest
    {
        public string? command { get; set; }
        public int? target_uid { get; set; }
    }

    public class AdminRegistrationRequest
    {
        public bool enabled { get; set; }
    }
}
