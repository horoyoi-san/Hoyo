using MemoryPack;
namespace March7thHoney.Data.Config.Character;

[MemoryPackable]
public partial class CharacterConfigInfo
{
    public List<SkillConfigInfo> SkillList { get; set; } = [];
    public List<string> AbilityList { get; set; } = [];
}
