using March7thHoney.Configuration;
using March7thHoney.Data;
using March7thHoney.Database.Account;
using March7thHoney.Internationalization;
using March7thHoney.Proto;
using March7thHoney.Util;
using March7thHoney.WebServer.Request;
using Google.Protobuf;

namespace March7thHoney.WebServer.Handler;

internal class QueryGatewayHandler
{
    private static readonly string[] VersionBranches =
        ["PREbeta", "BETA", "PROD", "DEV", "PRE", "GM", "CECREATION"];
    private static readonly string[] VersionPlatforms = ["Win", "Android", "iOS"];
    public static Logger Logger = new("GatewayServer");
    private static bool GatewayDebugEnabled => ConfigManager.Config.ServerOption.LogOption.EnableGamePacketLog;
    private static void Debug(string message)
    {
        if (GatewayDebugEnabled)
            Logger.Debug(message);
    }

    public string Data;

    public QueryGatewayHandler(GateWayRequest req)
    {
        var config = ConfigManager.Config;

        var isNewFormat = string.Equals(req.is_new_format, "1", StringComparison.Ordinal);
        Debug($"query_gateway begin: version={req.version} uid={req.uid} lang={req.language_type} platform={req.platform_type} channel={req.channel_id}/{req.sub_channel_id} is_new_format={isNewFormat}");

        ClientVersionCache.Update(req.version);

        var gateServer = new GateServer
        {
            RegionName = config.GameServer.GameServerId,
            Ip = config.GameServer.PublicAddress,
            Port = config.GameServer.Port,
        };

        var accessVerificationMessage = GetAccessVerificationMessage(req);
        if (!string.IsNullOrWhiteSpace(accessVerificationMessage))
            gateServer.LoginWhiteMsg = accessVerificationMessage;

        // 4.4: GateServer 旧的 Unk1/Unk2/MdkResVersion/IfixVersion 字段已移除；msg 改名为 LoginWhiteMsg。
        // 4.4 客户端需要这些 bool 标志才能正常进门；唯独 UseTcp 必须保持关闭 (星铁私服走 KCP，UseTcp=true 才是 TCP)。
        gateServer.EnableDesignDataBundleVersionUpdate = true;
        gateServer.EnableVideoBundleVersionUpdate = true;
        gateServer.WatermarkEnable = true;
        gateServer.EnableUploadBattleLog = true;
        gateServer.FtcSwitch = true;
        gateServer.EnableSaveReplayFile = true;
        gateServer.AndroidMiddlePackageEnable = true;
        gateServer.CloseRedeemCode = true;
        gateServer.IosExam = true;
        gateServer.MtpSwitch = true;
        gateServer.EventTrackingOpen = true;
        gateServer.ForbidRecharge = true;
        gateServer.NetworkDiagnostic = true;
        gateServer.NNFLHCGDGJM = true;
        gateServer.FMLPNNMJDIC = true;
        // gateServer.UseTcp 保持默认 false = KCP

        if (ConfigManager.Config.GameServer.UsePacketEncryption)
            gateServer.ClientSecretKey = Convert.ToBase64String(Crypto.ClientSecretKey!.GetBytes());

        var baseUrl = req.version.StartsWith("CN", StringComparison.OrdinalIgnoreCase) ? BaseUrl.CN : BaseUrl.OS;

        var remoteHotfixSuccess = false;
        if (ConfigManager.Config.HttpServer.SendHotfix && ConfigManager.Config.HttpServer.UseFetchRemoteHotfix)
        {
            remoteHotfixSuccess = FetchRemoteHotfix(req, gateServer).GetAwaiter().GetResult();
        }

        if (ConfigManager.Config.HttpServer.SendHotfix)
        {
            if (!remoteHotfixSuccess) UseLocalHotfix(req, baseUrl, gateServer);
        }
        else
        {
            SetEmptyHotfix(gateServer);
        }

        if (!ResourceManager.IsLoaded)
        {
            Logger.Warn("query_gateway requested before ResourceManager finished loading; returning retcode=0 for client compatibility");
        }

        Logger.Info("Client request: query_gateway");

        var bytes = gateServer.ToByteArray();
        Data = Convert.ToBase64String(bytes);

        Debug(
            $"query_gateway result: protoBytes={bytes.Length}, base64Length={Data.Length}, retcode={gateServer.Retcode}, msg_len={gateServer.LoginWhiteMsg.Length}");
        Debug($"query_gateway gate: region={gateServer.RegionName} ip={gateServer.Ip} port={gateServer.Port} encryption={(gateServer.ClientSecretKey?.Length ?? 0) > 0}");
        Debug($"query_gateway hotfix: ab={gateServer.AssetBundleUrl} exRes={gateServer.ExResourceUrl} lua={gateServer.LuaUrl} ifix={gateServer.IfixUrl}");
    }

