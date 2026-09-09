using March7thHoney.GameServer.Server.Packet.Send.Tutorial;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Tutorial;

[Opcode(CmdIds.UnlockTutorialCsReq)]
public class HandlerUnlockTutorialCsReq : Handler<UnlockTutorialCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UnlockTutorialCsReq req)
    {
        if (!player.TutorialData!.Tutorials.TryGetValue((int)req.TutorialId, out _))
            player.TutorialData!.Tutorials.Add((int)req.TutorialId, TutorialStatus.TutorialUnlock);

        await connection.SendPacket(new PacketUnlockTutorialScRsp(req.TutorialId));
    }
}
