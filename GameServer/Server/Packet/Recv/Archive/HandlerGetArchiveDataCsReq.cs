using March7thHoney.GameServer.Server.Packet.Send.Archive;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Archive;

[Opcode(CmdIds.GetArchiveDataCsReq)]
public class HandlerGetArchiveDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetArchiveDataScRsp(player));
    }
}