    private async Task<bool> FetchRemoteHotfix(GateWayRequest req, GateServer gateServer)
    {
        var remoteGateServer = await FetchRemoteHotfixForVersion(req, req.version);
        if (remoteGateServer == null) return false;

        ApplyHotfix(gateServer, remoteGateServer);
        PersistHotfixForPlatforms(req.version, remoteGateServer);

        var peerVersion = GetPeerRegionVersion(req.version);
        if (peerVersion != null)
        {
            var peerGateServer = await FetchRemoteHotfixForVersion(req, peerVersion);
            if (peerGateServer != null) PersistHotfixForPlatforms(peerVersion, peerGateServer);
        }

        return true;
    }

    private async Task<GateServer?> FetchRemoteHotfixForVersion(GateWayRequest req, string version)
    {
        try
        {
            var gatewayUrl = await GetGatewayUrlByVersion(version);
            var queryParams = new Dictionary<string, string>
            {
                ["version"] = version,
                ["language_type"] = ValueOrDefault(req.language_type, "3"),
                ["platform_type"] = ValueOrDefault(req.platform_type, "1"),
                ["dispatch_seed"] = req.dispatch_seed,
                ["channel_id"] = ValueOrDefault(req.channel_id, "1"),
                ["sub_channel_id"] = ValueOrDefault(req.sub_channel_id, "1"),
                ["is_need_url"] = ValueOrDefault(req.is_need_url, "1")
            };

            var queryString = BuildQueryString(queryParams);
            var fullUrl = $"{gatewayUrl}?{queryString}";

            var (statusCode, response) = await HttpNetwork.SendGetRequest(fullUrl, 5);

            if (statusCode == 200 && !string.IsNullOrEmpty(response))
            {
                try
                {
                    var bytes = Convert.FromBase64String(response);
                    var remoteGateServer = GateServer.Parser.ParseFrom(bytes);

                    if (HasHotfixUrl(remoteGateServer)) return remoteGateServer;

                    Logger.Warn($"Remote hotfix returned no URL for {version} (retcode={remoteGateServer.Retcode})");
                }
                catch (Exception ex)
                {
                    Logger.Warn($"Failed to parse remote hotfix response: {ex.Message}");
                }
            }
            else
            {
                Logger.Warn($"Remote hotfix request failed with status: {statusCode}");
            }
        }
        catch (Exception ex)
        {
            Logger.Warn($"Remote hotfix fetch failed: {ex.Message}");
        }

        return null;
    }

    private static void ApplyHotfix(GateServer target, GateServer source)
    {
        target.AssetBundleUrl = source.AssetBundleUrl;
        target.AssetBundleUrlAndroid = source.AssetBundleUrlAndroid;
        target.ExResourceUrl = source.ExResourceUrl;
        target.LuaUrl = source.LuaUrl;
        target.IfixUrl = source.IfixUrl;
    }

    private static void PersistHotfixForPlatforms(string version, GateServer remoteGateServer)
    {
        try
        {
            var versions = GetSameRegionPlatformVersions(version);
            var changedCount = ConfigManager.UpdateHotfixData(versions, new DownloadUrlConfig
            {
                AssetBundleUrl = remoteGateServer.AssetBundleUrl,
                ExAssetBundleUrl = remoteGateServer.AssetBundleUrlAndroid,
                ExResourceUrl = remoteGateServer.ExResourceUrl,
                LuaUrl = remoteGateServer.LuaUrl,
                IfixUrl = remoteGateServer.IfixUrl
            });
            if (changedCount > 0)
                Logger.Info($"Saved remote hotfix for versions: {string.Join(", ", versions)}");
        }
        catch (Exception ex)
        {
            Logger.Warn($"Failed to persist remote hotfix for {version}: {ex.Message}");
        }
    }

