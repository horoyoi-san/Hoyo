using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketUnlockPhoneThemeScNotify : BasePacket
{
    public PacketUnlockPhoneThemeScNotify(int themeId) : base(CmdIds.UnlockPhoneThemeScNotify)
    {
        SetData(new UnlockPhoneThemeScNotify { ThemeId = (uint)themeId });
    }
}
