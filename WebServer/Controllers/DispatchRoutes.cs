using System.Text.Json;
using Google.Protobuf;
using March7thHoney.Configuration;
using March7thHoney.Proto;
using March7thHoney.Util;
using March7thHoney.WebServer.Handler;
using March7thHoney.WebServer.Objects;
using March7thHoney.WebServer.Pages;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

public static class DispatchRoutes
{
    private static ConfigContainer Config => ConfigManager.Config;
    public static Logger Logger = new("DispatchServer");
    private static bool DispatchDebugEnabled => Config.ServerOption.LogOption.EnableGamePacketLog;

    private static void Debug(string message)
    {
        if (DispatchDebugEnabled)
            Logger.Debug(message);
    }

    private static void Debug(string message, Exception e)
    {
        if (DispatchDebugEnabled)
            Logger.Debug(message, e);
    }

    private static IResult Json(string content)
    {
        return Results.Text(content, "application/json");
    }

    public static void MapDispatchRoutes(this IEndpointRouteBuilder app)
    {
        app.MapGet("/query_dispatch", QueryDispatch);

        app.MapPost("/account/risky/api/check",
            () => Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"id\":\"none\",\"action\":\"ACTION_NONE\",\"geetest\":null}}"));

        app.MapGet("/login-platform", (HttpContext ctx) => LoginPlatform(ctx, null));
        app.MapGet("/login-platform/", (HttpContext ctx) => LoginPlatform(ctx, null));
        app.MapGet("/login-platform/{*pagePath}", (HttpContext ctx, string? pagePath) => LoginPlatform(ctx, pagePath));

        // === AUTHENTICATION ===
        app.MapPost("/account/register", Register);
        app.MapPost("/account/ma-passport/api/register", Register);
        app.MapPost("/account/ma-passport/api/webRegisterByPassword", Register);
        app.MapPost("/hkrpg_global/account/ma-passport/api/webRegisterByPassword", Register);
        app.MapPost("/{gameKey}/account/ma-passport/api/webRegisterByPassword", Register);

        app.MapPost("/account/email/send-verification", SendVerificationEmail);
        app.MapPost("/hkrpg_global/account/email/send-verification", SendVerificationEmail);
        app.MapPost("/{gameKey}/account/email/send-verification", SendVerificationEmail);

        app.MapGet("/account/email/verify", VerifyEmail);

        app.MapPost("/account/password/forgot", ForgotPassword);
        app.MapPost("/hkrpg_global/account/password/forgot", ForgotPassword);
        app.MapPost("/{gameKey}/account/password/forgot", ForgotPassword);

        app.MapPost("/account/password/reset", ResetPassword);
        app.MapPost("/hkrpg_global/account/password/reset", ResetPassword);
        app.MapPost("/{gameKey}/account/password/reset", ResetPassword);

        app.MapPost("/hkrpg_global/mdk/shield/api/login", ShieldLogin);
        app.MapPost("/{gameKey}/mdk/shield/api/login", ShieldLogin);

        app.MapPost("/hkrpg_global/account/ma-passport/api/appLoginByPassword", PassportLogin);
        app.MapPost("/{gameKey}/account/ma-passport/api/appLoginByPassword", PassportLogin);

        app.MapPost("/hkrpg_global/mdk/shield/api/verify", ShieldVerify);
        app.MapPost("/{gameKey}/mdk/shield/api/verify", ShieldVerify);

        app.MapPost("/hkrpg_global/combo/granter/login/v2/login", LoginV2);
        app.MapPost("/{gameKey}/combo/granter/login/v2/login", LoginV2);

        app.MapPost("/account/ma-cn-passport/app/loginByPassword", LegacyPassportLogin);
        app.MapPost("/account/ma-cn-session/app/verify", PassportTokenVerify);

        app.MapPost("/hkrpg_global/account/ma-passport/token/verifySToken", PassportSTokenVerify);
        app.MapPost("/{gameKey}/account/ma-passport/token/verifySToken", PassportSTokenVerify);

