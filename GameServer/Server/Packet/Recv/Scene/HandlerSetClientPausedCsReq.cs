using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SetClientPausedCsReq)]
public class HandlerSetClientPausedCsReq : Handler<SetClientPausedCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetClientPausedCsReq req)
    {
        var paused = req.Paused;
        await connection.SendPacket(new PacketSetClientPausedScRsp(paused));
        if (player != null) await player.TrySendWelcomeAnnounce();
    }
}
