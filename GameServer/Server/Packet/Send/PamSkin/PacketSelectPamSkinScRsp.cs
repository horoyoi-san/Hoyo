using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PamSkin;

public class PacketSelectPamSkinScRsp : BasePacket
{
    public PacketSelectPamSkinScRsp(PlayerInstance player, int prevSkinId) : base(CmdIds.SelectPamSkinScRsp)
    {
        var proto = new SelectPamSkinScRsp
        {
            CurSkin = (uint)player.Data.CurrentPamSkin,
            SetSkin = (uint)prevSkinId
        };

        SetData(proto);
    }
}
