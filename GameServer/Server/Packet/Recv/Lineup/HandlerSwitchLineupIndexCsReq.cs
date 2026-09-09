using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lineup;

[Opcode(CmdIds.SwitchLineupIndexCsReq)]
public class HandlerSwitchLineupIndexCsReq : Handler<SwitchLineupIndexCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SwitchLineupIndexCsReq req)
    {
        if (await player.LineupManager!
                .SetCurLineup((int)req.Index)) // SetCurLineup returns true if the index is valid
            await connection.SendPacket(new PacketSwitchLineupIndexScRsp(req.Index));
    }
}
