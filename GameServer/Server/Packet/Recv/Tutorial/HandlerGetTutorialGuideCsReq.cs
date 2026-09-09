using March7thHoney.GameServer.Server.Packet.Send.Tutorial;
using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Tutorial;

[Opcode(CmdIds.GetTutorialGuideCsReq)]
public class HandlerGetTutorialGuideCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        if (player.MissionEnabled) // If missions are enabled
            await connection.SendPacket(new PacketGetTutorialGuideScRsp(player)); // some bug
    }
}
