using March7thHoney.GameServer.Server.Packet.Send.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lobby;

[Opcode(CmdIds.LobbyCreateCsReq)]
public class HandlerLobbyCreateCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = LobbyCreateCsReq.Parser.ParseFrom(data);

        // GJNMHILINHC = game mode, HDJFGMGAOOF = lobby mode, JIDKDPPPDPF = game ext info
        var lobbyMode = req.HDJFGMGAOOF;
        var sealList = req.JIDKDPPPDPF?.LobbyMarbleInfo?.CIPEHBBKFIH.Select(x => (int)x).ToList() ?? [];

        var room = await ServerUtils.LobbyServerManager.CreateLobbyRoom(connection.Player!, req.GJNMHILINHC,
            (int)lobbyMode, sealList);
        await connection.SendPacket(new PacketLobbyCreateScRsp(room));
    }
}
