using System.Text.Json.Serialization;
using March7thHoney.Enums;

namespace March7thHoney.Configuration;

public class HotfixContainer
{
    [JsonConverter(typeof(JsonStringEnumConverter<BaseRegionEnum>))]
    public BaseRegionEnum Region { get; set; } = BaseRegionEnum.None;

    public Dictionary<string, DownloadUrlConfig> HotfixData { get; set; } = [];
}

public class DownloadUrlConfig
{
    public string AssetBundleUrl { get; set; } = "";
    public string ExAssetBundleUrl { get; set; } = "";
    public string ExResourceUrl { get; set; } = "";
    public string LuaUrl { get; set; } = "";
    public string IfixUrl { get; set; } = "";
}

public static class GateWayBaseUrl
{
    public const string CNBETA_DISPATCH = "https://globaldp-beta-cn01.bhsr.com/query_dispatch";
    public const string CNPROD_DISPATCH = "https://globaldp-prod-cn01.bhsr.com/query_dispatch";
    public const string OSBETA_DISPATCH = "https://globaldp-beta-os01.starrails.com/query_dispatch";
    public const string OSPROD_DISPATCH = "https://globaldp-prod-os01.starrails.com/query_dispatch";
    public const string CNBETA = "https://beta-release01-cn.bhsr.com/query_gateway";
    public const string CNPROD = "https://prod-gf-cn-dp01.bhsr.com/query_gateway";
    public const string OSBETA = "https://beta-release01-asia.starrails.com/query_gateway";
    public const string OSPROD = "https://prod-official-asia-dp01.starrails.com/query_gateway";
}

public static class BaseUrl
{
    public const string CN = "https://autopatchcn.bhsr.com/";
    public const string OS = "https://autopatchos.starrails.com/";
}
