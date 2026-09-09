using March7thHoney.GameServer.Server.Packet.Send.Raid;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Raid;

[Opcode(CmdIds.GetRaidInfoCsReq)]
public class HandlerGetRaidInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetRaidInfoScRsp(player));
    }
}
