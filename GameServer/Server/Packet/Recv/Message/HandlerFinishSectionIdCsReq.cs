using March7thHoney.GameServer.Server.Packet.Send.Message;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Message;

[Opcode(CmdIds.FinishSectionIdCsReq)]
public class HandlerFinishSectionIdCsReq : Handler<FinishSectionIdCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishSectionIdCsReq req)
    {
        await player.MessageManager!.FinishSection((int)req.SectionId);

        await connection.SendPacket(new PacketFinishSectionIdScRsp(req.SectionId));
    }
}
