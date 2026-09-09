using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerHeartBeatCsReq)]
public class HandlerPlayerHeartBeatCsReq : Handler<PlayerHeartBeatCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, PlayerHeartBeatCsReq req)
    {
        if (req != null)
            await connection.SendPacket(new PacketPlayerHeartBeatScRsp((long)req.ClientTimeMs, player.Data));

        await player.OnHeartBeat();
    }
}
