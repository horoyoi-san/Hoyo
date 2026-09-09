using March7thHoney.Command;
using March7thHoney.Util;
using System.Text.Json.Serialization;

namespace March7thHoney.Configuration;

public class ConfigContainer
{
    public HttpServerConfig HttpServer { get; set; } = new();
    public KeyStoreConfig KeyStore { get; set; } = new();
    public GameServerConfig GameServer { get; set; } = new();
    public PathConfig Path { get; set; } = new();
    public DatabaseConfig Database { get; set; } = new();
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public LifecycleNotificationConfig? LifecycleNotification { get; set; }
    public ServerOption ServerOption { get; set; } = new();
    public MuipServerConfig MuipServer { get; set; } = new();
    public WebSecurityConfig WebSecurity { get; set; } = new();
}

public class LifecycleNotificationConfig
{
    public bool Enabled { get; set; } = false;
    public int ControlApiPort { get; set; } = 3101;
    public string ControlApiToken { get; set; } = "";
}

public class HttpServerConfig
{
    public string BindAddress { get; set; } = "0.0.0.0";
    public string PublicAddress { get; set; } = "127.0.0.1";
    public int Port { get; set; } = 21000;
    public bool UseSSL { get; set; } = false;
    public bool SendHotfix { get; set; } = true;
    public bool UseFetchRemoteHotfix { get; set; } = true;

    public string GetDisplayAddress()
    {
        return (UseSSL ? "https" : "http") + "://" + PublicAddress + ":" + Port;
    }

    public string GetBindDisplayAddress()
    {
        return (UseSSL ? "https" : "http") + "://" + BindAddress + ":" + Port;
    }
}

public class KeyStoreConfig
{
    public string KeyStorePath { get; set; } = "certificate.p12";
    public string KeyStorePassword { get; set; } = "123456";
}

public class GameServerConfig
{
    public string BindAddress { get; set; } = "0.0.0.0";
    public string PublicAddress { get; set; } = "127.0.0.1";
    public uint Port { get; set; } = 23301;
    public string GameServerId { get; set; } = "March7th_Honey";
    public string GameServerName { get; set; } = "March7thHoney";
    public string GameServerDescription { get; set; } = "A re-implementation of StarRail server";
    public int EnvType { get; set; } = 2;
    public bool UsePacketEncryption { get; set; } = true;

    public string GetDisplayAddress()
    {
        return PublicAddress + ":" + Port;
    }
}

public class PathConfig
{
    public string ResourcePath { get; set; } = "Resources";
    public List<string> ExcelOutputDirs { get; set; } = ["ExcelOutput", "ExcelOutputGameCore"];
    public string ConfigPath { get; set; } = "Config";
    public string DatabasePath { get; set; } = "Config/Database";
    public string LogPath { get; set; } = "Config/Logs";
    public string LanguagePath { get; set; } = "Config/Languages";
}

public class DatabaseConfig
{
    public string DatabaseType { get; set; } = "sqlite";
    public string DatabaseName { get; set; } = "March7thHoney.db";
    public string MySqlHost { get; set; } = "127.0.0.1";
    public int MySqlPort { get; set; } = 3306;
    public string MySqlUser { get; set; } = "root";
    public string MySqlPassword { get; set; } = "123456";
    public string MySqlDatabase { get; set; } = "March7thHoney";
}

public class ServerOption
{
    public string DefaultNickname { get; set; } = "Trailblazer";
    public int StartTrailblazerLevel { get; set; } = 1;
    public bool AutoUpgradeWorldLevel { get; set; } = true;
    public bool EnableMission { get; set; } = false; // experimental
    public bool EnableQuest { get; set; } = true; // experimental
    public bool AutoLightSection { get; set; } = true;
    public string Language { get; set; } = "EN";
    public string FallbackLanguage { get; set; } = "EN";
    public string DefaultPermissionRole { get; set; } = CommandRoles.User;
    public Dictionary<string, HashSet<string>> PermissionRoles { get; set; } = CommandRoles.DefaultRoles();
    public HashSet<string> DefaultPermissions { get; set; } = ["*"];
    public ServerAnnounce ServerAnnounce { get; set; } = new();
    public ServerProfile ServerProfile { get; set; } = new();
    public WatermarkConfig Watermark { get; set; } = new();
    public NetStatusConfig NetStatus { get; set; } = new();
    public ChallengePeakOption ChallengePeak { get; set; } = new();
    public AuthOption Auth { get; set; } = new();
    public bool AutoCreateUser { get; set; } = false;
    public LogOption LogOption { get; set; } = new();
    public ServerConfig ServerConfig { get; set; } = new();
    public int FarmingDropRate { get; set; } = 1;
    public bool UseCache { get; set; } = true;

