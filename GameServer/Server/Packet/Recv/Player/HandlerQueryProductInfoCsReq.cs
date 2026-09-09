using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.QueryProductInfoCsReq)]
public class HandlerQueryProductInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketQueryProductInfoScRsp(player?.Data));
    }
}
