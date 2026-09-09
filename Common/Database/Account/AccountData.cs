using MemoryPack;
using March7thHoney.Command;
using March7thHoney.Util;
using March7thHoney.Util.Security;

namespace March7thHoney.Database.Account;

[DbTable("Account")]
public class AccountData : BaseDatabaseDataHelper
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? NormalizedEmail { get; set; }
    public bool IsEmailVerified { get; set; }
    public long EmailVerifiedAt { get; set; }
    public string? EmailVerificationTokenHash { get; set; }
    public long EmailVerificationTokenExpireAt { get; set; }
    public string? PasswordResetTokenHash { get; set; }
    public long PasswordResetTokenExpireAt { get; set; }

    public string? PasswordSalt { get; set; }
    public string? PasswordHash { get; set; }
    public int PasswordIterations { get; set; }

    public string? ComboToken { get; set; }
    public string? ComboTokenHash { get; set; }
    public long ComboTokenExpireAt { get; set; }

    public string? DispatchToken { get; set; }
    public string? DispatchTokenHash { get; set; }
    public long DispatchTokenExpireAt { get; set; }

    public string? Role { get; set; }

    public string? Permissions { get; set; } // type: permission1,permission2,permission3...

    public string? PermissionOverrides { get; set; }

    public bool IsBanned { get; set; }
    public string? BanReason { get; set; }
    public long BanExpireAt { get; set; }
    public long BanCreatedAt { get; set; }
    public long BanUpdatedAt { get; set; }
    public string? KnownIdentityKeys { get; set; }

    public static AccountData? GetAccountByUserName(string username)
    {
        var normalized = username.Trim();
        AccountData? result = null;
        var accounts = DatabaseHelper.GetAllInstanceFromMap<AccountData>() ?? DatabaseHelper.GetAllInstance<AccountData>();
        accounts?.ForEach(account =>
        {
            if (string.Equals(account.Username?.Trim(), normalized, StringComparison.Ordinal)) result = account;
        });
        return result;
    }

    public static AccountData? GetAccountByEmail(string email)
    {
        var normalized = NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(normalized)) return null;

        AccountData? result = null;
        var accounts = DatabaseHelper.GetAllInstanceFromMap<AccountData>() ?? DatabaseHelper.GetAllInstance<AccountData>();
        accounts?.ForEach(account =>
        {
            var accountEmail = account.NormalizedEmail;
            if (string.IsNullOrWhiteSpace(accountEmail))
                accountEmail = NormalizeEmail(account.Email);

            if (string.Equals(accountEmail, normalized, StringComparison.OrdinalIgnoreCase)) result = account;
        });
        return result;
    }

    public static AccountData? GetAccountByLoginIdentifier(string account)
    {
        var byUsername = GetAccountByUserName(account);
        return byUsername ?? GetAccountByEmail(account);
    }

    public static AccountData? GetAccountByUid(int uid)
    {
        var result = DatabaseHelper.Instance?.GetInstance<AccountData>(uid);
        return result;
    }

    public static string NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? "" : email.Trim().ToLowerInvariant();
    }

    public bool HasPassword()
    {
        return !string.IsNullOrWhiteSpace(PasswordSalt) && !string.IsNullOrWhiteSpace(PasswordHash);
    }

    public bool CanLogin()
    {
        if (ConfigManager.Config.ServerOption.AutoCreateUser)
            return true;

        return !ConfigManager.Config.ServerOption.Auth.RequireVerifiedEmailForLogin || IsEmailVerified;
    }

    public AccountBanStatus GetBanStatus(bool identityMatched = false)
    {
        if (!IsBanned)
            return AccountBanStatus.Inactive;

        var now = Extensions.GetUnixSec();
        if (BanExpireAt > 0 && BanExpireAt <= now)
        {
            ClearBan();
            return AccountBanStatus.Inactive;
        }

        return new AccountBanStatus(
            true,
            Uid,
            BanReason ?? string.Empty,
            BanExpireAt,
            BanCreatedAt,
            identityMatched);
    }

    public void Ban(string? reason, long expireAt)
    {
        IsBanned = true;
        BanReason = string.IsNullOrWhiteSpace(reason) ? "No reason provided" : reason.Trim();
        BanExpireAt = Math.Max(0, expireAt);
        if (BanCreatedAt <= 0) BanCreatedAt = Extensions.GetUnixSec();
        BanUpdatedAt = Extensions.GetUnixSec();
        ClearLoginTokens(false);
        PersistAuthState();
    }

    public void ClearBan(bool persist = true)
    {
        IsBanned = false;
        BanReason = null;
        BanExpireAt = 0;
        BanCreatedAt = 0;
        BanUpdatedAt = Extensions.GetUnixSec();
        if (persist) PersistAuthState();
    }

    public void AddKnownIdentityKeys(IEnumerable<string>? identityKeys, bool persist = true)
    {
        var merged = AccountBanHelper.MergeIdentityKeys(KnownIdentityKeys, identityKeys);
        if (string.Equals(KnownIdentityKeys ?? string.Empty, merged, StringComparison.Ordinal))
            return;

        KnownIdentityKeys = string.IsNullOrWhiteSpace(merged) ? null : merged;
        if (persist) PersistAuthState();
    }

    public void SetPassword(string password)
    {
        var (salt, hash, iterations) = AuthSecurity.HashPassword(password);
        PasswordSalt = salt;
        PasswordHash = hash;
        PasswordIterations = iterations;
        PersistAuthState();
    }

    public string GetRole()
    {
        var serverOption = ConfigManager.Config.ServerOption;
        return CommandRoles.NormalizeRole(Role, serverOption.DefaultPermissionRole, serverOption.PermissionRoles);
    }

    public string SetRole(string? role)
    {
        var serverOption = ConfigManager.Config.ServerOption;
        Role = CommandRoles.NormalizeRole(role, serverOption.DefaultPermissionRole, serverOption.PermissionRoles);
        return SyncPermissionsWithRole();
    }

    public string SyncPermissionsWithRole(bool persist = true)
    {
        var normalizedRole = GetNormalizedRole();
        var syncedPermissions = GetBasePermissions(normalizedRole);
        var changed =
            !string.Equals(Role, normalizedRole, StringComparison.Ordinal) ||
            !string.Equals(Permissions, syncedPermissions, StringComparison.OrdinalIgnoreCase);

        Role = normalizedRole;
        Permissions = syncedPermissions;

        if (changed && persist) PersistAuthState();

        return CommandPermissions.Normalize([syncedPermissions, PermissionOverrides ?? string.Empty]);
    }

    public string GetEffectivePermissions()
    {
        return SyncPermissionsWithRole();
    }

    public string GetPermissionOverrides()
    {
        return CommandPermissions.Normalize(PermissionOverrides);
    }

    public string SetPermissionOverrides(string? permissions, bool persist = true)
    {
        var normalizedOverrides = CommandPermissions.Normalize(permissions);
        PermissionOverrides = string.IsNullOrWhiteSpace(normalizedOverrides) ? null : normalizedOverrides;
        if (persist) PersistAuthState();

        return GetEffectivePermissions();
    }

    public string GetBasePermissions()
    {
        return GetBasePermissions(GetNormalizedRole());
    }

    private string GetNormalizedRole()
    {
        var serverOption = ConfigManager.Config.ServerOption;
        return CommandRoles.NormalizeRole(Role, serverOption.DefaultPermissionRole,
            serverOption.PermissionRoles);
    }

    private static string GetBasePermissions(string normalizedRole)
    {
        var serverOption = ConfigManager.Config.ServerOption;
        var rolePermissions = CommandRoles.GetPermissions(normalizedRole, serverOption.DefaultPermissionRole,
            serverOption.PermissionRoles);
        return CommandPermissions.Normalize(rolePermissions.Concat(serverOption.DefaultPermissions));
    }

    public bool HasPermission(string permission)
    {
        return CommandPermissions.Allows(GetEffectivePermissions(), permission);
    }

    public bool VerifyPassword(string password)
    {
        return AuthSecurity.VerifyPassword(password, PasswordSalt, PasswordHash, PasswordIterations);
    }

    public void SetEmail(string email, bool verified)
    {
        var normalizedEmail = NormalizeEmail(email);
        var emailChanged = !string.Equals(NormalizedEmail ?? NormalizeEmail(Email), normalizedEmail,
            StringComparison.OrdinalIgnoreCase);

        Email = email.Trim();
        NormalizedEmail = normalizedEmail;
        IsEmailVerified = verified;
        EmailVerifiedAt = verified ? Extensions.GetUnixSec() : 0;
        ClearEmailVerificationToken(false);
        if (emailChanged || !verified)
            ClearPasswordResetToken(false);
        if (!verified)
            ClearLoginTokens(false);
        PersistAuthState();
    }

    public string GenerateEmailVerificationToken()
    {
        var token = AuthSecurity.GenerateSessionToken();
        EmailVerificationTokenHash = AuthSecurity.HashToken(token);
        EmailVerificationTokenExpireAt = Extensions.GetUnixSec() +
                                         Math.Max(
                                             ConfigManager.Config.ServerOption.Auth
                                                 .EmailVerificationTokenExpireMinutes, 1) * 60L;
        PersistAuthState();
        return token;
    }

    public bool ValidateEmailVerificationToken(string? token)
    {
        return ValidateActionToken(token, EmailVerificationTokenHash, EmailVerificationTokenExpireAt);
    }

    public void MarkEmailVerified()
    {
        IsEmailVerified = true;
        EmailVerifiedAt = Extensions.GetUnixSec();
        ClearEmailVerificationToken(false);
        PersistAuthState();
    }

    public void ClearEmailVerificationToken(bool persist = true)
    {
        EmailVerificationTokenHash = null;
        EmailVerificationTokenExpireAt = 0;
        if (persist) PersistAuthState();
    }

    public string GeneratePasswordResetToken()
    {
        var token = AuthSecurity.GenerateSessionToken();
        PasswordResetTokenHash = AuthSecurity.HashToken(token);
        PasswordResetTokenExpireAt = Extensions.GetUnixSec() +
                                     Math.Max(ConfigManager.Config.ServerOption.Auth.PasswordResetTokenExpireMinutes,
                                         1) * 60L;
        PersistAuthState();
        return token;
    }

    public bool ValidatePasswordResetToken(string? token)
    {
        return ValidateActionToken(token, PasswordResetTokenHash, PasswordResetTokenExpireAt);
    }

    public void ClearPasswordResetToken(bool persist = true)
    {
        PasswordResetTokenHash = null;
        PasswordResetTokenExpireAt = 0;
        if (persist) PersistAuthState();
    }

    public void ClearLoginTokens(bool persist = true)
    {
        DispatchToken = null;
        DispatchTokenHash = null;
        DispatchTokenExpireAt = 0;
        ComboToken = null;
        ComboTokenHash = null;
        ComboTokenExpireAt = 0;
        if (persist) PersistAuthState();
    }

    public string GenerateDispatchToken()
    {
        var token = AuthSecurity.GenerateSessionToken();
        DispatchToken = null;
        DispatchTokenHash = AuthSecurity.HashToken(token);
        DispatchTokenExpireAt = Extensions.GetUnixSec() +
                                Math.Max(ConfigManager.Config.ServerOption.Auth.DispatchTokenExpireMinutes, 1) * 60L;
        PersistAuthState();
        return token;
    }

    public string GenerateComboToken()
    {
        var token = AuthSecurity.GenerateSessionToken();
        ComboToken = null;
        ComboTokenHash = AuthSecurity.HashToken(token);
        ComboTokenExpireAt = Extensions.GetUnixSec() +
                             Math.Max(ConfigManager.Config.ServerOption.Auth.ComboTokenExpireMinutes, 1) * 60L;
        PersistAuthState();
        return token;
    }

    public bool ValidateDispatchToken(string? token)
    {
        return ValidateLoginToken(token, isDispatchToken: true);
    }

    public bool ValidateComboToken(string? token)
    {
        return ValidateLoginToken(token, isDispatchToken: false);
    }

    public bool ValidateGameToken(string? token)
    {
        return ValidateDispatchToken(token) || ValidateComboToken(token);
    }

    private bool ValidateLoginToken(string? providedToken, bool isDispatchToken)
    {
        var storedTokenHash = isDispatchToken ? DispatchTokenHash : ComboTokenHash;
        var storedToken = isDispatchToken ? DispatchToken : ComboToken;
        var expireAt = isDispatchToken ? DispatchTokenExpireAt : ComboTokenExpireAt;
        if (string.IsNullOrWhiteSpace(providedToken) ||
            expireAt <= Extensions.GetUnixSec())
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(storedTokenHash))
        {
            var valid = AuthSecurity.VerifyToken(providedToken, storedTokenHash);
            if (valid && !string.IsNullOrWhiteSpace(storedToken))
            {
                ClearLegacyLoginToken(isDispatchToken);
                PersistAuthState();
            }

            return valid;
        }

        if (string.IsNullOrWhiteSpace(storedToken) ||
            !string.Equals(storedToken, providedToken, StringComparison.Ordinal))
        {
            return false;
        }

        if (isDispatchToken)
        {
            DispatchTokenHash = AuthSecurity.HashToken(providedToken);
            DispatchToken = null;
        }
        else
        {
            ComboTokenHash = AuthSecurity.HashToken(providedToken);
            ComboToken = null;
        }

        PersistAuthState();
        return true;
    }

    private void ClearLegacyLoginToken(bool isDispatchToken)
    {
        if (isDispatchToken)
            DispatchToken = null;
        else
            ComboToken = null;
    }

    private static bool ValidateActionToken(string? providedToken, string? storedTokenHash, long expireAt)
    {
        if (string.IsNullOrWhiteSpace(providedToken) ||
            string.IsNullOrWhiteSpace(storedTokenHash) ||
            expireAt <= Extensions.GetUnixSec())
        {
            return false;
        }

        return AuthSecurity.VerifyToken(providedToken, storedTokenHash);
    }

    private void PersistAuthState()
    {
        DatabaseHelper.MarkDirty(Uid);
        DatabaseHelper.SaveDatabaseType(this);
    }
}
