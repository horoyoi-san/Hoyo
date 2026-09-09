using March7thHoney.GameServer.Server.Packet.Send.Mail;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mail;

[Opcode(CmdIds.DelMailCsReq)]
public class HandlerDelMailCsReq : Handler<DelMailCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DelMailCsReq req)
    {
        foreach (var id in req.IdList) player.MailManager?.DeleteMail((int)id);

        await connection.SendPacket(new PacketDelMailScRsp([..req.IdList]));
    }
}
