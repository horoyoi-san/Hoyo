using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ServerPrefs;

public class PacketUpdateServerPrefsDataScRsp : BasePacket
{
    public PacketUpdateServerPrefsDataScRsp(uint prefsId) : base(CmdIds.UpdateServerPrefsDataScRsp)
    {
        var proto = new UpdateServerPrefsDataScRsp
        {
            ServerPrefsId = prefsId
        };

        SetData(proto);
    }
}
