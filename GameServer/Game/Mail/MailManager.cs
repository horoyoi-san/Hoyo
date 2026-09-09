using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Mail;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.Mail;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Mail;

public class MailManager(PlayerInstance player) : BasePlayerManager<MailData>(player)
{
    public List<MailInfo> GetMailList()
    {
        return Data.MailList;
    }

    public MailInfo? GetMail(int mailId)
    {
        return Data.MailList.Find(x => x.MailID == mailId);
    }

    public List<uint> GetMailIdsWithAttachments()
    {
        return Data.MailList
            .Where(mail => mail.Attachment.HasValidItems())
            .Select(mail => (uint)mail.MailID)
            .ToList();
    }

    public void DeleteMail(int mailId)
    {
        var index = Data.MailList.FindIndex(x => x.MailID == mailId);
        if (index < 0) return;
        Data.MailList.RemoveAt(index);
    }

    public async ValueTask SendMail(string sender, string title, string content, int templateId, int expiredDay = 30)
    {
        var mail = new MailInfo
        {
            MailID = Data.NextMailId++,
            SenderName = sender,
            Content = content,
            Title = title,
            TemplateID = templateId,
            SendTime = DateTime.Now.ToUnixSec(),
            ExpireTime = DateTime.Now.AddDays(expiredDay).ToUnixSec()
        };

        Data.MailList.Add(mail);
        MarkDirty();

        await Player.SendPacket(new PacketNewMailScNotify(mail.MailID));
    }

    public async ValueTask SendMail(string sender, string title, string content, int templateId,
        List<ItemData> attachments, int expiredDay = 30)
    {
        var mail = new MailInfo
        {
            MailID = Data.NextMailId++,
            SenderName = sender,
            Content = content,
            Title = title,
            TemplateID = templateId,
            SendTime = DateTime.Now.ToUnixSec(),
            ExpireTime = DateTime.Now.AddDays(expiredDay).ToUnixSec(),
            Attachment = new MailAttachmentInfo
            {
                Items = attachments
            }
        };

        Data.MailList.Add(mail);
        MarkDirty();

        await Player.SendPacket(new PacketNewMailScNotify(mail.MailID));
    }

    public List<ClientMail> ToMailProto()
    {
        var list = new List<ClientMail>();

        foreach (var mail in Data.MailList) list.Add(mail.ToProto());

        return list;
    }

    public List<ClientMail> ToNoticeMailProto()
    {
        var list = new List<ClientMail>();

        foreach (var mail in Data.NoticeMailList) list.Add(mail.ToProto());

        return list;
    }

    public async ValueTask<TakeMailAttachmentResult> TakeAttachments(IEnumerable<uint> mailIds)
    {
        var result = new TakeMailAttachmentResult();

        foreach (var mailId in mailIds.Distinct())
        {
            var mail = GetMail((int)mailId);
            if (mail == null)
            {
                result.FailedMails.Add(new TakeMailAttachmentFailInfo(mailId, Retcode.RetMailMailIdInvalid));
                continue;
            }

            var validItems = mail.Attachment.GetValidItems();
            if (validItems.Count == 0)
            {
                result.FailedMails.Add(new TakeMailAttachmentFailInfo(mailId, Retcode.RetMailNoMailTakeAttachment));
                continue;
            }

            var attachmentItems = new List<ItemData>();
            var syncItems = new List<ItemData>();
            var avatars = new List<FormalAvatarInfo>();
            var newAvatarIds = new List<int>();

            foreach (var item in validItems)
            {
                if (await GrantAttachmentItem(item, attachmentItems, syncItems, avatars, newAvatarIds))
                    continue;

                result.FailedMails.Add(new TakeMailAttachmentFailInfo(mailId, Retcode.RetMailAttachementInvalid));
                break;
            }

            if (result.FailedMails.Any(mail => mail.MailId == mailId))
                continue;

            result.Attachment.Items.AddRange(attachmentItems);
            result.SyncItems.AddRange(syncItems);
            result.Avatars.AddRange(avatars);
            result.NewAvatarIds.AddRange(newAvatarIds);
            result.SuccessMailIds.Add(mailId);
            mail.Attachment.Items.Clear();
            mail.IsRead = true;
        }

        if (result.SuccessMailIds.Count > 0)
        {
            MarkDirty();

            if (result.SyncItems.Count > 0)
                await Player.SendPacket(new PacketPlayerSyncScNotify(result.SyncItems));

            if (result.Avatars.Count > 0)
                await Player.SendPacket(new PacketPlayerSyncScNotify(result.Avatars));

            foreach (var avatarId in result.NewAvatarIds)
                await Player.SendPacket(new PacketAddAvatarScNotify(avatarId, false));
        }

        return result;
    }

