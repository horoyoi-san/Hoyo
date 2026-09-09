using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Lobby;

/// <summary>
///     Server Manager:
///     a manager would be only initialized when the server is started
/// </summary>
public class LobbyServerManager
{
    public long CurLobbyRoomId { get; set; }
    public Dictionary<long, LobbyRoomInstance> LobbyRoomInstances { get; set; } = [];

    public async ValueTask<LobbyRoomInstance> CreateLobbyRoom(PlayerInstance ownerPlayer, FightGameMode gameMode,
        int lobbyMode, List<int> sealList)
    {
        var roomId = ++CurLobbyRoomId;
        var room = new LobbyRoomInstance(ownerPlayer, roomId, gameMode, lobbyMode);
        LobbyRoomInstances.Add(roomId, room);
        await room.AddPlayer(ownerPlayer, sealList, LobbyProtoValues.CharacterLeader);

        return room;
    }

    public void RemoveLobbyRoom(long roomId)
    {
        LobbyRoomInstances.Remove(roomId, out _);
    }

    public LobbyRoomInstance? GetPlayerJoinedRoom(int uid)
    {
        foreach (var room in LobbyRoomInstances.Values)
            if (room.Players.Any(x => x.Player.Uid == uid))
                return room;

        return null;
    }
}
