using March7thHoney.GameServer.Server.Packet.Send.Mail;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mail;

[Opcode(CmdIds.MarkReadMailCsReq)]
public class HandlerMarkReadMailCsReq : Handler<MarkReadMailCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, MarkReadMailCsReq req)
    {
        var mail = player.MailManager!.GetMail((int)req.Id);

        if (mail != null)
        {
            mail.IsRead = true;
            await connection.SendPacket(new PacketMarkReadMailScRsp(req.Id));
        }
        else
        {
            await connection.SendPacket(new PacketMarkReadMailScRsp(Retcode.RetMailMailIdInvalid));
        }
    }
}
