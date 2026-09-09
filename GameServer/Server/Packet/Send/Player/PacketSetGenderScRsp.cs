using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketSetGenderScRsp : BasePacket
{
    public PacketSetGenderScRsp(int curAvatarPath) : base(CmdIds.SetGenderScRsp)
    {
        var proto = new SetGenderScRsp
        {
            Retcode = 0,
            CurAvatarPath = (MultiPathAvatarType)curAvatarPath
        };

        SetData(proto);
    }
}
