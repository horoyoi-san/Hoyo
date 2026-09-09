using MemoryPack;
using March7thHoney.Proto;

namespace March7thHoney.Database.Message;

[DbTable("Message")]
public class MessageData : BaseDatabaseDataHelper
{
    public Dictionary<int, MessageGroupData> Groups { get; set; } = [];
}

[MemoryPackable]
public partial class MessageGroupData
{
    public int GroupId { get; set; }
    public List<MessageSectionData> Sections { get; set; } = [];
    public MessageGroupStatus Status { get; set; } = MessageGroupStatus.MessageGroupNone;
    public long RefreshTime { get; set; }
    public int CurrentSectionId { get; set; }
}

[MemoryPackable]
public partial class MessageSectionData
{
    public int SectionId { get; set; }
    public MessageSectionStatus Status { get; set; } = MessageSectionStatus.MessageSectionNone;
    public List<MessageItemData> Items { get; set; } = [];
    public List<int> ToChooseItemId { get; set; } = [];
}

[MemoryPackable]
public partial class MessageItemData
{
    public int ItemId { get; set; }
}
