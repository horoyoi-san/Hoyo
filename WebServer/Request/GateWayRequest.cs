namespace March7thHoney.WebServer.Request;

public class GateWayRequest
{
    public string version { get; set; } = "";
    public string t { get; set; } = "";
    public string uid { get; set; } = "";
    public string language_type { get; set; } = "";
    public string platform_type { get; set; } = "";
    public string dispatch_seed { get; set; } = "";
    public string channel_id { get; set; } = "";
    public string sub_channel_id { get; set; } = "";
    public string is_need_url { get; set; } = "";
    public string is_new_format { get; set; } = "";
    public string game_version { get; set; } = "";
    public string account_type { get; set; } = "";
    public string account_uid { get; set; } = "";
}
