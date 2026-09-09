using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.TakeChallengeRewardCsReq)]
public class HandlerTakeChallengeRewardCsReq : Handler<TakeChallengeRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeChallengeRewardCsReq req)
    {
        var rewardInfos = await player.ChallengeManager!.TakeRewards((int)req.GroupId)!;
        var tierceReward = await player.ChallengeManager.TakeTierceReward((int)req.GroupId);
        await connection.SendPacket(new PacketTakeChallengeRewardScRsp((int)req.GroupId, rewardInfos, tierceReward));
    }
}
