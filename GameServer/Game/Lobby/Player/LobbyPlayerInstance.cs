using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Lobby.Player;

public class LobbyPlayerInstance(PlayerInstance player, LKFBIALLBDK characterType, LobbyRoomInstance lobby)
{
    public PlayerInstance Player { get; } = player;
    public List<int> EquippedSealList { get; set; } = [];
    public LKFBIALLBDK CharacterType { get; set; } = characterType;
    public LobbyCharacterStatus CharacterStatus { get; set; } = LobbyProtoValues.StatusIdle;
    public LobbyRoomInstance LobbyRoom { get; set; } = lobby;

    // 4.4 lobby member payload: LMLNNHKJEIP { basic_info, GBBCBJCACIN (type+status), stage_info }
    public LMLNNHKJEIP ToProto()
    {
        return new LMLNNHKJEIP
        {
            GBBCBJCACIN = new CIGLIFFIIDC
            {
                NABJDHEPELK = CharacterType,
                Status = CharacterStatus
            },
            StageInfo = new LobbyGameExtInfo
            {
                LobbyMarbleInfo = new LobbyMarbleInfo
                {
                    CIPEHBBKFIH = { EquippedSealList.Select(x => (uint)x) },
                    Rank = 1
                }
            },
            BasicInfo = Player.Data.ToLobbyProto()
        };
    }
}
