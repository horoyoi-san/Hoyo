using March7thHoney.GameServer.Game.Activity.Activities;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Activity;

[Opcode(CmdIds.StartTrialActivityCsReq)]
public class HandlerStartTrialActivityCsReq : Handler<StartTrialActivityCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StartTrialActivityCsReq req)
    {
        var activityManager = player.ActivityManager!;
        activityManager.TrialActivityInstance = new TrialActivityInstance(activityManager);
        await activityManager.TrialActivityInstance.StartActivity((int)req.StageId);
    }
}
