using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketSetFriendRemarkNameScRsp : BasePacket
{
    public PacketSetFriendRemarkNameScRsp(uint uid, string remarkName)
        : base(CmdIds.SetFriendRemarkNameScRsp)
    {
        var proto = new SetFriendRemarkNameScRsp
        {
            Uid = uid,
            RemarkName = remarkName
        };

        SetData(proto);
    }
}
