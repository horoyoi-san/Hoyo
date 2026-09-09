using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketSetPlayerInfoScRsp : BasePacket
{
    public PacketSetPlayerInfoScRsp(PlayerInstance player, bool IsModify) : base(CmdIds.SetPlayerInfoScRsp)
    {
        var proto = new SetPlayerInfoScRsp
        {
            CurAvatarPath = (MultiPathAvatarType)player.Data.CurBasicType,
            IsModify = IsModify
        };

        SetData(proto);
    }
}
