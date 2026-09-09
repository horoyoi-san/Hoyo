namespace March7thHoney.Command;

public static class CommandRoles
{
    public const string User = "User";
    public const string Moderator = "Moderator";
    public const string Administrator = "Administrator";
    public const string Developer = "Developer";
    public const string RoleReferencePrefix = "role:";

    public static Dictionary<string, HashSet<string>> DefaultRoles()
    {
        return new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            [User] =
            [
                CommandPermissions.Help,
                CommandPermissions.Hero,
                CommandPermissions.Calyx,
                CommandPermissions.Scene,
                CommandPermissions.Mission,
                CommandPermissions.Peak,
                CommandPermissions.Avatar,
                CommandPermissions.FakeTime,
                CommandPermissions.Give,
                CommandPermissions.GiveAll,
                CommandPermissions.Grid,
                CommandPermissions.Json,
                CommandPermissions.Lineup,
                CommandPermissions.Relic,
                CommandPermissions.SetLevel,
                CommandPermissions.UnlockAll,
                CommandPermissions.Unstuck
            ],
            [Moderator] =
            [
                RoleReferencePrefix + User,
                CommandPermissions.TargetOthers,
                CommandPermissions.Kick
            ],
            [Administrator] =
            [
                RoleReferencePrefix + Moderator,
                CommandPermissions.Account,

                CommandPermissions.Mail,
                CommandPermissions.Raid,
                CommandPermissions.Reload,
                CommandPermissions.Remove,
                CommandPermissions.Anno

            ],
            [Developer] =
            [
                RoleReferencePrefix + Administrator,
                CommandPermissions.Windy,
                CommandPermissions.Htl,
                CommandPermissions.Debug,
                CommandPermissions.Clear
            ]
        };
    }

    public static string NormalizeRole(string? role, string? defaultRole,
        IReadOnlyDictionary<string, HashSet<string>>? roles)
    {
        var roleName = string.IsNullOrWhiteSpace(role) ? defaultRole : role;
        roleName = string.IsNullOrWhiteSpace(roleName) ? User : roleName.Trim();

        if (roles != null)
            foreach (var configuredRole in roles.Keys)
                if (string.Equals(configuredRole, roleName, StringComparison.OrdinalIgnoreCase))
                    return configuredRole;

        return User;
    }

    public static HashSet<string> GetPermissions(string? role, string? defaultRole,
        IReadOnlyDictionary<string, HashSet<string>>? roles)
    {
        roles ??= DefaultRoles();
        var normalizedRole = NormalizeRole(role, defaultRole, roles);

        if (roles.TryGetValue(normalizedRole, out var permissions))
            return ResolvePermissions(normalizedRole, roles, []);

        return roles.TryGetValue(User, out var userPermissions) ? ResolvePermissions(User, roles, []) : [];
    }

    private static HashSet<string> ResolvePermissions(string role,
        IReadOnlyDictionary<string, HashSet<string>> roles, HashSet<string> visiting)
    {
        var resolvedPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (!visiting.Add(role)) return resolvedPermissions;

        if (!roles.TryGetValue(role, out var permissions))
        {
            visiting.Remove(role);
            return resolvedPermissions;
        }

        foreach (var permission in permissions)
        {
            if (TryResolveRoleReference(permission, roles, out var inheritedRole))
            {
                resolvedPermissions.UnionWith(ResolvePermissions(inheritedRole, roles, visiting));
                continue;
            }

            resolvedPermissions.Add(permission);
        }

        visiting.Remove(role);
        return resolvedPermissions;
    }

    private static bool TryResolveRoleReference(string permission,
        IReadOnlyDictionary<string, HashSet<string>> roles, out string inheritedRole)
    {
        inheritedRole = "";
        if (!permission.StartsWith(RoleReferencePrefix, StringComparison.OrdinalIgnoreCase)) return false;

        var requestedRole = permission[RoleReferencePrefix.Length..].Trim();
        if (string.IsNullOrWhiteSpace(requestedRole)) return true;

        foreach (var configuredRole in roles.Keys)
        {
            if (!string.Equals(configuredRole, requestedRole, StringComparison.OrdinalIgnoreCase)) continue;

            inheritedRole = configuredRole;
            return true;
        }

        return true;
    }
}
