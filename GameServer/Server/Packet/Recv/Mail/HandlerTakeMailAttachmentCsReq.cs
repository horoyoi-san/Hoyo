using March7thHoney.GameServer.Server.Packet.Send.Mail;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mail;

[Opcode(CmdIds.TakeMailAttachmentCsReq)]
public class HandlerTakeMailAttachmentCsReq : Handler<TakeMailAttachmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeMailAttachmentCsReq req)
    {
        var mailManager = player.MailManager!;
        IEnumerable<uint> mailIds = req.MailIdList.Count > 0 ? req.MailIdList : mailManager.GetMailIdsWithAttachments();
        var result = await mailManager.TakeAttachments(mailIds);

        await connection.SendPacket(new PacketTakeMailAttachmentScRsp(result));
    }
}
