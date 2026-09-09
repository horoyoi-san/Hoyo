using MemoryPack;

namespace March7thHoney.Database.Friend;

[DbTable("Friend")]
public class FriendData : BaseDatabaseDataHelper
{
    public Dictionary<int, FriendDetailData> FriendDetailList { get; set; } = [];

    public List<int> FriendList { get; set; } = []; // leave for compatibility

    public List<int> BlackList { get; set; } = [];

    public List<int> SendApplyList { get; set; } = [];

    public List<int> ReceiveApplyList { get; set; } = [];

    public Dictionary<int, FriendChatHistory> ChatHistory { get; set; } = []; // key: friend uid
}

[MemoryPackable]
public partial class FriendDetailData
{
    public bool IsMark { get; set; }
    public string RemarkName { get; set; } = "";
}

[MemoryPackable]
public partial class FriendChatHistory
{
    public List<FriendChatData> MessageList { get; set; } = [];
}

[MemoryPackable]
public partial class FriendChatData
{
    public long SendTime { get; set; }
    public string Message { get; set; } = "";
    public int ExtraId { get; set; }
    public int SendUid { get; set; }
    public int ReceiveUid { get; set; }
}
