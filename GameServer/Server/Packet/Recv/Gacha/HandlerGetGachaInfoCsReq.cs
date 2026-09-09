using March7thHoney.GameServer.Server.Packet.Send.Gacha;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Gacha;

[Opcode(CmdIds.GetGachaInfoCsReq)]
public class HandlerGetGachaInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetGachaInfoScRsp(player));
    }
}
