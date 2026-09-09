using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketUpdatePlayerSettingScRsp : BasePacket
{
    public PacketUpdatePlayerSettingScRsp(UpdatePlayerSetting setting) : base(CmdIds.UpdatePlayerSettingScRsp)
    {
        var proto = new UpdatePlayerSettingScRsp
        {
            PlayerSetting = setting
        };

        SetData(proto);
    }
}
