using March7thHoney.Data;
using March7thHoney.GameServer.Server.Packet.Send.PamSkin;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.PamSkin;

[Opcode(CmdIds.SelectPamSkinCsReq)]
public class HandlerSelectPamSkinCsReq : Handler<SelectPamSkinCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SelectPamSkinCsReq req)
    {
        // Check if the skin is valid
        if (GameData.PamSkinConfigData.ContainsKey((int)req.PamSkin)) player.Data.CurrentPamSkin = (int)req.PamSkin;
        var prevSkinId = player.Data.CurrentPamSkin;

        await connection.SendPacket(new PacketSelectPamSkinScRsp(player, prevSkinId));
    }
}
