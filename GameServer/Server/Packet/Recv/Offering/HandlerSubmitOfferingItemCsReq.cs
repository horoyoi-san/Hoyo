using March7thHoney.GameServer.Server.Packet.Send.Offering;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Offering;

[Opcode(CmdIds.SubmitOfferingItemCsReq)]
public class HandlerSubmitOfferingItemCsReq : Handler<SubmitOfferingItemCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SubmitOfferingItemCsReq req)
    {
        var res = await player.OfferingManager!.SubmitOfferingItem((int)req.OfferingId);

        await connection.SendPacket(new PacketSubmitOfferingItemScRsp(res.Item1, res.data));
    }
}
