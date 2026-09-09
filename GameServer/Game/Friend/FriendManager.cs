using March7thHoney.Database;
using March7thHoney.Database.Friend;
using March7thHoney.Database.Player;
using March7thHoney.GameServer.Command;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.GameServer.Server.Packet.Send.Chat;
using March7thHoney.GameServer.Server.Packet.Send.Friend;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Friend;

public class FriendManager(PlayerInstance player) : BasePlayerManager(player)
{
    public FriendData FriendData { get; set; } =
        DatabaseHelper.Instance!.GetInstanceOrCreateNew<FriendData>(player.Uid);

    public async ValueTask<Retcode> AddFriend(int targetUid)
    {
        if (targetUid == Player.Uid) return Retcode.RetSucc; // Cannot add self
        if (FriendData.FriendDetailList.ContainsKey(targetUid)) return Retcode.RetFriendAlreadyIsFriend;
        if (FriendData.BlackList.Contains(targetUid)) return Retcode.RetFriendInBlacklist;
        if (FriendData.SendApplyList.Contains(targetUid)) return Retcode.RetSucc; // Already send apply

        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        if (target == null) return Retcode.RetFriendPlayerNotFound;
        if (target.BlackList.Contains(Player.Uid)) return Retcode.RetFriendInTargetBlacklist;
        if (target.ReceiveApplyList.Contains(targetUid)) return Retcode.RetSucc; // Already receive apply

        FriendData.SendApplyList.Add(targetUid);
        target.ReceiveApplyList.Add(Player.Uid);

        var targetPlayer = Listener.GetActiveConnection(targetUid);
        if (targetPlayer != null)
            await targetPlayer.SendPacket(new PacketSyncApplyFriendScNotify(Player.Data));

        DatabaseHelper.MarkDirty(targetUid);
        return Retcode.RetSucc;
    }

    public async ValueTask<PlayerData?> ConfirmAddFriend(int targetUid)
    {
        if (targetUid == Player.Uid) return null; // Cannot add self
        if (FriendData.FriendDetailList.ContainsKey(targetUid)) return null;
        if (FriendData.BlackList.Contains(targetUid)) return null;

        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        var targetData = PlayerData.GetPlayerByUid(targetUid);
        if (target == null || targetData == null) return null;
        if (target.FriendDetailList.ContainsKey(Player.Uid)) return null;
        if (target.BlackList.Contains(Player.Uid)) return null;

        FriendData.ReceiveApplyList.Remove(targetUid);
        FriendData.FriendDetailList.Add(targetUid, new FriendDetailData());
        target.SendApplyList.Remove(Player.Uid);
        target.FriendDetailList.Add(Player.Uid, new FriendDetailData());

        var targetPlayer = Listener.GetActiveConnection(targetUid);
        if (targetPlayer != null)
            await targetPlayer.SendPacket(new PacketSyncHandleFriendScNotify((uint)Player.Uid, true, Player.Data));

        DatabaseHelper.MarkDirty(targetUid);
        return targetData;
    }

    public async ValueTask RefuseAddFriend(int targetUid)
    {
        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        if (target == null) return;

        FriendData.ReceiveApplyList.Remove(targetUid);
        target.SendApplyList.Remove(Player.Uid);

        var targetPlayer = Listener.GetActiveConnection(targetUid);
        if (targetPlayer != null)
            await targetPlayer.SendPacket(new PacketSyncHandleFriendScNotify((uint)Player.Uid, false, Player.Data));

        DatabaseHelper.MarkDirty(targetUid);
    }

    public async ValueTask<PlayerData?> AddBlackList(int targetUid)
    {
        var blackInfo = GetFriendPlayerData([targetUid]).First();
        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        if (blackInfo == null || target == null) return null;

        FriendData.FriendDetailList.Remove(targetUid);
        target.FriendDetailList.Remove(Player.Uid);
        if (!FriendData.BlackList.Contains(targetUid))
            FriendData.BlackList.Add(targetUid);

        var targetPlayer = Listener.GetActiveConnection(targetUid);
        if (targetPlayer != null)
            await targetPlayer.SendPacket(new PacketSyncAddBlacklistScNotify(Player.Uid));

        DatabaseHelper.MarkDirty(targetUid);
        return blackInfo;
    }

    public void RemoveBlackList(int targetUid)
    {
        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        if (target == null) return;
        FriendData.BlackList.Remove(targetUid);
    }

