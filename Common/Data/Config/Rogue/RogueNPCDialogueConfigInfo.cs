using MemoryPack;
namespace March7thHoney.Data.Config.Rogue;

[MemoryPackable]
public partial class RogueNPCDialogueConfigInfo : RogueDialogueBaseConfigInfo
{
    public int DialogueProgress { get; set; }
    public int UnlockID { get; set; }
    public int TalkNameID { get; set; }
}