    // Load Excel tables for paused gameplay modules (MatchThree / Marble / Cake).
    public bool LoadPausedModuleData { get; set; } = false;

    public bool EnableMonthCard { get; set; } = true;

    // Show the Oneiric Shard tiers and grant them instantly instead of running the real SDK payment.
    public bool EnableFakeRecharge { get; set; } = true;
    public ServerTimeOption ServerTime { get; set; } = new();
    public WelcomeMailConfig WelcomeMail { get; set; } = new();

    public int ValidFarmingDropRate()
    {
        return Math.Max(Math.Min(FarmingDropRate, 999), 1);
    }
}

public class NetStatusConfig
{
    public bool Enabled { get; set; } = false;
    public int LatencyMs { get; set; } = 37;
    public string Color { get; set; } = "#FEC6DF";

    public bool TryGetColor(out int rgb)
    {
        rgb = 0;
        var color = Color?.Trim();
        return LatencyMs >= 0 && color is { Length: 7 } && color[0] == '#' &&
               int.TryParse(color.AsSpan(1), System.Globalization.NumberStyles.AllowHexSpecifier,
                   System.Globalization.CultureInfo.InvariantCulture, out rgb);
    }
}

public class ChallengePeakOption
{
    public bool RequireKnightClearsForNormalBoss { get; set; } = false;
}

public class WatermarkConfig
{
    public bool Enabled { get; set; } = true;
    public string Line1Template { get; set; } = "{nickname}｜{serverName}";
    public string Line2Template { get; set; } = "{version}｜ {uid}";
    public double FontSize { get; set; } = 76.0;
    public bool UseGradient { get; set; } = true;
    public string GradientStartColor { get; set; } = "#54C3F7";
    public string GradientEndColor { get; set; } = "#C673AA";
}

public class AuthOption
{
    public int MinimumPasswordLength { get; set; } = 8;
    public int PasswordHashIterations { get; set; } = 600000;
    public int DispatchTokenExpireMinutes { get; set; } = 43200;
    public int ComboTokenExpireMinutes { get; set; } = 43200;
    public bool EnableRegistration { get; set; } = true;
    public string RegistrationPageIcon { get; set; } = "M7";
    public bool SendVerificationEmailOnRegister { get; set; } = true;
    public bool RequireVerifiedEmailForLogin { get; set; } = false;
    public string EmailVerificationRequiredMessage { get; set; } =
        "Email verification required. Please check your inbox and verify your account before entering the server.";
    public int EmailVerificationTokenExpireMinutes { get; set; } = 1440;
    public int PasswordResetTokenExpireMinutes { get; set; } = 60;
    public EmailOption Email { get; set; } = new();
    public AntiAbuseOption AntiAbuse { get; set; } = new();
}

public class AntiAbuseOption
{
    public bool RateLimitEnabled { get; set; } = true;
    public int RateLimitMaxRequests { get; set; } = 10;
    public int RateLimitWindowSeconds { get; set; } = 60;
    public int RateLimitBlockSeconds { get; set; } = 900;
    public bool LimitRegistrationPerIdentity { get; set; } = true;
    public string RegistrationIdentityMode { get; set; } = "DeviceOrIp";
    public bool RequireRegistrationIdentity { get; set; } = false;
    public bool LoginRateLimitEnabled { get; set; } = true;
    public int LoginRateLimitMaxRequests { get; set; } = 8;
    public int LoginRateLimitWindowSeconds { get; set; } = 900;
    public int LoginRateLimitBlockSeconds { get; set; } = 900;
    public bool EmailRateLimitEnabled { get; set; } = true;
    public int EmailRateLimitMaxRequests { get; set; } = 3;
    public int EmailRateLimitWindowSeconds { get; set; } = 3600;
    public int EmailRateLimitBlockSeconds { get; set; } = 900;
}