    public async ValueTask<int?> RemoveFriend(int targetUid)
    {
        var target = DatabaseHelper.Instance!.GetInstance<FriendData>(targetUid);
        if (target == null) return null;

        FriendData.FriendDetailList.Remove(targetUid);
        target.FriendDetailList.Remove(Player.Uid);

        var targetPlayer = Listener.GetActiveConnection(targetUid);
        if (targetPlayer != null)
            await targetPlayer.SendPacket(new PacketSyncDeleteFriendScNotify(Player.Uid));

        DatabaseHelper.MarkDirty(targetUid);
        return targetUid;
    }

    public async ValueTask SendMessage(int sendUid, int recvUid, string? message = null, int? extraId = null)
    {
        var data = BuildChatData(sendUid, recvUid, message, extraId);
        await PushPrivateMessageAsync(recvUid, (uint)sendUid, data);

        if (recvUid == ConfigManager.Config.ServerOption.ServerProfile.Uid)
            if (message?.StartsWith('/') == true)
            {
                var cmd = message[1..];
                CommandExecutor.ExecuteCommand(new PlayerCommandSender(Player), cmd);
            }

        // receive message
        var recvPlayer = Listener.GetActiveConnection(recvUid)?.Player;
        if (recvPlayer != null)
        {
            await recvPlayer.FriendManager!.ReceiveMessage(sendUid, recvUid, message, extraId);
        }
        else
        {
            // offline
            var friendData = DatabaseHelper.Instance!.GetInstance<FriendData>(recvUid);
            if (friendData == null) return; // not exist maybe server profile
            if (!friendData.ChatHistory.TryGetValue(sendUid, out var history))
            {
                friendData.ChatHistory[sendUid] = new FriendChatHistory();
                history = friendData.ChatHistory[sendUid];
            }

            history.MessageList.Add(data);

            DatabaseHelper.MarkDirty(recvUid);
        }
    }

    public async ValueTask SendInviteMessage(int sendUid, int recvUid, object info)
    {
        await ValueTask.CompletedTask;
    }

    public async ValueTask ReceiveMessage(int sendUid, int recvUid, string? message = null, int? extraId = null)
    {
        var data = BuildChatData(sendUid, recvUid, message, extraId);
        await PushPrivateMessageAsync(sendUid, (uint)sendUid, data);
    }

    public async ValueTask ReceiveInviteMessage(int sendUid, int recvUid, object info)
    {
        await ValueTask.CompletedTask;
    }

    public FriendDetailData? GetFriendDetailData(int uid)
    {
        if (uid == ConfigManager.Config.ServerOption.ServerProfile.Uid)
            return new FriendDetailData { IsMark = true };

        if (!FriendData.FriendDetailList.TryGetValue(uid, out var friend)) return null;

        return friend;
    }

    public List<ChatMessageData> GetHistoryInfo(int uid)
    {
        if (!FriendData.ChatHistory.TryGetValue(uid, out var history)) return [];

        var info = new List<ChatMessageData>();

        foreach (var chat in history.MessageList)
        {
            var chatData = new ChatData();
            if (chat.ExtraId > 0)
                chatData.ExtraId = (uint)chat.ExtraId;
            else
                chatData.MessageText = chat.Message;

            info.Add(new ChatMessageData
            {
                CreateTime = (ulong)chat.SendTime,
                CKHPFFENOBE = new EKNABKLPEEL
                {
                    KPOBMNLKLOK = HCMEILLLKBD.Jdoaipkbipe,
                    RoleId = (uint)chat.SendUid
                },
                MessageDatas =
                {
                    new MessageChatData
                    {
                        MessageType = chat.ExtraId > 0 ? MsgType.Emoji : MsgType.CustomText,
                        ChatData = chatData
                    }
                }
            });
        }

        info.Reverse();

        return info;
    }

    private static FriendChatData BuildChatData(int sendUid, int recvUid, string? message, int? extraId)
    {
        return new FriendChatData
        {
            SendUid = sendUid,
            ReceiveUid = recvUid,
            Message = message ?? "",
            ExtraId = extraId ?? 0,
            SendTime = Extensions.GetUnixSec()
        };
    }

    private async ValueTask PushPrivateMessageAsync(int historyKeyUid, uint sourceUid, FriendChatData data)
    {
        if (!FriendData.ChatHistory.TryGetValue(historyKeyUid, out var history))
        {
            FriendData.ChatHistory[historyKeyUid] = new FriendChatHistory();
            history = FriendData.ChatHistory[historyKeyUid];
        }

        history.MessageList.Add(data);

        await Player.SendPacket(new PacketRevcMsgScNotify(
            sourceUid,
            (uint)historyKeyUid,
            data.ExtraId > 0 ? null : data.Message,
            (uint)data.ExtraId,
            data.SendTime));
    }

