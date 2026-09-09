using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyAddBuildDynamicBuffCsReq)]
public class HandlerTrainPartyAddBuildDynamicBuffCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        // Request is empty in 4.4 — the buff must come from server state; none is tracked yet, so
        // acknowledge with buff id 0 (verify against a live client before driving real buffs).
        var rsp = new BasePacket(CmdIds.TrainPartyAddBuildDynamicBuffScRsp);
        rsp.SetData(new DNIAFCGKEOP { Retcode = 0, BuffId = 0 });
        await connection.SendPacket(rsp);
    }
}
