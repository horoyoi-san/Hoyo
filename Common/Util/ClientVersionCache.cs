namespace March7thHoney.Util;

public static class ClientVersionCache
{
    private static string _latestVersion = "";

    public static string LatestVersion => _latestVersion;

    public static void Update(string version)
    {
        if (string.IsNullOrWhiteSpace(version)) return;
        _latestVersion = version.Trim();
    }
}
