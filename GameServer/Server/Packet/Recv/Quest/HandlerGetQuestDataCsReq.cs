using March7thHoney.GameServer.Server.Packet.Send.Quest;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Quest;

[Opcode(CmdIds.GetQuestDataCsReq)]
public class HandlerGetQuestDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetQuestDataScRsp(player));
    }
}
