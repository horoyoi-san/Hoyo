using March7thHoney.GameServer.Game.Lobby;

namespace March7thHoney.GameServer.Game.MultiPlayer;

public class MultiPlayerGameServerManager
{
    public Dictionary<long, BaseMultiPlayerGameRoomInstance> Rooms { get; } = [];
    public long CurRoomId { get; set; }

    public BaseMultiPlayerGameRoomInstance? CreateRoom(LobbyRoomInstance lobbyRoom)
    {
        // No fight-room implementations are registered yet: the 4.2 MarbleGame physics core is not
        // restored because 4.4 has no typed marble sync protos (CmdFightMarbleType is empty and the
        // fight payload is opaque bytes). Plug game modes in here once a 4.4 capture clarifies them.
        return null;
    }

    public void RemoveRoom(long roomId)
    {
        Rooms.Remove(roomId, out _);
    }

    public BaseMultiPlayerGameRoomInstance? GetPlayerJoinedRoom(int uid)
    {
        foreach (var room in Rooms.Values)
            if (room.Players.Any(x => !x.LeaveGame && x.LobbyPlayer.Player.Uid == uid))
                return room;

        return null;
    }
}
