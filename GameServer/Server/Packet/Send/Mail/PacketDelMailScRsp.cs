using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mail;

public class PacketDelMailScRsp : BasePacket
{
    public PacketDelMailScRsp(List<uint> ids) : base(CmdIds.DelMailScRsp)
    {
        var proto = new DelMailScRsp
        {
            IdList = { ids }
        };

        SetData(proto);
    }
}
