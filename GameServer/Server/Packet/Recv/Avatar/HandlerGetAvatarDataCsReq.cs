using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.GetAvatarDataCsReq)]
public class HandlerGetAvatarDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetAvatarDataScRsp(player));
    }
}
