using MemoryPack;
namespace March7thHoney.Data.Config.Rogue;

[MemoryPackable]
public partial class RogueDialogueEventConfigInfo
{
    public List<RogueDialogueEventOptionConfigInfo> OptionList { get; set; } = [];
}
