using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.UpdatePlayerSettingCsReq)]
public class HandlerUpdatePlayerSettingCsReq : Handler<UpdatePlayerSettingCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UpdatePlayerSettingCsReq req)
    {
        await connection.SendPacket(new PacketUpdatePlayerSettingScRsp(req.PlayerSetting));
    }
}
