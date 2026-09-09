using March7thHoney.GameServer.Server.Packet.Send.MarkChest;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.MarkChest;

[Opcode(CmdIds.GetMarkChestCsReq)]
public class HandlerGetMarkChestCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetMarkChestScRsp(player));
    }
}
