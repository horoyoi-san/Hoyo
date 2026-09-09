using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Friend;

public class PacketSetFriendMarkScRsp : BasePacket
{
    public PacketSetFriendMarkScRsp(uint uid, bool isMark) : base(CmdIds.SetFriendMarkScRsp)
    {
        var proto = new SetFriendMarkScRsp
        {
            Uid = uid,
            BIJJOJNJHDO = isMark
        };

        SetData(proto);
    }
}

