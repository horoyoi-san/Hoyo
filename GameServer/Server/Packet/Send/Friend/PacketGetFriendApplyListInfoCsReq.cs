using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketGetFriendApplyListInfoCsReq : BasePacket
{
    public PacketGetFriendApplyListInfoCsReq(Connection connection) : base(CmdIds.GetFriendApplyListInfoScRsp)
    {
        SetData(connection.Player!.FriendManager!.ToApplyListProto());
    }
}
