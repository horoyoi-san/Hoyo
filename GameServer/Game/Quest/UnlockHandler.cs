using March7thHoney.Data;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Quest;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Quest;

public class UnlockHandler(PlayerInstance player)
{
    public PlayerInstance Player { get; } = player;

    public bool GetUnlockStatus(int unlockId)
    {
        GameData.FuncUnlockDataData.TryGetValue(unlockId, out var unlockData);
        if (unlockData == null) return false;

        // judge
        foreach (var condition in unlockData.Conditions)
            switch (condition.Type)
            {
                case ConditionTypeEnum.WorldLevel:
                    if (Player.Data.WorldLevel < int.Parse(condition.Param)) return false; // less than it
                    break;
                case ConditionTypeEnum.FinishMainMission:
                    if (Player.MissionManager?.GetMainMissionStatus(int.Parse(condition.Param)) !=
                        MissionPhaseEnum.Finish) return false;
                    break;
                case ConditionTypeEnum.InStoryLine:
                    if (Player.StoryLineManager?.StoryLineData.CurStoryLineId != int.Parse(condition.Param))
                        return false;
                    break;
                case ConditionTypeEnum.PlayerLevel:
                    if (Player.Data.Level < int.Parse(condition.Param)) return false;
                    break;
                case ConditionTypeEnum.FinishSubMission:
                case ConditionTypeEnum.RealFinishSubMission:
                    if (Player.MissionManager?.GetSubMissionStatus(int.Parse(condition.Param)) !=
                        MissionPhaseEnum.Finish) return false;
                    break;
                case ConditionTypeEnum.AvatarPathUnlock:
                    if (!int.TryParse(condition.Param, out var pathAvatarId)) return false;

                    var hasPath = false;
                    if (GameData.MultiplePathAvatarConfigData.TryGetValue(pathAvatarId, out var pathConfig))
                    {
                        var formal = Player.AvatarManager?.GetFormalAvatar(pathConfig.BaseAvatarID);
                        hasPath = formal?.PathInfos.ContainsKey(pathAvatarId) == true;
                    }
                    else
                    {
                        hasPath = Player.AvatarManager?.Data.FormalAvatars.Any(x =>
                            x.AvatarId == pathAvatarId || x.PathInfos.ContainsKey(pathAvatarId)) == true;
                    }

                    if (!hasPath) return false;
                    break;
            }

        return true;
    }
}
