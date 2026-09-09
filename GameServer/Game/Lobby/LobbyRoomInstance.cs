using March7thHoney.GameServer.Game.Lobby.Player;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.GameServer.Server.Packet.Send.Lobby;
using March7thHoney.GameServer.Server.Packet.Send.Multiplayer;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Lobby;

public class LobbyRoomInstance(PlayerInstance owner, long roomId, FightGameMode gameMode, int lobbyMode)
{
    public PlayerInstance Owner { get; } = owner;
    public long RoomId { get; set; } = roomId;
    public FightGameMode GameMode { get; set; } = gameMode;
    public List<LobbyPlayerInstance> Players { get; set; } = [];
    public int LobbyMode { get; set; } = lobbyMode;
    public bool IsInGame { get; set; }

    public async ValueTask BroadCastToRoom(BasePacket packet)
    {
        foreach (var player in Players) await player.Player.SendPacket(packet);
    }

    public async ValueTask AddPlayer(PlayerInstance player, List<int> sealList, LKFBIALLBDK characterType)
    {
        await AddPlayer(new LobbyPlayerInstance(player, characterType, this)
        {
            EquippedSealList = sealList
        });
    }

    public async ValueTask AddPlayer(LobbyPlayerInstance player)
    {
        if (Players.Any(x => x.Player.Uid == player.Player.Uid)) return;
        await BroadCastToRoom(new PacketLobbySyncInfoScNotify(player.Player.Uid, this, LobbyProtoValues.ModifyJoinLobby));
        Players.Add(player);
    }

    public async ValueTask RemovePlayer(int uid)
    {
        var remove = Players.RemoveAll(x => x.Player.Uid == uid);
        if (remove == 0) return;

        await BroadCastToRoom(new PacketLobbySyncInfoScNotify(uid, this, LobbyProtoValues.ModifyQuitLobby));
        if (Players.Count == 0)
            // remove from manager
            ServerUtils.LobbyServerManager.RemoveLobbyRoom(RoomId);
    }

    public async ValueTask<Retcode> LobbyStartFight()
    {
        // check status
        if (IsInGame)
            return Retcode.RetLobbyRoomPalyerFighting;

        if (Players.Count(x => x.CharacterType != LobbyProtoValues.CharacterWatcher) != 2)
            return Retcode.RetLobbyRoomPalyerNotReady;

        if (Players.Any(x =>
                x.CharacterType == LobbyProtoValues.CharacterMember &&
                x.CharacterStatus != LobbyProtoValues.StatusReady)) return Retcode.RetLobbyRoomPalyerNotReady;

        if (Players.Any(x =>
                x.CharacterType != LobbyProtoValues.CharacterWatcher &&
                x.EquippedSealList.Count != 3)) return Retcode.RetLobbyRoomPalyerNotReady;

        var leader = Players.Find(x => x.CharacterType == LobbyProtoValues.CharacterLeader);
        if (leader == null) return Retcode.RetLobbyRoomPalyerFighting;

        // start fight
        foreach (var instance in Players) instance.CharacterStatus = LobbyProtoValues.StatusLobbyStartFight;

        await BroadCastToRoom(new PacketLobbySyncInfoScNotify(leader.Player.Uid, this,
            LobbyProtoValues.ModifyLobbyStartFight));
        return Retcode.RetSucc;
    }

    public async ValueTask<Retcode> StartFight()
    {
        // alrdy check status in lobby start fight
        if (IsInGame)
            return Retcode.RetLobbyRoomPalyerFighting;

        // create fight room (null until a 4.4 fight-room implementation is registered)
        var fightRoom = ServerUtils.MultiPlayerGameServerManager.CreateRoom(this);
        if (fightRoom == null) return Retcode.RetLobbyRoomNotExist;

        IsInGame = true;
        await BroadCastToRoom(new PacketMultiplayerFightGameStartScNotify(fightRoom));

        // start fight
        foreach (var instance in Players) instance.CharacterStatus = LobbyProtoValues.StatusFighting;

        await BroadCastToRoom(new PacketLobbySyncInfoScNotify(0, this, LobbyProtoValues.ModifyFightStart));
        return Retcode.RetSucc;
    }

    public async ValueTask<Retcode> EndFight(LobbyPlayerInstance player)
    {
        // alrdy check status in lobby start fight
        IsInGame = false;
        player.CharacterStatus = LobbyProtoValues.StatusIdle;
        await BroadCastToRoom(new PacketLobbySyncInfoScNotify(player.Player.Uid, this, LobbyProtoValues.ModifyFightEnd));
        return Retcode.RetSucc;
    }

    public LobbyPlayerInstance? GetPlayerByUid(int uid)
    {
        var player = Players.FirstOrDefault(x => x.Player.Uid == uid);
        return player;
    }
}