    public List<PlayerData> GetFriendPlayerData(List<int>? uids = null)
    {
        var list = new List<PlayerData>();
        uids ??= [.. FriendData.FriendDetailList.Keys];

        foreach (var friend in uids)
        {
            var player = PlayerData.GetPlayerByUid(friend);
            if (player != null) list.Add(player);
        }

        var serverProfile = ConfigManager.Config.ServerOption.ServerProfile;
        list.Add(new PlayerData
        {
            Uid = serverProfile.Uid,
            HeadIcon = serverProfile.HeadIcon,
            Signature = serverProfile.Signature,
            Level = serverProfile.Level,
            WorldLevel = 0,
            Name = serverProfile.Name,
            ChatBubble = serverProfile.ChatBubbleId,
            PersonalCard = serverProfile.PersonalCardId
        });

        return list;
    }

    public List<PlayerData> GetBlackList()
    {
        List<PlayerData> list = [];

        foreach (var friend in FriendData.BlackList)
        {
            var player = PlayerData.GetPlayerByUid(friend);

            if (player != null) list.Add(player);
        }

        return list;
    }

    public List<PlayerData> GetSendApplyList()
    {
        List<PlayerData> list = [];

        foreach (var friend in FriendData.SendApplyList)
        {
            var player = PlayerData.GetPlayerByUid(friend);

            if (player != null) list.Add(player);
        }

        return list;
    }

    public List<PlayerData> GetReceiveApplyList()
    {
        List<PlayerData> list = [];

        foreach (var friend in FriendData.ReceiveApplyList)
        {
            var player = PlayerData.GetPlayerByUid(friend);

            if (player != null) list.Add(player);
        }

        return list;
    }

    public List<PlayerData> GetRandomFriend()
    {
        var list = new List<PlayerData>();

        foreach (var kcp in March7thHoneyListener.GetSnapshot())
        {
            if (kcp.State != SessionStateEnum.ACTIVE) continue;
            if (kcp is not Connection connection) continue;
            if (connection.Player?.Uid == Player.Uid) continue;
            var data = connection.Player?.Data;
            if (data == null) continue;
            list.Add(data);
        }

        return list.Take(20).ToList();
    }

    public void RemarkFriendName(int uid, string remarkName)
    {
        if (!FriendData.FriendDetailList.TryGetValue(uid, out var friend)) return;
        friend.RemarkName = remarkName;
    }

    public void MarkFriend(int uid, bool isMark)
    {
        if (!FriendData.FriendDetailList.TryGetValue(uid, out var friend)) return;
        friend.IsMark = isMark;
    }

    public GetFriendListInfoScRsp ToProto()
    {
        var proto = new GetFriendListInfoScRsp();

        foreach (var player in GetFriendPlayerData())
        {
            var status = Listener.GetActiveConnection(player.Uid) == null
                ? FriendOnlineStatus.Offline
                : FriendOnlineStatus.Online;
            var friend = GetFriendDetailData(player.Uid) ?? new FriendDetailData();

            proto.FriendList.Add(new FriendSimpleInfo
            {
                PlayerInfo = player.ToSimpleProto(status),
                IsMarked = friend.IsMark,
                RemarkName = friend.RemarkName
            });
        }

        foreach (var player in GetBlackList())
        {
            var status = Listener.GetActiveConnection(player.Uid) == null
                ? FriendOnlineStatus.Offline
                : FriendOnlineStatus.Online;
            proto.BlackList.Add(player.ToSimpleProto(status));
        }

        return proto;
    }

    public GetFriendApplyListInfoScRsp ToApplyListProto()
    {
        GetFriendApplyListInfoScRsp proto = new();

        foreach (var player in GetSendApplyList()) proto.SendApplyList.Add((uint)player.Uid);

        foreach (var player in GetReceiveApplyList())
        {
            var status = Listener.GetActiveConnection(player.Uid) == null
                ? FriendOnlineStatus.Offline
                : FriendOnlineStatus.Online;
            proto.ReceiveApplyList.Add(new FriendApplyInfo
            {
                PlayerInfo = player.ToSimpleProto(status)
            });
        }

        return proto;
    }
}
