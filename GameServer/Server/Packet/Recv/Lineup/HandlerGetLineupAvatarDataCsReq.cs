using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lineup;

[Opcode(CmdIds.GetLineupAvatarDataCsReq)]
public class HandlerGetLineupAvatarDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetLineupAvatarDataScRsp(player));
    }
}
