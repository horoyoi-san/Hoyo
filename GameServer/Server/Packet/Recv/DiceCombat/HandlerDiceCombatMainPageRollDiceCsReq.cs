using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.DiceCombatMainPageRollDiceCsReq)]
public class HandlerDiceCombatMainPageRollDiceCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var rsp = new BasePacket(CmdIds.DiceCombatMainPageRollDiceScRsp);
        rsp.SetData(new BPNGPLHJHBE { Retcode = 0 });
        await connection.SendPacket(rsp);
    }
}