        app.MapMethods("/hkrpg_global/account/ma-passport/api/getConfig", ["GET", "POST"], PassportGetConfig);
        app.MapMethods("/{gameKey}/account/ma-passport/api/getConfig", ["GET", "POST"], PassportGetConfig);

        app.MapGet("/hkrpg_global/combo/granter/api/getConfig", GetConfig);
        app.MapGet("/{gameKey}/combo/granter/api/getConfig", GetConfig);

        app.MapMethods("/hkrpg_global/combo/red_dot/list", ["GET", "POST"], RedDot);
        app.MapMethods("/{gameKey}/combo/red_dot/list", ["GET", "POST"], RedDot);

        app.MapGet("/common/hkrpg_global/announcement/api/getAlertAnn", AlertAnn);
        app.MapGet("/common/{gameKey}/announcement/api/getAlertAnn", AlertAnn);

        app.MapGet("/common/hkrpg_global/announcement/api/getAlertPic", AlertPic);
        app.MapGet("/common/{gameKey}/announcement/api/getAlertPic", AlertPic);

        app.MapGet("/hkrpg_global/mdk/shield/api/loadConfig", LoadConfig);
        app.MapGet("/{gameKey}/mdk/shield/api/loadConfig", LoadConfig);

        // === EXTRA ===
        app.MapPost("/hkrpg_global/combo/granter/api/compareProtocolVersion", CompareProtocolVer);
        app.MapPost("/{gameKey}/combo/granter/api/compareProtocolVersion", CompareProtocolVer);

        app.MapGet("/hkrpg_global/mdk/agreement/api/getAgreementInfos", GetAgreementInfo);
        app.MapGet("/{gameKey}/mdk/agreement/api/getAgreementInfos", GetAgreementInfo);

