using MemoryPack;

namespace March7thHoney.Database.Player;

[DbTable("UnlockData")]
public class PlayerUnlockData : BaseDatabaseDataHelper
{
    public List<int> HeadIcons { get; set; } = [];
    public List<int> ChatBubbles { get; set; } = [];
    public List<int> PhoneThemes { get; set; } = [];
    public List<int> PersonalCards { get; set; } = [];
    public List<int> PhoneCases { get; set; } = [];
    public Dictionary<int, List<int>> Skins { get; set; } = [];
}
