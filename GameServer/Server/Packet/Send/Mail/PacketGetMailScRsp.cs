using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mail;

public class PacketGetMailScRsp : BasePacket
{
    private const int DefaultPageSize = 50;

    public PacketGetMailScRsp(PlayerInstance player, uint start = 0, uint requestedCount = 0) : base(CmdIds.GetMailScRsp)
    {
        var allMails = player.MailManager!.ToMailProto()
            .Select(mail => (Mail: mail, IsNotice: false))
            .Concat(player.MailManager!.ToNoticeMailProto().Select(mail => (Mail: mail, IsNotice: true)))
            .ToList();

        var pageSize = requestedCount == 0 ? DefaultPageSize : (int)Math.Min(requestedCount, DefaultPageSize);
        var startIndex = (int)Math.Min(start, (uint)allMails.Count);
        var page = allMails.Skip(startIndex).Take(pageSize).ToList();

        var proto = new GetMailScRsp
        {
            Start = start,
            IsEnd = startIndex + page.Count >= allMails.Count,
            TotalNum = Math.Max((uint)allMails.Count, start)
        };

        proto.MailList.AddRange(page.Where(mail => !mail.IsNotice).Select(mail => mail.Mail));
        proto.NoticeMailList.AddRange(page.Where(mail => mail.IsNotice).Select(mail => mail.Mail));

        SetData(proto);
    }
}
