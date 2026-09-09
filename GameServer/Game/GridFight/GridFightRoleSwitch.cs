namespace March7thHoney.GameServer.Game.GridFight;

public sealed record GridFightRoleSwitchEntryState(
    IReadOnlyList<uint> RoleIdList,
    uint CurrentRoleId);

public sealed record GridFightRoleSwitchUpdate(
    IReadOnlyDictionary<uint, uint> PreviousRoleIds,
    IReadOnlyDictionary<uint, uint> PreviousRoleSwitchIds,
    IReadOnlySet<uint> ChangedRoleUniqueIds,
    IReadOnlySet<uint> ChangedRoleSwitchBaseIds);
