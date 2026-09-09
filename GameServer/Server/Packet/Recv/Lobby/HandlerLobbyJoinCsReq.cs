using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.GameServer.Server.Packet.Send.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lobby;

[Opcode(CmdIds.LobbyJoinCsReq)]
public class HandlerLobbyJoinCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = LobbyJoinCsReq.Parser.ParseFrom(data);

        var room = ServerUtils.LobbyServerManager.LobbyRoomInstances.GetValueOrDefault((long)req.RoomId);

        if (room == null)
        {
            await connection.SendPacket(new PacketLobbyJoinScRsp(Retcode.RetLobbyRoomNotExist));
            return;
        }

        if (room.Players.Count >= 2)
        {
            await connection.SendPacket(new PacketLobbyJoinScRsp(Retcode.RetLobbyRoomPalyerFull));
            return;
        }

        var player = room.GetPlayerByUid(connection.Player!.Uid);
        if (player != null)
        {
            await connection.SendPacket(new PacketLobbyJoinScRsp(Retcode.RetLobbyRoomPalyerFull));
            return;
        }

        var sealList = req.JIDKDPPPDPF?.LobbyMarbleInfo?.CIPEHBBKFIH.Select(x => (int)x).ToList() ?? [];
        await room.AddPlayer(connection.Player!, sealList, LobbyProtoValues.CharacterMember);

        await connection.SendPacket(new PacketLobbyJoinScRsp(room));
    }
}
