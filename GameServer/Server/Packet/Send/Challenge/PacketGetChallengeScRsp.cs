using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketGetChallengeScRsp : BasePacket
{
    public PacketGetChallengeScRsp(PlayerInstance player) : base(CmdIds.GetChallengeScRsp)
    {
        var proto = new GetChallengeScRsp
        {
            Retcode = 0
        };

        foreach (var challengeExcel in GameData.ChallengeConfigData.Values)
            if (player.ChallengeManager?.ChallengeData.History.TryGetValue(challengeExcel.ID, out var value) == true)
            {
                var history = value;
                if (history.GroupId == 0) history.GroupId = challengeExcel.GroupID;
                proto.ChallengeList.Add(history.ToProto());
            }
            else
            {
                proto.ChallengeList.Add(new Proto.Challenge
                {
                    ChallengeId = (uint)challengeExcel.ID
                });
            }

        var takenRewardDict = player.ChallengeManager?.ChallengeData?.TakenRewards ?? [];
        foreach (var groupId in GameData.ChallengeGroupData.Keys.OrderBy(x => x))
        {
            if (takenRewardDict.TryGetValue(groupId, out var reward))
            {
                proto.ChallengeGroupList.Add(reward.ToProto());
            }
            else
            {
                proto.ChallengeGroupList.Add(new ChallengeGroup
                {
                    GroupId = (uint)groupId,
                    TakenStarsCountReward = 0
                });
            }
        }

        foreach (var groupId in GameData.ChallengeGroupData.Keys.OrderBy(x => x))
        {
            var tierce = GameData.ChallengeMazeTierceConfigData.Values.FirstOrDefault(config =>
                GameData.ChallengeConfigData.TryGetValue(config.PreChallengeMazeID, out var preConfig) &&
                preConfig.GroupID == groupId);
            if (tierce == null) continue;

            player.ChallengeManager!.ChallengeData.TierceHistory.TryGetValue(tierce.ID, out var history);
            proto.KKIAFPFKLGE.Add(new FMDAAIKLAJA
            {
                GroupId = (uint)groupId,
                EGLLMGLLHDL = history?.IsPassed == true,
                JFKMNBHOBCL = takenRewardDict.TryGetValue(groupId, out var reward) &&
                              reward.HasTakenReward(0)
            });
        }

        // Keep this aligned with official behavior: non-empty max level list controls client unlock display paths.
        proto.MaxLevelList.Add(new ChallengeHistoryMaxLevel { RewardDisplayType = 1, Level = 12 });
        proto.MaxLevelList.Add(new ChallengeHistoryMaxLevel { RewardDisplayType = 2, Level = 4 });
        proto.MaxLevelList.Add(new ChallengeHistoryMaxLevel { RewardDisplayType = 3, Level = 4 });

        SetData(proto);
    }
}
