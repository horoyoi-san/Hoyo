using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.V2FinishPveStageCsReq)]
public class HandlerV2FinishPveStageCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = V2FinishPveStageCsReq.Parser.ParseFrom(data);
        // MPDHNFNCIEA = stage id (same field name carries the stage id in both FinishPveStage ScRsps)
        connection.Player!.ActivityManager!.DiceCombat.RecordStageFinish(req.MPDHNFNCIEA, req.IsWin);
        await connection.SendPacket(new PacketV2FinishPveStageScRsp(req.MPDHNFNCIEA, req.IsWin));
    }
}
