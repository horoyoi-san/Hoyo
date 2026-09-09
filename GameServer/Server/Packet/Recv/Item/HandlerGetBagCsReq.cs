using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.GetBagCsReq)]
public class HandlerGetBagCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetBagScRsp(player));
    }
}
