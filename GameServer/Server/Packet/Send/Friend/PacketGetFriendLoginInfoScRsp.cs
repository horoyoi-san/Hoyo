using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketGetFriendLoginInfoScRsp : BasePacket
{
    public PacketGetFriendLoginInfoScRsp(List<int> friends) : base(CmdIds.GetFriendLoginInfoScRsp)
    {
        var proto = new GetFriendLoginInfoScRsp();

        SetData(proto);
    }
}
