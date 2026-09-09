using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyHandlePendingActionCsReq)]
public class HandlerTrainPartyHandlePendingActionCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyHandlePendingActionCsReq.Parser.ParseFrom(data);
        var manager = connection.Player!.TrainPartyManager!;
        var ret = manager.HandlePendingAction(req, out var rspProto);
        rspProto.Retcode = ret;

        var rsp = new BasePacket(CmdIds.TrainPartyHandlePendingActionScRsp);
        rsp.SetData(rspProto);
        await connection.SendPacket(rsp);

        // Push the resulting deltas (including the next pending action) on the sync channel.
        var sync = manager.BuildGameplaySyncNotify();
        if (sync != null)
        {
            var notify = new BasePacket(CmdIds.TrainPartySyncUpdateScNotify);
            notify.SetData(sync);
            await connection.SendPacket(notify);
        }

        // Once the run has settled, follow up with the settle notifies and clear it.
        if (manager.GameplayRun is { Finished: true })
        {
            var settle = new BasePacket(CmdIds.TrainPartySettleNotify);
            settle.SetData(manager.BuildSettleNotify());
            await connection.SendPacket(settle);

            var gamePlaySettle = new BasePacket(CmdIds.TrainPartyGamePlaySettleNotify);
            gamePlaySettle.SetData(manager.BuildGamePlaySettleNotify());
            await connection.SendPacket(gamePlaySettle);

            manager.ResetGameplay();
        }
    }
}
