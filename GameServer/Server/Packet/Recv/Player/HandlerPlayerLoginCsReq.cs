using March7thHoney.GameServer.Server.Packet.Send.ContentPackage;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerLoginCsReq)]
public class HandlerPlayerLoginCsReq : Handler<PlayerLoginCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, PlayerLoginCsReq req)
    {
        // Remember the client's language so the friend-list bot can answer this player's commands in it.
        player.Language = I18NManager.MapLanguageType(req.HOFEMNAIIHB);

        connection.State = SessionStateEnum.ACTIVE;
        await player.OnLogin();
        await connection.SendPacket(new PacketPlayerLoginScRsp(connection));
        await connection.SendPacket(new PacketContentPackageSyncDataScNotify());
    }
}
