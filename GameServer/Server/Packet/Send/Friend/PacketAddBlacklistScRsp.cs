using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketAddBlacklistScRsp : BasePacket
{
    public PacketAddBlacklistScRsp() : base(CmdIds.AddBlacklistScRsp)
    {
        var proto = new AddBlacklistScRsp();

        SetData(proto);
    }

    public PacketAddBlacklistScRsp(PlayerData player) : base(CmdIds.AddBlacklistScRsp)
    {
        var status = Listener.GetActiveConnection(player.Uid) == null
            ? FriendOnlineStatus.Offline
            : FriendOnlineStatus.Online;

        var proto = new AddBlacklistScRsp
        {
            BlackInfo = player.ToSimpleProto(status)
        };

        SetData(proto);
    }
}
