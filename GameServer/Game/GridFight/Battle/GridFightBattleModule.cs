using March7thHoney.Data;
using March7thHoney.Database.Lineup;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;
using LineupInfo = March7thHoney.Database.Lineup.LineupInfo;

namespace March7thHoney.GameServer.Game.GridFight.Battle;

public static class GridFightBattleModule
{
    public static BattleInstance? StartBattle(
        PlayerInstance player,
        GridFightSession session,
        GridFightResourceCatalog catalog)
    {
        if (player.BattleInstance != null) return player.BattleInstance;
        if (!GameData.StageConfigData.TryGetValue((int)session.CurrentNode.StageId, out var stage)) return null;

        var avatars = new List<LineupAvatarInfo>();
        foreach (var role in session.Roles.Where(role => role.Position is >= 1 and <= 13).OrderBy(role => role.Position))
        {
            if (!GameData.GridFightRoleBasicInfoData.TryGetValue(role.RoleId, out var basic)) continue;
            var trial = player.AvatarManager!.GetTrialAvatarByWorldLevel(
                (int)basic.SpecialAvatarID,
                player.Data.WorldLevel);
            avatars.Add(trial != null
                ? new LineupAvatarInfo
                {
                    BaseAvatarId = (int)basic.AvatarID,
                    SpecialAvatarId = (int)basic.SpecialAvatarID,
                }
                : new LineupAvatarInfo { BaseAvatarId = (int)basic.AvatarID });
        }

        var lineup = new LineupInfo
        {
            LineupType = (int)ExtraLineupType.LineupGridFight,
            BaseAvatars = avatars,
            AvatarData = player.AvatarManager!.Data,
        };
        var battle = new BattleInstance(player, lineup, [stage])
        {
            WorldLevel = player.Data.WorldLevel,
            GridFightContext = session,
        };
        player.BattleInstance = battle;
        return battle;
    }
}
