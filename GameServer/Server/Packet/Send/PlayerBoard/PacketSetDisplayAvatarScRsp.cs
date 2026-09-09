using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;

public class PacketSetDisplayAvatarScRsp : BasePacket
{
    public PacketSetDisplayAvatarScRsp(SetDisplayAvatarCsReq avatar) : base(CmdIds.SetDisplayAvatarScRsp)
    {
        var proto = new SetDisplayAvatarScRsp();
        proto.DisplayAvatarList.AddRange(avatar.DisplayAvatarList);

        SetData(proto);
    }
}
