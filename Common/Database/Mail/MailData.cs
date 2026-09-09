using MemoryPack;
using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Proto;

namespace March7thHoney.Database.Mail;

[DbTable("Mail")]
public class MailData : BaseDatabaseDataHelper
{
    public List<MailInfo> MailList { get; set; } = [];

    public List<MailInfo> NoticeMailList { get; set; } = [];

    public int NextMailId { get; set; } = 1;
}

[MemoryPackable]
public partial class MailInfo
{
    public int MailID { get; set; }
    public string SenderName { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public bool IsRead { get; set; }
    public bool IsStar { get; set; }
    public long SendTime { get; set; }
    public long ExpireTime { get; set; }
    public int TemplateID { get; set; }
    public MailAttachmentInfo Attachment { get; set; } = new();

    public ClientMail ToProto()
    {
        return new ClientMail
        {
            Id = (uint)MailID,
            Sender = SenderName,
            Content = Content,
            MailType = IsStar ? MailType.Star : MailType.Normal,
            ExpireTime = ExpireTime,
            IsRead = IsRead,
            TemplateId = (uint)TemplateID,
            Title = Title,
            Time = SendTime,
            Attachment = Attachment.ToProto()
        };
    }
}

[MemoryPackable]
public partial class MailAttachmentInfo
{
    public List<ItemData> Items { get; set; } = [];

    public bool HasValidItems()
    {
        return Items.Any(IsValidAttachmentItem);
    }

    public List<ItemData> GetValidItems()
    {
        return Items.Where(IsValidAttachmentItem).ToList();
    }

    public static bool CanStoreConfiguredAttachmentItem(int itemId, int count)
    {
        return itemId > 0 &&
               count > 0 &&
               (GameData.ItemConfigData.Count == 0 || GameData.ItemConfigData.ContainsKey(itemId));
    }

    public static bool IsValidAttachmentItem(ItemData item)
    {
        return item.ItemId > 0 &&
               item.Count > 0 &&
               GameData.ItemConfigData.ContainsKey(item.ItemId);
    }

    public ItemList ToProto()
    {
        return new ItemList
        {
            ItemList_ = { GetValidItems().Select(x => x.ToProto()).ToList() }
        };
    }
}
