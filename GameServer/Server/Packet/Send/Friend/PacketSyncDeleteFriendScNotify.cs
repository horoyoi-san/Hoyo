using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketSyncDeleteFriendScNotify : BasePacket
{
    public PacketSyncDeleteFriendScNotify(int uid)
        : base(CmdIds.SyncDeleteFriendScNotify)
    {
        var proto = new SyncDeleteFriendScNotify
        {
            Uid = (uint)uid
        };

        SetData(proto);
    }
}
