using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyLeaveCsReq)]
public class HandlerTrainPartyLeaveCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        // Leaving aborts any active board run.
        connection.Player!.TrainPartyManager!.ResetGameplay();

        var rsp = new BasePacket(CmdIds.TrainPartyLeaveScRsp);
        rsp.SetData(new DBGHCHPONOH { Retcode = 0 });
        await connection.SendPacket(rsp);
    }
}
