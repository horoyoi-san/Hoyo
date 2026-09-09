using March7thHoney.GameServer.Game.Challenge.Definitions;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketGetCurChallengeScRsp : BasePacket
{
    public PacketGetCurChallengeScRsp(PlayerInstance player) : base(CmdIds.GetCurChallengeScRsp)
    {
        var proto = new GetCurChallengeScRsp();

        if (player.ChallengeManager!.ChallengeInstance is BaseLegacyChallengeInstance inst)
        {
            proto.CurChallenge = inst.ToProto();
            var proto1 = player.LineupManager?.GetExtraLineup(ExtraLineupType.LineupChallenge)?.ToProto();
            if (proto1 != null)
                proto.LineupList.Add(proto1);

            var proto2 = player.LineupManager?.GetExtraLineup(ExtraLineupType.LineupChallenge2)?.ToProto();
            if (proto2 != null)
                proto.LineupList.Add(proto2);
        }
        else
        {
            proto.Retcode = 0;
        }

        SetData(proto);
    }

    public static async Task<PacketGetCurChallengeScRsp> CreateAsync(PlayerInstance player)
    {
        if (player.ChallengeManager!.ChallengeInstance is BaseLegacyChallengeInstance inst)
            await player.LineupManager!.SetExtraLineup((ExtraLineupType)inst.GetCurrentExtraLineupType());

        return new PacketGetCurChallengeScRsp(player);
    }
}
