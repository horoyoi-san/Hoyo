using March7thHoney.GameServer.Server.Packet.Send.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lobby;

[Opcode(CmdIds.LobbyStartFightCsReq)]
public class HandlerLobbyStartFightCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var room = ServerUtils.LobbyServerManager.GetPlayerJoinedRoom(connection.Player!.Uid);
        if (room == null)
        {
            await connection.SendPacket(new PacketLobbyStartFightScRsp(Retcode.RetLobbyRoomNotExist));
            return;
        }

        var code = await room.LobbyStartFight();
        await connection.SendPacket(new PacketLobbyStartFightScRsp(code));

        await room.StartFight();
    }
}
