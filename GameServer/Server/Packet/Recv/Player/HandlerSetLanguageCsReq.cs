using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.SetLanguageCsReq)]
public class HandlerSetLanguageCsReq : Handler<SetLanguageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetLanguageCsReq req)
    {
        // Player switched language in settings — follow it so the friend-list bot keeps answering in their language.
        player.Language = I18NManager.MapLanguageType(req.HOFEMNAIIHB);

        await connection.SendPacket(new PacketSetLanguageScRsp(req.HOFEMNAIIHB));
    }
}