        app.MapGet("/combo/box/api/config/sdk/combo", Combo);
        app.MapGet("/combo/box/api/config/sw/precache", Precache);
        app.MapGet("/device-fp/api/getFp", GetFp);
        app.MapGet("/device-fp/api/getExtList", GetExtList);
        app.MapPost("/data_abtest_api/config/experiment/list", GetExperimentList);
    }

    private static IResult QueryDispatch(HttpContext ctx)
    {
        if (!Config.ServerOption.ServerConfig.RunDispatch)
            return Results.Text(string.Empty, "text/plain");

        var publicBaseUrl = GetPublicBaseUrl(ctx);

        try
        {
            var req = ctx.Request;
            var remoteIp = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var remotePort = ctx.Connection.RemotePort;
            var ua = req.Headers.UserAgent.ToString();
            var isNewFormat = string.Equals(req.Query["is_new_format"].ToString(), "1", StringComparison.Ordinal);

            Debug($"query_dispatch begin: {req.Method} {req.Scheme}://{req.Host}{req.PathBase}{req.Path}{req.QueryString} from {remoteIp}:{remotePort} ua=\"{ua}\"");
            Debug($"query_dispatch format: is_new_format={isNewFormat}");

            foreach (var (key, value) in req.Headers.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
            {
                if (key.Equals("Authorization", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("Cookie", StringComparison.OrdinalIgnoreCase))
                {
                    Debug($"query_dispatch header: {key}=<redacted>");
                    continue;
                }

                Debug($"query_dispatch header: {key}={value.ToString()}");
            }

            foreach (var (key, value) in req.Query.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
            {
                Debug($"query_dispatch query: {key}={value.ToString()}");
            }

            Debug($"query_dispatch config: RunDispatch={Config.ServerOption.ServerConfig.RunDispatch}, RunGateway={Config.ServerOption.ServerConfig.RunGateway}, Regions={Config.ServerOption.ServerConfig.Regions.Count}");
        }
        catch (Exception e)
        {
            Debug("query_dispatch debug prelude failed", e);
        }

        // Keep the payload minimal (match LC/zig behavior): only `region_list`.
        // Some clients appear to be strict about the proto schema and may fail if extra fields are present.
        var data = new Dispatch();

        if (Config.ServerOption.ServerConfig.RunGateway)
        {
            data.RegionList.Add(new RegionInfo
            {
                Name = Config.GameServer.GameServerId,
                Title = Config.GameServer.GameServerName,
                DispatchUrl = $"{publicBaseUrl}/query_gateway",
                EnvType = Config.GameServer.EnvType.ToString(),
                DisplayName = Config.GameServer.GameServerName
            });
        }

        foreach (var region in Config.ServerOption.ServerConfig.Regions)
        {
            data.RegionList.Add(new RegionInfo
            {
                Name = region.GameServerId,
                Title = region.GameServerName,
                DisplayName = region.GameServerName,
                EnvType = region.EnvType.ToString(),
                DispatchUrl = region.GateWayAddress
            });
        }

        Logger.Info("Client request: query_dispatch");

        var bytes = data.ToByteArray();
        var b64 = Convert.ToBase64String(bytes);

        Debug($"query_dispatch result: regionCount={data.RegionList.Count}, protoBytes={bytes.Length}, base64Length={b64.Length}");
        foreach (var r in data.RegionList)
        {
            Debug($"query_dispatch region: name={r.Name} env={r.EnvType} display={r.DisplayName} url={r.DispatchUrl}");
        }

        return Results.Text(b64, "text/plain");
    }

    private static string GetPublicBaseUrl(HttpContext ctx)
    {
        var req = ctx.Request;
        var host = req.Host.Value;
        return $"{req.Scheme}://{host}{req.PathBase}".TrimEnd('/');
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var value in values)
            if (!string.IsNullOrWhiteSpace(value))
                return value;

        return null;
    }

    private static IResult LoginPlatform(HttpContext ctx, string? pagePath)
    {
        if (string.IsNullOrWhiteSpace(pagePath))
            return Results.Redirect($"/login-platform/index.html{ctx.Request.QueryString}");

        var route = NormalizeLoginPlatformPagePath(pagePath);

        if (string.IsNullOrEmpty(route) || route == "index")
            return Results.Text(LoginPlatformRouterPage.Render(), "text/html; charset=utf-8");

        if (IsLoginPlatformRegistrationRoute(route))
            return Results.Text(RegistrationPage.Render(
                Math.Max(Config.ServerOption.Auth.MinimumPasswordLength, 1),
                Config.GameServer.GameServerName,
                Config.ServerOption.Auth.RegistrationPageIcon,
                Config.ServerOption.Auth.EnableRegistration), "text/html; charset=utf-8");

        if (IsLoginPlatformPasswordResetRoute(route))
            return Results.Text(PasswordResetPage.Render(
                Math.Max(Config.ServerOption.Auth.MinimumPasswordLength, 1),
                Config.GameServer.GameServerName,
                Config.ServerOption.Auth.RegistrationPageIcon), "text/html; charset=utf-8");

        if (IsLoginPlatformForgotPasswordRoute(route))
            return Results.Text(PasswordForgotPage.Render(
                Config.GameServer.GameServerName,
                Config.ServerOption.Auth.RegistrationPageIcon), "text/html; charset=utf-8");

        return LoginPlatformNotFound();
    }

    private static IResult LoginPlatformNotFound()
    {
        return Results.Text(LoginPlatformNotFoundPage.Render(
            Config.GameServer.GameServerName,
            Config.ServerOption.Auth.RegistrationPageIcon), "text/html; charset=utf-8", null, 404);
    }

    private static string NormalizeLoginPlatformPagePath(string? pagePath)
    {
        var route = (pagePath ?? string.Empty).Trim().Replace('\\', '/').Trim('/');

        if (route.EndsWith("/index.html", StringComparison.OrdinalIgnoreCase))
            route = route[..^"/index.html".Length];

        if (route.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
            route = route[..^".html".Length];

        return route.Trim('/').ToLowerInvariant();
    }

    private static bool IsLoginPlatformRegistrationRoute(string route)
    {
        route = route.Replace('_', '-');
        var segments = route.Split('/', StringSplitOptions.RemoveEmptyEntries);

        return route is "register" or "registration" or "signup" or "sign-up" ||
               route.StartsWith("register/", StringComparison.Ordinal) ||
               route.StartsWith("registration/", StringComparison.Ordinal) ||
               route.StartsWith("signup/", StringComparison.Ordinal) ||
               route.StartsWith("sign-up/", StringComparison.Ordinal) ||
               route.EndsWith("/register", StringComparison.Ordinal) ||
               route.EndsWith("/registration", StringComparison.Ordinal) ||
               route.EndsWith("/signup", StringComparison.Ordinal) ||
               route.EndsWith("/sign-up", StringComparison.Ordinal) ||
               segments.Any(IsLoginPlatformRegistrationSegment);
    }

    private static bool IsLoginPlatformRegistrationSegment(string segment)
    {
        return segment is "register" or "registration" or "signup" or "sign-up" ||
               segment.StartsWith("register-", StringComparison.Ordinal) ||
               segment.StartsWith("registration-", StringComparison.Ordinal) ||
               segment.EndsWith("-register", StringComparison.Ordinal) ||
               segment.EndsWith("-registration", StringComparison.Ordinal) ||
               segment.EndsWith("-signup", StringComparison.Ordinal) ||
               segment.EndsWith("-sign-up", StringComparison.Ordinal);
    }

    private static bool IsLoginPlatformPasswordResetRoute(string route)
    {
        route = route.Replace('_', '-');
        var segments = route.Split('/', StringSplitOptions.RemoveEmptyEntries);

        return route is "reset-password" or "password-reset" ||
               route.StartsWith("reset-password/", StringComparison.Ordinal) ||
               route.StartsWith("password-reset/", StringComparison.Ordinal) ||
               route.EndsWith("/reset-password", StringComparison.Ordinal) ||
               route.EndsWith("/password-reset", StringComparison.Ordinal) ||
               segments.Any(segment => segment is "reset-password" or "password-reset");
    }

    private static bool IsLoginPlatformForgotPasswordRoute(string route)
    {
        route = route.Replace('_', '-');
        var segments = route.Split('/', StringSplitOptions.RemoveEmptyEntries);

        return route is "forgot-password" or "password-forgot" ||
               route.StartsWith("forgot-password/", StringComparison.Ordinal) ||
               route.StartsWith("password-forgot/", StringComparison.Ordinal) ||
               route.EndsWith("/forgot-password", StringComparison.Ordinal) ||
               route.EndsWith("/password-forgot", StringComparison.Ordinal) ||
               segments.Any(segment => segment is "forgot-password" or "password-forgot");
    }

    private static async Task<IResult> Register(HttpContext ctx, RegisterReqJson? req)
    {
        req ??= new RegisterReqJson();
        Debug($"register: username={req.username ?? req.account} email={req.email}");
        return await new RegistrationHandler().Handle(req, ctx.Request);
    }

    private static async Task<IResult> SendVerificationEmail(HttpContext ctx, SendVerificationEmailReqJson? req)
    {
        req ??= new SendVerificationEmailReqJson();
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Email, identityKeys,
                FirstNonEmpty(req.account, req.username, req.email), out var limited))
            return limited;

        return await new AccountRecoveryHandler().SendVerificationEmail(req, ctx.Request);
    }

    private static IResult VerifyEmail(string? uid, string? token)
    {
        return new AccountRecoveryHandler().VerifyEmail(uid, token);
    }

    private static async Task<IResult> ForgotPassword(HttpContext ctx, ForgotPasswordReqJson? req)
    {
        req ??= new ForgotPasswordReqJson();
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Email, identityKeys,
                FirstNonEmpty(req.account, req.username, req.email), out var limited))
            return limited;

        return await new AccountRecoveryHandler().ForgotPassword(req, ctx.Request);
    }

    private static IResult ResetPassword(HttpContext ctx, ResetPasswordReqJson? req)
    {
        req ??= new ResetPasswordReqJson();
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Email, identityKeys, req.uid, out var limited))
            return limited;

        return new AccountRecoveryHandler().ResetPassword(req);
    }

    private static IResult ShieldLogin(HttpContext ctx, LoginReqJson req)
    {
        Debug($"shield login: account={req.account} is_crypto={req.is_crypto}");
        var useRsa = Config.WebSecurity.EnableRsaLoginDecrypt && req.is_crypto;
        var (account, password, decryptFailed) = LoginCryptoHelper.TryDecryptCredentialsStrict(req.account, req.password, useRsa);
        if (decryptFailed)
            return Results.Json(LoginResJson.Error(-202, "Invalid login data"));
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request, req.device, req.device_id, req.device_fp);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Login, identityKeys, account, out var limited))
            return limited;

        return new UsernameLoginHandler().HandleShieldLogin(account, password, identityKeys);
    }

    private static IResult PassportLogin(HttpContext ctx, PassportLoginReqJson req)
    {
        Debug($"appLoginByPassword: account={req.account}");
        var (account, password) =
            LoginCryptoHelper.TryDecryptCredentials(req.account, req.password, Config.WebSecurity.EnableRsaLoginDecrypt);
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request, req.device, req.device_id, req.device_fp);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Login, identityKeys, account, out var limited))
            return limited;

        return new UsernameLoginHandler().HandlePassportLogin(account, password, identityKeys);
    }

    private static IResult ShieldVerify(HttpContext ctx, VerifyReqJson req)
    {
        Debug($"shield verify: uid={req.uid} token_len={(req.token?.Length ?? 0)}");
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        return new TokenLoginHandler().HandleShieldVerify(req.uid!, req.token!, identityKeys);
    }

    private static IResult LoginV2(HttpContext ctx, LoginV2ReqJson req)
    {
        Debug($"combo login v2: app_id={req.app_id} channel_id={req.channel_id} data_len={(req.data?.Length ?? 0)}");
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request, req.device, req.data);
        return new ComboTokenGranterHandler().Handle(req.app_id, req.channel_id, req.data!, req.device!, req.sign!,
            identityKeys);
    }

    private static IResult LegacyPassportLogin(HttpContext ctx, PassportLoginReqJson req)
    {
        Debug($"ma loginByPassword: account={req.account}");
        var (account, password) =
            LoginCryptoHelper.TryDecryptCredentials(req.account, req.password, Config.WebSecurity.EnableRsaLoginDecrypt);
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request, req.device, req.device_id, req.device_fp);
        if (AuthRateLimiter.TryReject(ctx, AuthRateLimitAction.Login, identityKeys, account, out var limited))
            return limited;

        return new UsernameLoginHandler().HandleLegacyPassportLogin(account, password, identityKeys);
    }

    private static IResult PassportTokenVerify(HttpContext ctx, PassportTokenVerifyReqJson req)
    {
        Debug($"ma verify: mid={req.mid}, token_len={(req.token.token?.Length ?? 0)} refresh={req.refresh}");
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        return new TokenLoginHandler().HandlePassportVerify(req.mid!, req.token.token!, req.refresh, identityKeys);
    }

    private static IResult PassportSTokenVerify(HttpContext ctx, PassportSTokenVerifyReqJson? req)
    {
        req ??= new PassportSTokenVerifyReqJson();
        var mid = req.mid ?? string.Empty;
        var stoken = req.stoken ?? string.Empty;
        var identityKeys = LoginIdentityContextFactory.Build(ctx.Request);
        return new TokenLoginHandler().HandlePassportVerify(mid, stoken, req.refresh, identityKeys);
    }

    private static IResult PassportGetConfig()
    {
        return Json(JsonSerializer.Serialize(
            new PassportConfigResult(0, "OK", new PassportConfigData(false, false, false)),
            WebJsonContext.Default.PassportConfigResult));
    }

    private static IResult GetConfig()
    {
        return Json(
            "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"protocol\":true,\"qr_enabled\":false,\"log_level\":\"INFO\",\"announce_url\":\"\",\"push_alias_type\":0,\"disable_ysdk_guard\":true,\"enable_announce_pic_popup\":false,\"app_name\":\"崩�??RPG\",\"qr_enabled_apps\":{\"bbs\":false,\"cloud\":false},\"qr_app_icons\":{\"app\":\"\",\"bbs\":\"\",\"cloud\":\"\"},\"qr_cloud_display_name\":\"\",\"enable_user_center\":true,\"functional_switch_configs\":{}}}");
    }

    private static IResult RedDot()
    {
        return Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"infos\":[]}}");
    }

    private static IResult AlertAnn()
    {
        return Json(
            "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"alert\":false,\"alert_id\":0,\"remind\":false,\"extra_remind\":false}}");
    }

    private static IResult AlertPic()
    {
        return Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"total\":0,\"list\":[]}}");
    }

    private static IResult LoadConfig()
    {
        var gameTokenExpiresIn = Math.Max(Config.ServerOption.Auth.ComboTokenExpireMinutes, 1) * 60;

        var tp = new ThirdpartyLoginConfig("TK_GAME_TOKEN", gameTokenExpiresIn);
        var data = new LoadConfigData(
            24, "hkrpg_global", "PC", "I_IDENTITY", false, "",
            "S_NORMAL", "崩�??RPG", !Config.ServerOption.Auth.EnableRegistration, false,
            ["fb", "tw", "gl", "ap"], false, false, [], false,
            new ThirdpartyLoginConfigs(tp, tp, tp, tp), false, false,
            [], false, false);

        return Json(JsonSerializer.Serialize(new LoadConfigResult(0, "OK", data),
            WebJsonContext.Default.LoadConfigResult));
    }

    private static IResult CompareProtocolVer()
    {
        return Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"modified\":false,\"protocol\":null}}");
    }

    private static IResult GetAgreementInfo()
    {
        return Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"marketing_agreements\":[]}}");
    }

    private static IResult Combo()
    {
        return Json(
            "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"vals\":{\"kibana_pc_config\":\"{ \\\"enable\\\": 0, \\\"level\\\": \\\"Info\\\",\\\"modules\\\": [\\\"download\\\"] }\\n\",\"network_report_config\":\"{ \\\"enable\\\": 0, \\\"status_codes\\\": [206], \\\"url_paths\\\": [\\\"dataUpload\\\", \\\"red_dot\\\"] }\\n\",\"list_price_tierv2_enable\":\"false\\n\",\"pay_payco_centered_host\":\"bill.payco.com\",\"telemetry_config\":\"{\\n \\\"dataupload_enable\\\": 0,\\n}\",\"enable_web_dpi\":\"true\"}}}");
    }

    private static IResult Precache()
    {
        return Json("{\"retcode\":0,\"message\":\"OK\",\"data\":{\"vals\":{\"url\":\"\",\"enable\":\"false\"}}}");
    }

    private static IResult GetFp(string device_fp)
    {
        return new FingerprintHandler().GetFp(device_fp);
    }

    private static IResult GetExtList()
    {
        return Json(
            "{\"retcode\":0,\"message\":\"OK\",\"data\":{\"code\":200,\"msg\":\"ok\",\"ext_list\":[],\"pkg_list\":[],\"pkg_str\":\"/vK5WTh5SS3SAj8Zm0qPWg==\"}}");
    }

    private static IResult GetExperimentList()
    {
        return Json(
            "{\"retcode\":0,\"success\":true,\"message\":\"\",\"data\":[{\"code\":1000,\"type\":2,\"config_id\":\"14\",\"period_id\":\"6125_197\",\"version\":\"1\",\"configs\":{\"cardType\":\"direct\"}}]}");
    }
}
