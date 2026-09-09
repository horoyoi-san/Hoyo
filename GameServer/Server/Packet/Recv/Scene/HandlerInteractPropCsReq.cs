using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.InteractPropCsReq)]
public class HandlerInteractPropCsReq : Handler<InteractPropCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, InteractPropCsReq req)
    {
        // Some client versions send the real interact config id in interact_id2.
        // interact_id can be a large token/timestamp-like value and cannot be used to query InteractConfig directly.
        var interactId = req.InteractId2 != 0 ? (int)req.InteractId2 : (int)req.InteractId;
        var prop = await player.InteractProp((int)req.PropEntityId, interactId);
        await connection.SendPacket(new PacketInteractPropScRsp(prop));
    }
}
