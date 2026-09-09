using JNFDGPDHENJ = March7thHoney.Proto.PlayerSqueezedScNotify.Types.AAFEHKFADDH.Types.JNFDGPDHENJ;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketPlayerSqueezedScNotify : BasePacket
{
    public PacketPlayerSqueezedScNotify() : base(CmdIds.PlayerSqueezedScNotify)
    {
        var proto = new PlayerSqueezedScNotify
        {
            KickType = (JNFDGPDHENJ)0
        };
        SetData(proto);
    }

    public PacketPlayerSqueezedScNotify(JNFDGPDHENJ type, BlackInfo? info = null) : base(CmdIds.PlayerSqueezedScNotify)
    {
        var proto = new PlayerSqueezedScNotify
        {
            KickType =type
        };

        if (info != null) proto.BlackInfo = info;

        SetData(proto);
    }
}
