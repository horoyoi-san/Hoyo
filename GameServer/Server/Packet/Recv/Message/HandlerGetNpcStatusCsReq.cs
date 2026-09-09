using March7thHoney.GameServer.Server.Packet.Send.Message;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Message;

[Opcode(CmdIds.GetNpcStatusCsReq)]
public class HandlerGetNpcStatusCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetNpcStatusScRsp(player));
    }
}
