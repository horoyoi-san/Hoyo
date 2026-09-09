using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketUnlockPhoneCaseScNotify : BasePacket
{
    public PacketUnlockPhoneCaseScNotify(int phoneCaseId) : base(CmdIds.UnlockPhoneCaseScNotify)
    {
        SetData(new UnlockPhoneCaseScNotify { PhoneCaseId = (uint)phoneCaseId });
    }
}
