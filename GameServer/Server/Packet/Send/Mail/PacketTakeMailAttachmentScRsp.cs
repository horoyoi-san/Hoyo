using March7thHoney.GameServer.Game.Mail;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mail;

public class PacketTakeMailAttachmentScRsp : BasePacket
{
    public PacketTakeMailAttachmentScRsp(TakeMailAttachmentResult result) : base(CmdIds.TakeMailAttachmentScRsp)
    {
        var proto = new TakeMailAttachmentScRsp
        {
            Attachment = result.Attachment.ToProto(),
            SuccMailIdList = { result.SuccessMailIds },
            FailMailList =
            {
                result.FailedMails.Select(mail => new KNPNAHPHNJK
                {
                    ItemId = mail.MailId,
                    IODBGABPNOP = (uint)mail.Retcode
                })
            }
        };

        SetData(proto);
    }
}
