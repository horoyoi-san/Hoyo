using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.EnterSectionCsReq)]
public class HandlerEnterSectionCsReq : Handler<EnterSectionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, EnterSectionCsReq req)
    {
        player.EnterSection((int)req.SectionId);
        await connection.SendPacket(CmdIds.EnterSectionScRsp);
    }
}
