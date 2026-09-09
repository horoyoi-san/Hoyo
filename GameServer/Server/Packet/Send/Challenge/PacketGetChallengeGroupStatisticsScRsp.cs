using Google.Protobuf.Collections;
using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Friend;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketGetChallengeGroupStatisticsScRsp : BasePacket
{
    public PacketGetChallengeGroupStatisticsScRsp(PlayerInstance player, uint groupId) : base(
        CmdIds.GetChallengeGroupStatisticsScRsp)
    {
        var proto = new GetChallengeGroupStatisticsScRsp
        {
            GroupId = groupId,
            Retcode = 0
        };

        var configs = GameData.ChallengeConfigData.Values
            .Where(config => (uint)config.GroupID == groupId)
            .ToList();
        player.FriendRecordData!.ChallengeGroupStatistics.TryGetValue(groupId, out var data);
        EnsureRecordIds(player, data);

        if (configs.Any(config => config.IsBoss()))
            AddBossStatistics(proto, data);
        else if (configs.Any(config => config.IsStory()))
            AddStoryStatistics(proto, data);
        else
            AddMemoryStatistics(proto, data);

        proto.MEGBIPBAFBP = player.ChallengeTierceManager?.BuildGroupStatisticsRecord((int)groupId);
        SetData(proto);
    }

    private static void EnsureRecordIds(PlayerInstance player, ChallengeGroupStatisticsPb? data)
    {
        if (data == null) return;
        var changed = false;
        if (data.MemoryGroupStatistics != null)
            foreach (var record in data.MemoryGroupStatistics.Values)
                if (record.RecordId == 0)
                {
                    record.RecordId = player.FriendRecordData!.AllocateChallengeRecordId();
                    changed = true;
                }
        if (data.StoryGroupStatistics != null)
            foreach (var record in data.StoryGroupStatistics.Values)
                if (record.RecordId == 0)
                {
                    record.RecordId = player.FriendRecordData!.AllocateChallengeRecordId();
                    changed = true;
                }
        if (data.BossGroupStatistics != null)
            foreach (var record in data.BossGroupStatistics.Values)
                if (record.RecordId == 0)
                {
                    record.RecordId = player.FriendRecordData!.AllocateChallengeRecordId();
                    changed = true;
                }
        if (changed) DatabaseHelper.MarkDirty(player.Uid);
    }

    private static void AddStoryStatistics(GetChallengeGroupStatisticsScRsp proto,
        ChallengeGroupStatisticsPb? data)
    {
        proto.ChallengeStory = new ChallengeStoryStatistics();
        if (data?.StoryGroupStatistics is not { Count: > 0 }) return;
        var top = data.StoryGroupStatistics.Values
            .OrderByDescending(record => record.Level)
            .ThenByDescending(record => record.Stars)
            .ThenByDescending(record => record.Score)
            .First();
        proto.ChallengeStory = new ChallengeStoryStatistics
        {
            RecordId = top.RecordId,
            PPBHLLOJNEK = new EIKPHEMHIOH
            {
                Level = top.Level,
                EEJCPNAEKLJ = top.Stars,
                BuffOne = top.BuffOne,
                BuffTwo = top.BuffTwo,
                ScoreId = top.Score
            }
        };
        AddLineups(proto.ChallengeStory.PPBHLLOJNEK.LineupList, top.Lineups);
    }

    private static void AddMemoryStatistics(GetChallengeGroupStatisticsScRsp proto,
        ChallengeGroupStatisticsPb? data)
    {
        proto.ChallengeDefault = new ChallengeStatistics();
        if (data?.MemoryGroupStatistics is not { Count: > 0 }) return;
        var top = data.MemoryGroupStatistics.Values
            .OrderByDescending(record => record.Level)
            .ThenByDescending(record => record.Stars)
            .ThenBy(record => record.RoundCount)
            .First();
        proto.ChallengeDefault = new ChallengeStatistics
        {
            RecordId = top.RecordId,
            PPBHLLOJNEK = new ADKJKMKBFDC
            {
                Level = top.Level,
                EEJCPNAEKLJ = top.Stars,
                RoundCount = top.RoundCount
            }
        };
        AddLineups(proto.ChallengeDefault.PPBHLLOJNEK.LineupList, top.Lineups);
    }

    private static void AddBossStatistics(GetChallengeGroupStatisticsScRsp proto,
        ChallengeGroupStatisticsPb? data)
    {
        proto.ChallengeBoss = new ChallengeBossStatistics();
        if (data?.BossGroupStatistics is not { Count: > 0 }) return;
        var top = data.BossGroupStatistics.Values
            .OrderByDescending(record => record.Level)
            .ThenByDescending(record => record.Stars)
            .ThenByDescending(record => record.Score)
            .First();
        proto.ChallengeBoss = new ChallengeBossStatistics
        {
            RecordId = top.RecordId,
            PPBHLLOJNEK = new AANLJBLOOFO
            {
                Level = top.Level,
                EEJCPNAEKLJ = top.Stars,
                BuffOne = top.BuffOne,
                BuffTwo = top.BuffTwo,
                ScoreId = top.Score
            }
        };
        AddLineups(proto.ChallengeBoss.PPBHLLOJNEK.LineupList, top.Lineups);
    }

    private static void AddLineups(RepeatedField<ChallengeLineupList> target,
        List<List<ChallengeAvatarInfoPb>> source)
    {
        foreach (var lineup in source)
        {
            var lineupProto = new ChallengeLineupList();
            lineupProto.AvatarList.AddRange(lineup.Select(avatar => avatar.ToProto()));
            target.Add(lineupProto);
        }
    }
}
