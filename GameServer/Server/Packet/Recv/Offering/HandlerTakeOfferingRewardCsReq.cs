using March7thHoney.GameServer.Server.Packet.Send.Offering;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Offering;

[Opcode(CmdIds.TakeOfferingRewardCsReq)]
public class HandlerTakeOfferingRewardCsReq : Handler<TakeOfferingRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeOfferingRewardCsReq req)
    {
        var res = await player.OfferingManager!.TakeOfferingReward((int)req.OfferingId,
            req.TakeRewardLevelList.Select(x => (int)x).ToList());

        await connection.SendPacket(new PacketTakeOfferingRewardScRsp(res.Item1, res.data, res.reward));
    }
}
