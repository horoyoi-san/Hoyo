using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.TakeChallengePeakRewardCsReq)]
public class HandlerTakeChallengePeakRewardCsReq : Handler<TakeChallengePeakRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeChallengePeakRewardCsReq req)
    {
        var rewardIds = req.NormalRewardIdList;
        var rewardGroups = await player.ChallengePeakManager!.TakeRewards((int)req.PeakGroupId, rewardIds);
        await connection.SendPacket(new PacketTakeChallengePeakRewardScRsp(req.PeakGroupId, rewardGroups));
    }
}
