using March7thHoney.Database;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game;

public class BasePlayerManager(PlayerInstance player)
{
    public PlayerInstance Player { get; private set; } = player;
}

/// <summary>
///     Manager base for the common case of owning a single persisted entity. Resolves the entity once from the
///     central cache and exposes <see cref="MarkDirty" /> so subclasses stop reaching into DatabaseHelper directly.
///     Replaces the three ad-hoc DB-access styles (inline field / property getter / constructor assignment) with one.
/// </summary>
public class BasePlayerManager<TData>(PlayerInstance player) : BasePlayerManager(player)
    where TData : BaseDatabaseDataHelper, new()
{
    public TData Data { get; } = DatabaseHelper.Instance!.GetInstanceOrCreateNew<TData>(player.Uid);

    /// <summary>Flag this player's data for the next save flush.</summary>
    protected void MarkDirty() => DatabaseHelper.MarkDirty(Player.Uid);
}
