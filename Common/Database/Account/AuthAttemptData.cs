using MemoryPack;

namespace March7thHoney.Database.Account;

[DbTable("AuthAttempt")]
public class AuthAttemptData : BaseDatabaseDataHelper
{
    public string AttemptKey { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;

    public long WindowStart { get; set; }
    public int Count { get; set; }
    public long BlockedUntil { get; set; }
    public long UpdatedAt { get; set; }
}