public class EmailOption
{
    public bool Enabled { get; set; } = false;
    public string PublicBaseUrl { get; set; } = "";
    public string LogoUrl { get; set; } = "https://img.hoyotoon.com/raw/hoyotoonlogolong.png";
    public SmtpOption Smtp { get; set; } = new();
    public string VerificationSubject { get; set; } = "Verify your {serverName} account";
    public string VerificationBody { get; set; } =
        "Hi {username},\n\nYou are adding email security verification for {serverName}.\n\nVerify your email here:\n{link}\n\nPlease complete the account verification process in {minutes} minutes.\n\nThis is an automated email. Please do not reply.";
    public string PasswordResetSubject { get; set; } = "Reset your {serverName} password";
    public string PasswordResetBody { get; set; } =
        "Hi {username},\n\nWe received a request to reset the password for your {serverName} account.\n\nReset your password here:\n{link}\n\nPlease complete the password reset process in {minutes} minutes.\n\nThis is an automated email. Please do not reply.";
}

public class SmtpOption
{
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "March7thHoney";
}

public class WelcomeMailConfig
{
    public bool Enabled { get; set; } = true;
    public string Sender { get; set; } = "March7thHoney";
    public string Title { get; set; } = "Welcome";
    public string Content { get; set; } = "Welcome, {username}!";
    public int TemplateId { get; set; } = 0;
    public int ExpireDays { get; set; } = 30;
    public bool IsStar { get; set; } = false;
    public List<WelcomeMailItemConfig> Items { get; set; } = [];
}

public class WelcomeMailItemConfig
{
    public int ItemId { get; set; }
    public int Count { get; set; }
    public int Rank { get; set; }
    public int Level { get; set; } = 1;
    public int Promotion { get; set; } = 0;
    public int TalentLevel { get; set; }
}

public class ServerTimeOption
{
    public bool EnableFakeServerTime { get; set; } = false;
    // yyyy-MM-dd or "today"
    public string FixedDate { get; set; } = "2026-05-12";
}

public class ServerConfig
{
    public bool RunDispatch { get; set; } = true;
    public string FromDispatchBaseUrl { get; set; } = "";
    public string ServerExchangeSecret { get; set; } = "";
    public bool RunGateway { get; set; } = true; // if run gateway, also run game server
    public List<ServerRegion> Regions { get; set; } = [];
}

public class ServerRegion
{
    public string GateWayAddress { get; set; } = "";
    public string GameServerName { get; set; } = "";
    public string GameServerId { get; set; } = "";
    public int EnvType { get; set; } = 21;
}

public class LogOption
{
#if DEBUG
    public bool EnableGamePacketLog { get; set; } = true;
#else
    public bool EnableGamePacketLog { get; set; } = false;
#endif
    public bool LogPacketToConsole { get; set; } = true;
    public bool DisableLogDetailPacket { get; set; } = false;
    public bool SavePersonalDebugFile { get; set; } = false;
    public bool LogResourceCacheLoading { get; set; } = true;
}

public class ServerAnnounce
{
    private const long DefaultDurationSeconds = 86400L * 30;
    private const uint DefaultBannerFrequencySeconds = 3600;

    public bool EnableAnnounce { get; set; } = false;
    public string AnnounceContent { get; set; } = "Welcome to March7thHoney!";
    public string Duration { get; set; } = "30d";
    public string BannerFrequency { get; set; } = "1h";

    public long GetDurationSeconds()
    {
        if (!DurationParser.TryParseSeconds(Duration, out var seconds))
            return DefaultDurationSeconds;

        return Math.Clamp(seconds, 1, DurationParser.MaxDurationSeconds);
    }

    public uint GetBannerFrequencySeconds()
    {
        if (!DurationParser.TryParseSeconds(BannerFrequency, out var seconds))
            return DefaultBannerFrequencySeconds;

        return (uint)Math.Clamp(seconds, 1, uint.MaxValue);
    }
}

public class ServerProfile
{
    public string Name { get; set; } = "HyacineLover";
    public int Uid { get; set; } = 5201314;
    public string Signature { get; set; } = "Type /help for a list of commands";
    public int Level { get; set; } = 70;
    public int HeadIcon { get; set; } = 200139;
    public int ChatBubbleId { get; set; } = 220008;
    public int PersonalCardId { get; set; } = 253001;

    public List<ServerAssistInfo> AssistInfo { get; set; } =
    [
        new() { AvatarId = 1409, Level = 80 }
    ];
}


public class ServerAssistInfo
{
    public int AvatarId { get; set; }
    public int Level { get; set; }
    public int SkinId { get; set; }
}

public class MuipServerConfig
{
    public string AdminKey { get; set; } = "None";
}

public class WebSecurityConfig
{
    public bool EnableRsaLoginDecrypt { get; set; } = true;
    public string RsaPublicKeyPem { get; set; } = "";
    public string RsaPrivateKeyPem { get; set; } = "";
}
