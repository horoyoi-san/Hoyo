using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.FinishTalkMissionCsReq)]
public class HandlerFinishTalkMissionCsReq : Handler<FinishTalkMissionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishTalkMissionCsReq req)
    {
        var handled = await player.MissionManager!.HandleTalkStr(req.TalkStr);

        // Degenerate report: the talk string matched no configured gate and the client named no
        // sub-mission. That happens when the client's own performance for the step never armed, so it
        // reports a plain NPC dialogue instead of the mission string. Close the tracked main's unique
        // talk finish-gate on this floor so the story chain is not stuck at that beat.
        if (!handled && req.SubMissionId == 0)
            await player.MissionManager!.FinishDegenerateTalk();

        if (req.CustomValueList != null && req.CustomValueList.Count > 0)
            await player.MissionManager!.HandleCustomValue([.. req.CustomValueList], (int)req.SubMissionId);

        await connection.SendPacket(new PacketFinishTalkMissionScRsp(req.TalkStr));
    }
}
