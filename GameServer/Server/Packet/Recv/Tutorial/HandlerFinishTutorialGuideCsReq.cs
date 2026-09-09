using March7thHoney.GameServer.Server.Packet.Send.Tutorial;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Tutorial;

[Opcode(CmdIds.FinishTutorialGuideCsReq)]
public class HandlerFinishTutorialGuideCsReq : Handler<FinishTutorialGuideCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishTutorialGuideCsReq req)
    {
        if (player.TutorialGuideData!.Tutorials.TryGetValue((int)req.GroupId, out var res))
            if (res != TutorialStatus.TutorialFinish)
            {
                await player.InventoryManager!.AddItem(1, 1, false);
                player.TutorialGuideData!.Tutorials[(int)req.GroupId] = TutorialStatus.TutorialFinish;
            }

        await connection.SendPacket(new PacketFinishTutorialGuideScRsp(req.GroupId));
    }
}
