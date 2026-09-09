using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Lobby;

// The 4.4 lobby enums (LobbyModifyType / LobbyCharacterStatus / LKFBIALLBDK) only survive with
// obfuscated member names; the pre-4.2 friendly-named protos the original Multiplayer module
// compiled against never existed in this repo. These numeric values are INFERRED from typical
// declaration order and MUST be verified against a live 4.4 client capture before the lobby flow
// is considered correct.
public static class LobbyProtoValues
{
    // LKFBIALLBDK (lobby character type, values 0-3)
    public const LKFBIALLBDK CharacterNone = (LKFBIALLBDK)0;
    public const LKFBIALLBDK CharacterLeader = (LKFBIALLBDK)1;
    public const LKFBIALLBDK CharacterMember = (LKFBIALLBDK)2;
    public const LKFBIALLBDK CharacterWatcher = (LKFBIALLBDK)3;

    // LobbyCharacterStatus (values 0-7)
    public const LobbyCharacterStatus StatusIdle = (LobbyCharacterStatus)0;
    public const LobbyCharacterStatus StatusReady = (LobbyCharacterStatus)1;
    public const LobbyCharacterStatus StatusOperating = (LobbyCharacterStatus)2;
    public const LobbyCharacterStatus StatusLobbyStartFight = (LobbyCharacterStatus)3;
    public const LobbyCharacterStatus StatusFighting = (LobbyCharacterStatus)4;

    // LobbyModifyType (values 0-18)
    public const LobbyModifyType ModifyJoinLobby = (LobbyModifyType)1;
    public const LobbyModifyType ModifyQuitLobby = (LobbyModifyType)2;
    public const LobbyModifyType ModifyReady = (LobbyModifyType)3;
    public const LobbyModifyType ModifyOperating = (LobbyModifyType)4;
    public const LobbyModifyType ModifyLobbyStartFight = (LobbyModifyType)5;
    public const LobbyModifyType ModifyFightStart = (LobbyModifyType)6;
    public const LobbyModifyType ModifyFightEnd = (LobbyModifyType)7;
}
