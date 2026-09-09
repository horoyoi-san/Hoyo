using March7thHoney.GameServer.Server.Packet.Send.Quest;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Quest;

[Opcode(CmdIds.FinishQuestCsReq)]
public class HandlerFinishQuestCsReq : Handler<FinishQuestCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishQuestCsReq req)
    {
        var retCode = await player.QuestManager!.FinishQuestByClient((int)req.QuestId);
        await connection.SendPacket(new PacketFinishQuestScRsp(retCode));
    }
}
