using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Phone;

public class PacketSelectPhoneThemeScRsp : BasePacket
{
    public PacketSelectPhoneThemeScRsp(uint themeId) : base(CmdIds.SelectPhoneThemeScRsp)
    {
        var proto = new SelectPhoneThemeScRsp
        {
            CurPhoneTheme = themeId
        };

        SetData(proto);
    }
}
