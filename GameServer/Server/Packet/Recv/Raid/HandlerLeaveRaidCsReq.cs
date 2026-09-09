using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Raid;

[Opcode(CmdIds.LeaveRaidCsReq)]
public class HandlerLeaveRaidCsReq : Handler<LeaveRaidCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, LeaveRaidCsReq req)
    {
        await player.RaidManager!.LeaveRaid(req.IsSave);

        await connection.SendPacket(CmdIds.LeaveRaidScRsp);
    }
}
