using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketRetcodeNotify : BasePacket
{
    public PacketRetcodeNotify(Retcode retcode) : base(CmdIds.PlayerSyncScNotify)
    {
        // RetcodeNotify is unavailable in the current proto set.
        SetData(new PlayerSyncScNotify());
    }
}

