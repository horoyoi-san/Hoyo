using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;

public class PacketSetHeadIconScRsp : BasePacket
{
    public PacketSetHeadIconScRsp(PlayerInstance player) : base(CmdIds.SetHeadIconScRsp)
    {
        var proto = new SetHeadIconScRsp
        {
            CurrentHeadIconId = (uint)player.Data.HeadIcon
        };
        SetData(proto);
    }
}