    private async ValueTask<bool> GrantAttachmentItem(ItemData item, List<ItemData> attachmentItems,
        List<ItemData> syncItems, List<FormalAvatarInfo> avatars, List<int> newAvatarIds)
    {
        var itemConfig = GameData.ItemConfigData[item.ItemId];
        if (itemConfig.ItemMainType == ItemMainTypeEnum.AvatarCard && HasAvatarAttachmentOptions(item))
            return await GrantAvatarAttachment(item, attachmentItems, avatars, newAvatarIds);

        var grantCount = GrantsOneAtATime(itemConfig.ItemMainType) ? item.Count : 1;
        var countPerGrant = GrantsOneAtATime(itemConfig.ItemMainType) ? 1 : item.Count;
        var rank = GetAttachmentRank(item, itemConfig.ItemMainType);
        var level = GetAttachmentLevel(item, itemConfig.ItemMainType);

        for (var i = 0; i < grantCount; i++)
        {
            var avatarBeforeGrant = itemConfig.ItemMainType == ItemMainTypeEnum.AvatarCard
                ? Player.AvatarManager?.GetFormalAvatar(item.ItemId)
                : null;

            var rawItem = await Player.InventoryManager!.AddItem(item.ItemId, countPerGrant, false, rank,
                level, item.Promotion, sync: false, returnRaw: true);
            if (rawItem != null)
            {
                syncItems.Add(rawItem);

                if (itemConfig.ItemMainType == ItemMainTypeEnum.AvatarCard && avatarBeforeGrant != null)
                {
                    ApplyAvatarAttachmentOptions(avatarBeforeGrant, item);
                    if (avatars.All(avatar => avatar.BaseAvatarId != avatarBeforeGrant.BaseAvatarId))
                        avatars.Add(avatarBeforeGrant);
                }

                var receivedItem = rawItem.Clone();
                receivedItem.Count = countPerGrant;
                attachmentItems.Add(receivedItem);
                continue;
            }

            if (itemConfig.ItemMainType == ItemMainTypeEnum.AvatarCard &&
                avatarBeforeGrant == null &&
                Player.AvatarManager?.GetFormalAvatar(item.ItemId) is { } grantedAvatar)
            {
                ApplyAvatarAttachmentOptions(grantedAvatar, item);
                avatars.Add(grantedAvatar);
                newAvatarIds.Add(grantedAvatar.BaseAvatarId);

                var receivedItem = item.Clone();
                receivedItem.Count = countPerGrant;
                attachmentItems.Add(receivedItem);
                continue;
            }

            if (itemConfig.ItemMainType == ItemMainTypeEnum.AvatarCard && avatarBeforeGrant != null)
            {
                ApplyAvatarAttachmentOptions(avatarBeforeGrant, item);
                if (avatars.All(avatar => avatar.BaseAvatarId != avatarBeforeGrant.BaseAvatarId))
                    avatars.Add(avatarBeforeGrant);

                continue;
            }

            return false;
        }

        return true;
    }

    private async ValueTask<bool> GrantAvatarAttachment(ItemData item, List<ItemData> attachmentItems,
        List<FormalAvatarInfo> avatars, List<int> newAvatarIds)
    {
        var avatar = Player.AvatarManager?.GetFormalAvatar(item.ItemId);
        var isNewAvatar = avatar == null;
        if (avatar == null)
        {
            var baseAvatarId = GameData.MultiplePathAvatarConfigData.TryGetValue(item.ItemId, out var multiPath)
                ? multiPath.BaseAvatarID
                : item.ItemId;

            await Player.InventoryManager!.AddItem(baseAvatarId, 1, false, sync: false, returnRaw: true);
            avatar = Player.AvatarManager?.GetFormalAvatar(baseAvatarId);
            if (avatar == null) return false;
        }

        ApplyAvatarAttachmentOptions(avatar, item);
        if (avatars.All(changedAvatar => changedAvatar.BaseAvatarId != avatar.BaseAvatarId))
            avatars.Add(avatar);

        if (isNewAvatar) newAvatarIds.Add(avatar.BaseAvatarId);

        var receivedItem = item.Clone();
        receivedItem.Count = 1;
        attachmentItems.Add(receivedItem);
        return true;
    }

