using March7thHoney.Kcp;
using March7thHoney.Proto;
using Google.Protobuf.Collections;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;

public class PacketSetAssistAvatarScRsp : BasePacket
{
    public PacketSetAssistAvatarScRsp(RepeatedField<uint> avatarId) : base(CmdIds.SetAssistAvatarScRsp)
    {
        var proto = new SetAssistAvatarScRsp();
        proto.AvatarIdList.AddRange(avatarId);

        SetData(proto);
    }
}
