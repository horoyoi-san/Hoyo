namespace March7thHoney.Command;

public static class CommandPermissions
{
    public const string Public = "";
    public const string All = "*";
    public const string AllCommands = "command.*";
    public const string LegacyManage = "egglink.manage";
    public const string Manage = "command.manage";
    public const string Moderate = "command.moderate";
    public const string Mail = "command.mail";
    public const string Anno = "command.anno";
    public const string TargetOthers = "command.others";

    public const string Account = "command.account";
    public const string Avatar = "command.avatar";
    public const string Calyx = "command.calyx";
    public const string Clear = "command.clear";
    public const string FakeTime = "command.faketime";
    public const string Give = "command.give";
    public const string GiveAll = "command.giveall";
    public const string Grid = "command.grid";
    public const string Help = "command.help";
    public const string Hero = "command.hero";
    public const string Json = "command.json";
    public const string Kick = "command.kick";
    public const string Lineup = "command.lineup";
    public const string Mission = "command.mission";
    public const string Peak = "command.peak";
    public const string Raid = "command.raid";
    public const string Relic = "command.relic";
    public const string Reload = "command.reload";
    public const string Remove = "command.remove";
    public const string SetLevel = "command.setlevel";
    public const string UnlockAll = "command.unlockall";
    public const string Unstuck = "command.unstuck";
    public const string Windy = "command.windy";
    public const string Htl = "command.htl";

    public const string Player = "command.player";
    public const string Inventory = "command.inventory";
    public const string Progress = "command.progress";
    public const string Scene = "command.scene";
    public const string Debug = "command.debug";

    private static readonly char[] Separators = [',', ';', '\r', '\n', ' ', '\t'];
    private static readonly string[] LegacyManagePermissions =
    [
        Manage,
        Moderate,
        Mail,
        Anno,
        TargetOthers,
        Account,
        Avatar,
        Clear,
        Debug,
        Give,
        GiveAll,
        Grid,
        Json,
        Kick,
        Lineup,
        Raid,
        Relic,
        Reload,
        Remove,
        SetLevel,
            UnlockAll,
            Unstuck,
            Windy
    ];

    public static bool Allows(string? grantedPermissions, string? requiredPermission)
    {
        if (string.IsNullOrWhiteSpace(requiredPermission)) return true;

        foreach (var grantedPermission in Parse(grantedPermissions))
        {
            if (grantedPermission == All) return true;
            if (string.Equals(grantedPermission, LegacyManage, StringComparison.OrdinalIgnoreCase) &&
                LegacyManagePermissions.Contains(requiredPermission, StringComparer.OrdinalIgnoreCase))
                return true;
            if (IsScopedWildcard(grantedPermission, requiredPermission)) return true;
            if (string.Equals(grantedPermission, requiredPermission, StringComparison.OrdinalIgnoreCase)) return true;
        }

        return false;
    }

    public static string Normalize(string? permissions)
    {
        return string.Join(",", Parse(permissions)
            .SelectMany(ExpandLegacyPermission)
            .Distinct(StringComparer.OrdinalIgnoreCase));
    }

    public static string Normalize(IEnumerable<string>? permissions)
    {
        return string.Join(",", (permissions ?? [])
            .SelectMany(Parse)
            .SelectMany(ExpandLegacyPermission)
            .Distinct(StringComparer.OrdinalIgnoreCase));
    }

    public static IEnumerable<string> Parse(string? permissions)
    {
        return (permissions ?? string.Empty)
            .Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(permission => !string.IsNullOrWhiteSpace(permission));
    }

    public static IEnumerable<string> KnownPermissions()
    {
        return
        [
            All,
            AllCommands,
            Account,
            Avatar,
            Calyx,
            Clear,
            Debug,
            FakeTime,
            Give,
            GiveAll,
            Grid,
            Help,
            Hero,
            Json,
            Kick,
            Lineup,
            Mail,
            Mission,
            Peak,
            Raid,
            Relic,
            Reload,
            Remove,
            Scene,
            SetLevel,
            TargetOthers,
            UnlockAll,
            Unstuck,
            Windy,
            Htl,
            Player,
            Inventory,
            Progress,
            Moderate,
            Anno,
            Manage
        ];
    }

    private static IEnumerable<string> ExpandLegacyPermission(string permission)
    {
        if (string.Equals(permission, LegacyManage, StringComparison.OrdinalIgnoreCase))
            return LegacyManagePermissions;

        return [permission];
    }

    private static bool IsScopedWildcard(string grantedPermission, string requiredPermission)
    {
        if (!grantedPermission.EndsWith(".*", StringComparison.Ordinal)) return false;

        var prefix = grantedPermission[..^1];
        return requiredPermission.StartsWith(prefix, StringComparison.OrdinalIgnoreCase);
    }
}