    private static bool HasAvatarAttachmentOptions(ItemData item)
    {
        return item.Level > 1 || item.Promotion > 0 || item.Rank > 0 || item.TalentLevel > 0;
    }

    private static bool GrantsOneAtATime(ItemMainTypeEnum itemMainType)
    {
        return itemMainType is ItemMainTypeEnum.AvatarCard or ItemMainTypeEnum.Equipment or ItemMainTypeEnum.Relic;
    }

    private static int GetAttachmentRank(ItemData item, ItemMainTypeEnum itemMainType)
    {
        return itemMainType == ItemMainTypeEnum.Equipment ? Math.Clamp(item.Rank <= 0 ? 1 : item.Rank, 1, 5) : item.Rank;
    }

    private static int GetAttachmentLevel(ItemData item, ItemMainTypeEnum itemMainType)
    {
        if (itemMainType == ItemMainTypeEnum.Equipment) return Math.Clamp(item.Level, 1, 80);
        if (itemMainType == ItemMainTypeEnum.Relic &&
            GameData.RelicConfigData.TryGetValue(item.ItemId, out var relicConfig))
            return Math.Clamp(item.Level, 1, relicConfig.MaxLevel);

        return item.Level;
    }

    private static void ApplyAvatarAttachmentOptions(FormalAvatarInfo avatar, ItemData item)
    {
        var pathInfo = GetOrCreateAvatarPath(avatar, item.ItemId);

        if (item.Level > 1)
        {
            avatar.Level = Math.Clamp(item.Level, 1, 80);
            avatar.Promotion = item.Promotion > 0
                ? Math.Clamp(item.Promotion, 0, 6)
                : GameData.GetMinPromotionForLevel(avatar.Level);
        }
        else if (item.Promotion > 0)
        {
            avatar.Promotion = Math.Clamp(item.Promotion, 0, 6);
        }

        if (item.Rank > 0)
            pathInfo.Rank = Math.Clamp(item.Rank, 0, 6);

        if (item.TalentLevel > 0)
            ApplyAvatarTalentLevel(pathInfo, item.TalentLevel);
    }

    private static PathInfo GetOrCreateAvatarPath(FormalAvatarInfo avatar, int itemId)
    {
        var pathId = GameData.AvatarConfigData.ContainsKey(itemId) ? itemId : avatar.AvatarId;
        if (!avatar.PathInfos.TryGetValue(pathId, out var pathInfo))
        {
            pathInfo = new PathInfo(pathId);
            avatar.PathInfos[pathId] = pathInfo;
        }

        pathInfo.GetSkillTree();
        return pathInfo;
    }

    private static void ApplyAvatarTalentLevel(PathInfo pathInfo, int talentLevel)
    {
        if (!GameData.AvatarConfigData.TryGetValue(pathInfo.PathId, out var avatarExcel)) return;
        if (!avatarExcel.SkillTree.TryGetValue(pathInfo.EnhanceId, out var skills)) return;

        var skillTree = pathInfo.GetSkillTree();
        foreach (var skill in skills)
        {
            var maxLevel = Math.Max(skill.MaxLevel, 1);
            skillTree[skill.PointID] = talentLevel == int.MaxValue
                ? maxLevel
                : Math.Clamp(talentLevel, 1, maxLevel);
        }
    }
}

public class TakeMailAttachmentResult
{
    public MailAttachmentInfo Attachment { get; } = new();
    public List<ItemData> SyncItems { get; } = [];
    public List<FormalAvatarInfo> Avatars { get; } = [];
    public List<int> NewAvatarIds { get; } = [];
    public List<uint> SuccessMailIds { get; } = [];
    public List<TakeMailAttachmentFailInfo> FailedMails { get; } = [];
}

public record TakeMailAttachmentFailInfo(uint MailId, Retcode Retcode);
