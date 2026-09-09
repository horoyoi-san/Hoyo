using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketSelectPhoneCaseScRsp : BasePacket
{
    public PacketSelectPhoneCaseScRsp(uint id) : base(CmdIds.SelectPhoneCaseScRsp)
    {
        var proto = new SelectPhoneCaseScRsp
        {
            CurPhoneCase = id
        };

        SetData(proto);
    }
}
