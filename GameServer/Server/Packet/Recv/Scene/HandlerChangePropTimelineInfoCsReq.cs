using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.ChangePropTimelineInfoCsReq)]
public class HandlerChangePropTimelineInfoCsReq : Handler<ChangePropTimelineInfoCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ChangePropTimelineInfoCsReq req)
    {
        await player.SetPropTimeline((int)req.PropEntityId, req.TimelineInfo);
        await connection.SendPacket(new PacketChangePropTimelineInfoScRsp(req.PropEntityId));
    }
}
