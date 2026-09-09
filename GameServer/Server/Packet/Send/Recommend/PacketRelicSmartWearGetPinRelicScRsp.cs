using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketRelicSmartWearGetPinRelicScRsp : BasePacket
{
    public PacketRelicSmartWearGetPinRelicScRsp(uint avatarId) : base(CmdIds.RelicSmartWearGetPinRelicScRsp)
    {
        var proto = new RelicSmartWearGetPinRelicScRsp
        {
            AvatarId = avatarId
        };

        SetData(proto);
    }
}