    private void UseLocalHotfix(GateWayRequest req, string baseUrl, GateServer gateServer)
    {
        ConfigManager.TryGetHotfixData(req.version, out var urls);

        if (urls != null)
        {
            gateServer.AssetBundleUrl = NormalizeHotfixUrl(baseUrl, urls.AssetBundleUrl);
            gateServer.AssetBundleUrlAndroid = NormalizeHotfixUrl(baseUrl, urls.ExAssetBundleUrl);
            gateServer.ExResourceUrl = NormalizeHotfixUrl(baseUrl, urls.ExResourceUrl);
            gateServer.LuaUrl = NormalizeHotfixUrl(baseUrl, urls.LuaUrl);
            gateServer.IfixUrl = NormalizeHotfixUrl(baseUrl, urls.IfixUrl);
        }
        else
        {
            Logger.Warn($"No local hotfix found for version: {req.version}");
        }
    }

    private static string NormalizeHotfixUrl(string baseUrl, string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        if (value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        if (value.StartsWith("/", StringComparison.Ordinal)) return baseUrl.TrimEnd('/') + value;
        return baseUrl.TrimEnd('/') + "/" + value;
    }

    private static void SetEmptyHotfix(GateServer gateServer)
    {
        gateServer.AssetBundleUrl = string.Empty;
        gateServer.AssetBundleUrlAndroid = string.Empty;
        gateServer.ExResourceUrl = string.Empty;
        gateServer.LuaUrl = string.Empty;
        gateServer.IfixUrl = string.Empty;
    }

    private static string GetAccessVerificationMessage(GateWayRequest req)
    {
        var accountUid = string.IsNullOrWhiteSpace(req.account_uid) ? req.uid : req.account_uid;
        if (int.TryParse(accountUid, out var uid))
        {
            var account = AccountData.GetAccountByUid(uid);
            if (account != null && AccountBanHelper.TryGetActiveBan(account, [], out var banStatus))
                return banStatus.FormatLoginMessage();

            if (account != null && !account.CanLogin())
                return ConfigManager.Config.ServerOption.Auth.EmailVerificationRequiredMessage;
        }

        return string.Empty;
    }

    private async Task<string> GetGatewayUrlByVersion(string version)
    {
        var fallback = GetFallbackGatewayUrlByVersion(version);

        try
        {
            var queryParams = new Dictionary<string, string>
            {
                ["version"] = version,
                ["language_type"] = "3",
                ["platform_type"] = "3",
                ["channel_id"] = "1",
                ["sub_channel_id"] = "1",
                ["is_new_format"] = "1"
            };
            var dispatchUrl = GetDispatchUrlByVersion(version);
            var (statusCode, response) = await HttpNetwork.SendGetRequest(
                $"{dispatchUrl}?{BuildQueryString(queryParams)}", 5);

            if (statusCode != 200 || string.IsNullOrWhiteSpace(response))
            {
                Logger.Warn($"Remote dispatch request failed with status: {statusCode}, use fallback gateway");
                return fallback;
            }

            var dispatch = Dispatch.Parser.ParseFrom(Convert.FromBase64String(response));
            var region = SelectPreferredRegion(dispatch, version);
            if (region == null || string.IsNullOrWhiteSpace(region.DispatchUrl))
            {
                Logger.Warn("Remote dispatch returned no usable gateway, use fallback gateway");
                return fallback;
            }

            Debug($"Remote dispatch selected gateway: region={region.Name} url={region.DispatchUrl}");
            return region.DispatchUrl;
        }
        catch (Exception ex)
        {
            Logger.Warn($"Remote dispatch lookup failed: {ex.Message}; use fallback gateway");
            return fallback;
        }
    }

    private static RegionInfo? SelectPreferredRegion(Dispatch dispatch, string version)
    {
        var regions = dispatch.RegionList.Where(region => !string.IsNullOrWhiteSpace(region.DispatchUrl));
        if (version.StartsWith("OS", StringComparison.OrdinalIgnoreCase))
            return regions.FirstOrDefault(region =>
                       region.Name.Contains("asia", StringComparison.OrdinalIgnoreCase))
                   ?? regions.FirstOrDefault();

        return regions.FirstOrDefault();
    }

    private static string GetDispatchUrlByVersion(string version)
    {
        if (version.Contains("CNBETA", StringComparison.OrdinalIgnoreCase))
            return GateWayBaseUrl.CNBETA_DISPATCH;
        if (version.Contains("CNPROD", StringComparison.OrdinalIgnoreCase))
            return GateWayBaseUrl.CNPROD_DISPATCH;
        if (version.Contains("OSBETA", StringComparison.OrdinalIgnoreCase))
            return GateWayBaseUrl.OSBETA_DISPATCH;
        return GateWayBaseUrl.OSPROD_DISPATCH;
    }

    private static string GetFallbackGatewayUrlByVersion(string version)
    {
        if (version.Contains("CNPROD", StringComparison.OrdinalIgnoreCase))
        {
            return GateWayBaseUrl.CNPROD;
        }
        else if (version.Contains("CNBETA", StringComparison.OrdinalIgnoreCase))
        {
            return GateWayBaseUrl.CNBETA;
        }
        else if (version.Contains("OSPROD", StringComparison.OrdinalIgnoreCase))
        {
            return GateWayBaseUrl.OSPROD;
        }
        else if (version.Contains("OSBETA", StringComparison.OrdinalIgnoreCase))
        {
            return GateWayBaseUrl.OSBETA;
        }

        var region = version[..2];
        return region.Equals("CN", StringComparison.OrdinalIgnoreCase) ? GateWayBaseUrl.CNPROD : GateWayBaseUrl.OSPROD;
    }

    private static bool HasHotfixUrl(GateServer gateServer)
    {
        return !string.IsNullOrWhiteSpace(gateServer.AssetBundleUrl)
               || !string.IsNullOrWhiteSpace(gateServer.AssetBundleUrlAndroid)
               || !string.IsNullOrWhiteSpace(gateServer.ExResourceUrl)
               || !string.IsNullOrWhiteSpace(gateServer.LuaUrl)
               || !string.IsNullOrWhiteSpace(gateServer.IfixUrl);
    }

    private static string BuildQueryString(IEnumerable<KeyValuePair<string, string>> parameters)
    {
        return string.Join("&", parameters.Select(pair =>
            $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
    }

    private static string ValueOrDefault(string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value;
    }

    private static string[] GetSameRegionPlatformVersions(string version)
    {
        if (!TryParseVersion(version, out var region, out var branch, out _, out var number))
            return [version];

        return VersionPlatforms.Select(platform => $"{region}{branch}{platform}{number}").ToArray();
    }

    private static string? GetPeerRegionVersion(string version)
    {
        if (!TryParseVersion(version, out var region, out var branch, out var platform, out var number)
            || !branch.Equals("BETA", StringComparison.OrdinalIgnoreCase))
            return null;

        var peerRegion = region.Equals("CN", StringComparison.OrdinalIgnoreCase) ? "OS" : "CN";
        return $"{peerRegion}{branch}{platform}{number}";
    }

    private static bool TryParseVersion(string version, out string region, out string branch,
        out string platform, out string number)
    {
        region = version.StartsWith("CN", StringComparison.OrdinalIgnoreCase) ? "CN"
            : version.StartsWith("OS", StringComparison.OrdinalIgnoreCase) ? "OS" : string.Empty;
        branch = string.Empty;
        platform = string.Empty;
        number = string.Empty;
        if (region.Length == 0) return false;

        var remainder = version[2..];
        branch = VersionBranches.FirstOrDefault(candidate =>
            remainder.StartsWith(candidate, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
        if (branch.Length == 0) return false;

        remainder = remainder[branch.Length..];
        platform = VersionPlatforms.FirstOrDefault(candidate =>
            remainder.StartsWith(candidate, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
        if (platform.Length == 0) return false;

        number = remainder[platform.Length..];
        return number.Length > 0;
    }
}
