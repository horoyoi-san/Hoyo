using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.GameServer.Server.Packet.Send.Lobby;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lobby;

[Opcode(CmdIds.LobbyModifyPlayerInfoCsReq)]
public class HandlerLobbyModifyPlayerInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = LobbyModifyPlayerInfoCsReq.Parser.ParseFrom(data);

        var room = ServerUtils.LobbyServerManager.GetPlayerJoinedRoom(connection.Player!.Uid);
        if (room == null)
        {
            await connection.SendPacket(new PacketLobbyModifyPlayerInfoScRsp(Retcode.RetLobbyRoomNotExist));
            return;
        }

        var player = room.GetPlayerByUid(connection.Player.Uid);
        if (player == null)
        {
            await connection.SendPacket(new PacketLobbyModifyPlayerInfoScRsp(Retcode.RetLobbyRoomNotExist));
            return;
        }

        if (req.JIDKDPPPDPF?.LobbyMarbleInfo != null)
            player.EquippedSealList = req.JIDKDPPPDPF.LobbyMarbleInfo.CIPEHBBKFIH.Select(x => (int)x).ToList();

        if (req.Type == LobbyProtoValues.ModifyReady)
            player.CharacterStatus = LobbyProtoValues.StatusReady;
        else if (req.Type == LobbyProtoValues.ModifyOperating)
            player.CharacterStatus = LobbyProtoValues.StatusOperating;

        await room.BroadCastToRoom(new PacketLobbySyncInfoScNotify(player.Player.Uid, room, req.Type));
        await connection.SendPacket(new PacketLobbyModifyPlayerInfoScRsp(Retcode.RetSucc));
    }
}
