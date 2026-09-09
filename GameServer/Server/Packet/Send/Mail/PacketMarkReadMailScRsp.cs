using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mail;

public class PacketMarkReadMailScRsp : BasePacket
{
    public PacketMarkReadMailScRsp(uint mailId) : base(CmdIds.MarkReadMailScRsp)
    {
        var proto = new MarkReadMailScRsp
        {
            Id = mailId
        };

        SetData(proto);
    }

    public PacketMarkReadMailScRsp(Retcode retcode) : base(CmdIds.MarkReadMailScRsp)
    {
        var proto = new MarkReadMailScRsp
        {
            Retcode = (uint)retcode
        };

        SetData(proto);
    }
}
