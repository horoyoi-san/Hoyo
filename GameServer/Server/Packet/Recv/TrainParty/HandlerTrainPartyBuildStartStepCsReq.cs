using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyBuildStartStepCsReq)]
public class HandlerTrainPartyBuildStartStepCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyBuildStartStepCsReq.Parser.ParseFrom(data);
        var manager = connection.Player!.TrainPartyManager!;
        // 4.4 split the step id across two uint fields with no recoverable anchor; read whichever the client populated.
        var stepId = req.GKENFCLLLJC != 0 ? req.GKENFCLLLJC : req.DNLIGEOFPEL;
        var ret = manager.BuildStartStep(req.AreaId, stepId, req.PFICNBHIHBA, out var curFund);
        var packet = new BasePacket(CmdIds.TrainPartyBuildStartStepScRsp);
        packet.SetData(new TrainPartyBuildStartStepScRsp
        {
            CurFund = curFund,
            Retcode = ret
        });
        await connection.SendPacket(packet);
    }
}
