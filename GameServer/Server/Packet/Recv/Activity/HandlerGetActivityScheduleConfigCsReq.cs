using March7thHoney.GameServer.Server.Packet.Send.Activity;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Activity;

[Opcode(CmdIds.GetActivityScheduleConfigCsReq)]
public class HandlerGetActivityScheduleConfigCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetActivityScheduleConfigScRsp(player));
    }
}
