using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Activity;

[Opcode(CmdIds.LeaveTrialActivityCsReq)]
public class HandlerLeaveTrialActivityCsReq : Handler<LeaveTrialActivityCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, LeaveTrialActivityCsReq req)
    {
        if (player.ActivityManager!.TrialActivityInstance != null)
        {
            var manager = player.ActivityManager;
            await manager.TrialActivityInstance.EndActivity();
        }

        player.ActivityManager!.TrialActivityInstance = null;

        await connection.SendPacket(CmdIds.LeaveTrialActivityScRsp);
    }
}
