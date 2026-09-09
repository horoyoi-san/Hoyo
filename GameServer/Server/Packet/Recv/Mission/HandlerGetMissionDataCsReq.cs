using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.GetMissionDataCsReq)]
public class HandlerGetMissionDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetMissionDataScRsp(player));
    }
}
