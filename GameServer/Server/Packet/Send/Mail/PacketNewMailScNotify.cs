using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mail;

public class PacketNewMailScNotify : BasePacket
{
    public PacketNewMailScNotify(int id) : base(CmdIds.NewMailScNotify)
    {
        var proto = new NewMailScNotify
        {
            MailIdList = { (uint)id }
        };

        SetData(proto);
    }
}
