using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lineup;

[Opcode(CmdIds.ReplaceLineupCsReq)]
public class HandlerReplaceLineupCsReq : Handler<ReplaceLineupCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ReplaceLineupCsReq req)
    {
        var avatarIds = req.LineupSlotList
            .OrderBy(x => x.Slot)
            .Select(x => (int)x.Id)
            .Where(x => x > 0)
            .ToList();
        await player.LineupManager!.ReplaceLineup((int)req.Index, avatarIds, req.ExtraLineupType);
        await connection.SendPacket(CmdIds.JoinLineupScRsp);
    }
}
