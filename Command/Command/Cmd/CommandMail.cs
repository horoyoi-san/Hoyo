using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Mail;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("mail", "Game.Command.Mail.Desc", "Game.Command.Mail.Usage", permission: CommandPermissions.Mail)]
public class CommandMail : ICommand
{
    [CommandMethod("welcome")]
    public async ValueTask WelcomeMail(CommandArg arg)
    {
        if (arg.Args.Count > 1 && string.Equals(arg.Args[1], "all", StringComparison.OrdinalIgnoreCase))
        {
            await SendWelcomeMailToAll(arg);
            return;
        }

        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target.Player!;
        await SendDraftToConnection(arg.Target, BuildWelcomeDraft(player.Uid, player.Data.Name ?? ""));

        await arg.SendMsg(I18NManager.Translate("Game.Command.Mail.MailSentWithAttachment"));
    }

    [CommandMethod("all")]
    public async ValueTask MailAll(CommandArg arg)
    {
        if (!arg.Sender.HasPermission(CommandPermissions.TargetOthers))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.NoPermission"));
            return;
        }

        if (!TryParseMailArgs(arg.Args, 1, out var draft))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var sentCount = await SendDraftToAllUsers(draft);
        await arg.SendMsg($"Mail sent to {sentCount} users.");
    }

    [CommandDefault]
    public async ValueTask Mail(CommandArg arg)
    {
        if (arg.Args.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mail.Usage"));
            return;
        }

        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (!TryParseMailArgs(arg.Args, 0, out var draft))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        await SendDraftToConnection(arg.Target, draft);
        await arg.SendMsg(draft.Attachments.Count > 0
            ? I18NManager.Translate("Game.Command.Mail.MailSentWithAttachment")
            : I18NManager.Translate("Game.Command.Mail.MailSent"));
    }

    private static bool TryParseMailArgs(List<string> args, int startIndex, out MailDraft draft)
    {
        draft = new MailDraft("", "", "", 0, 0, []);
        if (args.Count < startIndex + 6) return false;
        if (!int.TryParse(args[startIndex + 1], out var templateId) ||
            !int.TryParse(args[startIndex + 2], out var expireDays))
            return false;

        var titleParts = new List<string>();
        var contentParts = new List<string>();
        var attachmentArgs = new List<string>();
        var mode = MailParseMode.None;
        var hasTitle = false;
        var hasContent = false;

        for (var i = startIndex + 3; i < args.Count; i++)
        {
            var text = args[i];
            switch (text)
            {
                case "_TITLE":
                    mode = MailParseMode.Title;
                    hasTitle = true;
                    continue;
                case "_CONTENT":
                    mode = MailParseMode.Content;
                    hasContent = true;
                    continue;
                case "_ATTACH":
                case "_ATTACHMENT":
                case "_ATTACHMENTS":
                    mode = MailParseMode.Attachment;
                    continue;
            }

            if (mode == MailParseMode.None && text.StartsWith('@')) continue;

            switch (mode)
            {
                case MailParseMode.Title:
                    titleParts.Add(text);
                    break;
                case MailParseMode.Content:
                    contentParts.Add(text);
                    break;
                case MailParseMode.Attachment:
                    attachmentArgs.Add(text);
                    break;
            }
        }

        if (!hasTitle || !hasContent) return false;

        var attachments = ParseAttachments(attachmentArgs);
        if (attachments == null) return false;

        draft = new MailDraft(
            args[startIndex],
            string.Join(" ", titleParts),
            string.Join(" ", contentParts),
            templateId,
            expireDays,
            attachments);
        return true;
    }

    private static List<ItemData>? ParseAttachments(List<string> args)
    {
        var attachments = new List<ItemData>();
        if (args.Count == 0) return attachments;

        for (var i = 0; i < args.Count;)
        {
            if (!int.TryParse(args[i], out var itemId) || itemId <= 0)
                return null;

            if (!GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig))
                return null;

            var attachment = new ItemData
            {
                ItemId = itemId,
                Count = 1,
                Rank = itemConfig.ItemMainType == ItemMainTypeEnum.Equipment ? 1 : 0,
                Level = 1,
                Promotion = 0
            };

            i++;
            var hasBareCount = false;
            var allowBareCount = true;
            while (i < args.Count)
            {
                var token = args[i];
                if (TryParseAttachmentModifier(token, attachment))
                {
                    if (char.ToLowerInvariant(token[0]) == 'x') hasBareCount = true;
                    allowBareCount = false;
                    i++;
                    continue;
                }

                if (allowBareCount && !hasBareCount && int.TryParse(token, out var count))
                {
                    if (count <= 0) return null;
                    attachment.Count = count;
                    hasBareCount = true;
                    allowBareCount = false;
                    i++;
                    continue;
                }

                break;
            }

            attachments.Add(attachment);
        }

        return attachments;
    }

    private static bool TryParseAttachmentModifier(string token, ItemData attachment)
    {
        if (token.Length < 2) return false;

        var prefix = char.ToLowerInvariant(token[0]);
        if (prefix is not ('x' or 'r' or 'l' or 'p' or 't' or 's' or 'e' or 'c')) return false;

        var rawValue = token[1..];
        var isMaxTalent = prefix == 't' && string.Equals(rawValue, "max", StringComparison.OrdinalIgnoreCase);
        var value = 0;
        if (!isMaxTalent && !int.TryParse(rawValue, out value)) return false;
        if (isMaxTalent) value = int.MaxValue;

        switch (prefix)
        {
            case 'x':
                if (value <= 0) return false;
                attachment.Count = value;
                return true;
            case 's':
            case 'e':
            case 'c':
            case 'r':
                if (value < 0) return false;
                attachment.Rank = value;
                return true;
            case 'l':
                if (value <= 0) return false;
                attachment.Level = value;
                return true;
            case 'p':
                if (value < 0) return false;
                attachment.Promotion = value;
                return true;
            case 't':
                if (value <= 0) return false;
                attachment.TalentLevel = value;
                return true;
            default:
                return false;
        }
    }

    private static async ValueTask SendWelcomeMailToAll(CommandArg arg)
    {
        if (!arg.Sender.HasPermission(CommandPermissions.TargetOthers))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.NoPermission"));
            return;
        }

        var sentCount = 0;
        foreach (var account in GetAllAccounts())
        {
            await SendDraftToUid(account.Uid, BuildWelcomeDraft(account.Uid, GetRecipientName(account)));
            sentCount++;
        }

        await arg.SendMsg($"Welcome mail sent to {sentCount} users.");
    }

    private static async ValueTask<int> SendDraftToAllUsers(MailDraft draft)
    {
        var sentCount = 0;
        foreach (var account in GetAllAccounts())
        {
            await SendDraftToUid(account.Uid, draft);
            sentCount++;
        }

        return sentCount;
    }

    private static List<AccountData> GetAllAccounts()
    {
        var accounts = DatabaseHelper.GetAllInstanceFromMap<AccountData>();
        if (accounts == null || accounts.Count == 0)
            accounts = DatabaseHelper.GetAllInstance<AccountData>();

        return accounts?
            .Where(account => account.Uid > 0)
            .GroupBy(account => account.Uid)
            .Select(group => group.First())
            .ToList() ?? [];
    }

    private static async ValueTask SendDraftToUid(int uid, MailDraft draft)
    {
        var connection = Listener.GetActiveConnection(uid);
        if (connection?.Player != null)
        {
            await SendDraftToConnection(connection, draft);
            return;
        }

        var mailData = DatabaseHelper.Instance?.GetInstanceOrCreateNew<MailData>(uid);
        if (mailData == null) return;

        mailData.MailList.Add(CreateMailInfo(mailData.NextMailId++, draft));
        DatabaseHelper.SaveDatabaseType(mailData);
    }

    private static async ValueTask SendDraftToConnection(Connection connection, MailDraft draft)
    {
        if (draft.Attachments.Count > 0)
        {
            await connection.Player!.MailManager!.SendMail(draft.Sender, draft.Title, draft.Content, draft.TemplateId,
                CloneAttachments(draft.Attachments), draft.ExpireDays);
            return;
        }

        await connection.Player!.MailManager!.SendMail(draft.Sender, draft.Title, draft.Content, draft.TemplateId,
            draft.ExpireDays);
    }

    private static MailInfo CreateMailInfo(int mailId, MailDraft draft)
    {
        var now = DateTime.Now;
        return new MailInfo
        {
            MailID = mailId,
            SenderName = draft.Sender,
            Title = draft.Title,
            Content = draft.Content,
            TemplateID = draft.TemplateId,
            SendTime = now.ToUnixSec(),
            ExpireTime = now.AddDays(draft.ExpireDays).ToUnixSec(),
            Attachment = new MailAttachmentInfo
            {
                Items = CloneAttachments(draft.Attachments)
            }
        };
    }

    private static MailDraft BuildWelcomeDraft(int uid, string username)
    {
        var config = ConfigManager.Config.ServerOption.WelcomeMail;
        var attachments = config.Items
            .Where(item => item.ItemId > 0 && item.Count > 0 && GameData.ItemConfigData.ContainsKey(item.ItemId))
            .Select(item => new ItemData
            {
                ItemId = item.ItemId,
                Count = item.Count,
                Rank = GetConfiguredAttachmentRank(item.ItemId, item.Rank),
                Level = item.Level,
                Promotion = item.Promotion,
                TalentLevel = item.TalentLevel
            })
            .ToList();

        return new MailDraft(
            FormatText(config.Sender, uid, username),
            FormatText(config.Title, uid, username),
            FormatText(config.Content, uid, username),
            config.TemplateId,
            config.ExpireDays,
            attachments);
    }

    private static List<ItemData> CloneAttachments(List<ItemData> attachments)
    {
        return [.. attachments.Select(attachment => attachment.Clone())];
    }

    private static string GetRecipientName(AccountData account)
    {
        return account.Username ?? account.Uid.ToString();
    }

    private static int GetConfiguredAttachmentRank(int itemId, int rank)
    {
        return GameData.ItemConfigData.TryGetValue(itemId, out var itemConfig) &&
               itemConfig.ItemMainType == ItemMainTypeEnum.Equipment &&
               rank <= 0
            ? 1
            : rank;
    }

    private static string FormatText(string value, int uid, string username)
    {
        return value
            .Replace("{uid}", uid.ToString())
            .Replace("{username}", username)
            .Replace("{account}", username);
    }

    private enum MailParseMode
    {
        None,
        Title,
        Content,
        Attachment
    }

    private record MailDraft(
        string Sender,
        string Title,
        string Content,
        int TemplateId,
        int ExpireDays,
        List<ItemData> Attachments);
}
