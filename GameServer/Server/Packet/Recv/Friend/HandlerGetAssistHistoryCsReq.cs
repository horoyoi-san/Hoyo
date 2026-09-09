using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Friend;

[Opcode(CmdIds.GetAssistHistoryCsReq)]
public class HandlerGetAssistHistoryCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetAssistHistoryScRsp(player));
    }
}
