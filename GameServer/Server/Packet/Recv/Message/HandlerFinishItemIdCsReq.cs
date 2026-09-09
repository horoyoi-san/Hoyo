using March7thHoney.GameServer.Server.Packet.Send.Message;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Message;

[Opcode(CmdIds.FinishItemIdCsReq)]
public class HandlerFinishItemIdCsReq : Handler<FinishItemIdCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishItemIdCsReq req)
    {
        await player.MessageManager!.FinishMessageItem((int)req.ItemId);

        await connection.SendPacket(new PacketFinishItemIdScRsp(req.ItemId));
    }
}
