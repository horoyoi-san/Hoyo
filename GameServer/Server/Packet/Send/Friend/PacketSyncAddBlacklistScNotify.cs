using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketSyncAddBlacklistScNotify : BasePacket
{
    public PacketSyncAddBlacklistScNotify(int uid)
        : base(CmdIds.SyncAddBlacklistScNotify)
    {
        var proto = new SyncAddBlacklistScNotify
        {
            Uid = (uint)uid
        };

        SetData(proto);
    }
}
