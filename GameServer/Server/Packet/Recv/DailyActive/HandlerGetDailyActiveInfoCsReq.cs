using March7thHoney.GameServer.Server.Packet.Send.DailyActive;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.DailyActive;

[Opcode(CmdIds.GetDailyActiveInfoCsReq)]
public class HandlerGetDailyActiveInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetDailyActiveInfoScRsp(player));
    }
}
