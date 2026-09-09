using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PamSkin;

public class PacketGetPamSkinDataScRsp : BasePacket
{
    public PacketGetPamSkinDataScRsp(PlayerInstance player) : base(CmdIds.GetPamSkinDataScRsp)
    {
        var proto = new GetPamSkinDataScRsp
        {
            CurSkin = (uint)player.Data.CurrentPamSkin,
            UnlockSkinList = { GameData.PamSkinConfigData.Select(x => (uint)x.Key) }
        };

        SetData(proto);
    }
}
