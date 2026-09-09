using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.MultiPlayer;

public abstract class BaseMultiPlayerGameRoomInstance(long roomId, LobbyRoomInstance parentLobby)
{
    public FightGameMode GameMode { get; } = parentLobby.GameMode;
    public long RoomId { get; } = roomId;
    public LobbyRoomInstance ParentLobby { get; } = parentLobby;
    public List<BaseGamePlayerInstance> Players { get; } = [];

    public BaseGamePlayerInstance? GetPlayerById(int uid)
    {
        return Players.FirstOrDefault(player => player.LobbyPlayer.Player.Uid == uid);
    }

    // 4.4 FightSessionInfo: BFBHKJLJJBJ { NOPDGKNKEEH = room id, MFLEPLDCJBC = game mode }
    public BFBHKJLJJBJ ToSessionInfo()
    {
        return new BFBHKJLJJBJ
        {
            NOPDGKNKEEH = (ulong)RoomId,
            MFLEPLDCJBC = GameMode
        };
    }
}
