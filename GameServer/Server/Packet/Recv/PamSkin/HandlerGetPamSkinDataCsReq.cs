using March7thHoney.GameServer.Server.Packet.Send.PamSkin;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.PamSkin;

[Opcode(CmdIds.GetPamSkinDataCsReq)]
public class HandlerGetPamSkinDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetPamSkinDataScRsp(player));
    }
}
