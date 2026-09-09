using March7thHoney.GameServer.Server.Packet.Send.Quest;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Quest;

[Opcode(CmdIds.TakeQuestOptionalRewardCsReq)]
public class HandlerTakeQuestOptionalRewardCsReq : Handler<TakeQuestOptionalRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeQuestOptionalRewardCsReq req)
    {
        var (retcode, rewards) =
            await player.QuestManager!.TakeQuestOptionalReward((int)req.QuestId, (int)req.OptionalRewardId);

        await connection.SendPacket(new PacketTakeQuestOptionalRewardScRsp(req.QuestId, retcode, rewards));
    }
}
