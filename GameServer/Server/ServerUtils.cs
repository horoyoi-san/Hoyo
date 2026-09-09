using March7thHoney.GameServer.Game.Lobby;
using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.MultiPlayer;

namespace March7thHoney.GameServer.Server;

public static class ServerUtils
{
    // Server-wide singletons for the multiplayer lobby/fight framework (no reflection — NativeAOT safe).
    public static LobbyServerManager LobbyServerManager { get; } = new();
    public static MultiPlayerGameServerManager MultiPlayerGameServerManager { get; } = new();

    public static void InitializeHandlers()
    {
        // Mission finish-action / finish-type handlers, populated by the source-generated
        // GeneratedMissionHandlers (MissionHandlerRegistryGenerator) — no reflection (NativeAOT safe).
        GeneratedMissionHandlers.Register();
    }
}
