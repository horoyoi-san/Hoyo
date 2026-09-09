using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.DiceCombatFinishPveStageCsReq)]
public class HandlerDiceCombatFinishPveStageCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = DiceCombatFinishPveStageCsReq.Parser.ParseFrom(data);
        var instance = connection.Player!.ActivityManager!.DiceCombat;
        // ODKEBLADOMK = stage id, EKJIPCEFPOG = is_win (inferred from 4.3 field order — verify in-game)
        instance.RecordStageFinish(req.ODKEBLADOMK, req.EKJIPCEFPOG);
        await connection.SendPacket(new PacketDiceCombatFinishPveStageScRsp(req.ODKEBLADOMK, req.EKJIPCEFPOG));
    }
}
