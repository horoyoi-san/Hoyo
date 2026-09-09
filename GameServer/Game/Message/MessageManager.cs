using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Message;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Message;

public class MessageManager(PlayerInstance player) : BasePlayerManager<MessageData>(player)
{
    public List<MessageSectionData> PendingMessagePerformSectionList { get; private set; } = [];

    #region Get

    public MessageSectionData? GetMessageSectionData(int sectionId)
    {
        GameData.MessageSectionConfigData.TryGetValue(sectionId, out var sectionConfig);
        if (sectionConfig == null) return null;
        var groupId = sectionConfig.GroupID;
        if (!Data.Groups.TryGetValue(groupId, out var group)) return null;
        return group.Sections.FirstOrDefault(m => m.SectionId == sectionId);
    }

    public List<MessageGroup> GetMessageGroup(int contactId)
    {
        GameData.MessageContactsConfigData.TryGetValue(contactId, out var contactConfig);
        if (contactConfig == null) return [];
        var stubFinishUnseen = !Player.MissionEnabled;
        var result = new List<MessageGroup>();
        foreach (var item in contactConfig.Groups)
            if (Data.Groups.TryGetValue(item.ID, out var group))
            {
                var groupInfo = new MessageGroup
                {
                    Id = (uint)item.ID,
                    Status = group.Status,
                    RefreshTime = group.RefreshTime
                };
                foreach (var section in group.Sections)
                {
                    var sectionInfo = new MessageSection
                    {
                        Id = (uint)section.SectionId,
                        Status = section.Status
                    };
                    sectionInfo.MessageItemList.AddRange(section.ToChooseItemId.Select(m => (uint)m));
                    sectionInfo.ItemList.AddRange(section.Items.Select(m => new MessageItem
                    {
                        ItemId = (uint)m.ItemId
                    }));
                    groupInfo.MessageSectionList.Add(sectionInfo);
                }

                groupInfo.MessageSectionId = (uint)group.CurrentSectionId;
                result.Add(groupInfo);
            }
            else if (stubFinishUnseen)
            {
                // EnableMission=false 时整个任务系统停掉，玩家永远走不到手机消息流程，
                // 但部分客户端解锁（如忘却之庭通过帕姆消息推进 4010105/4010134）会以
                // 消息组完成态作为门控。把未见过的组按"全部已完成"返回，对齐 stub 语义。
                var stub = new MessageGroup
                {
                    Id = (uint)item.ID,
                    Status = MessageGroupStatus.MessageGroupFinish,
                    RefreshTime = Extensions.GetUnixSec()
                };
                if (GameData.MessageGroupConfigData.TryGetValue(item.ID, out var groupConfig))
                {
                    foreach (var sid in groupConfig.MessageSectionIDList)
                        stub.MessageSectionList.Add(new MessageSection
                        {
                            Id = (uint)sid,
                            Status = MessageSectionStatus.MessageSectionFinish
                        });
                    if (groupConfig.MessageSectionIDList.Count > 0)
                        stub.MessageSectionId = (uint)groupConfig.MessageSectionIDList[^1];
                }
                result.Add(stub);
            }
            else
            {
                result.Add(new MessageGroup
                {
                    Id = (uint)item.ID,
                    Status = MessageGroupStatus.MessageGroupNone,
                    RefreshTime = 0
                });
            }

        return result;
    }

    #endregion

    #region Action

    public async ValueTask AddMessageSection(int sectionId)
    {
        GameData.MessageSectionConfigData.TryGetValue(sectionId, out var sectionConfig);
        if (sectionConfig == null) return;

        if (Data.Groups.TryGetValue(sectionConfig.GroupID, out var group) &&
            group.Sections.Find(x => x.SectionId == sectionId) != null)
            // already exist
            return;

        foreach (var item in sectionConfig.StartMessageItemIDList) await AddMessageItem(item);
    }

    public async ValueTask AddMessageItem(int itemId, bool sendPacket = true)
    {
        GameData.MessageItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null) return;
        var groupId = itemConfig.GroupID;
        var sectionId = itemConfig.SectionID;
        if (!Data.Groups.TryGetValue(groupId, out var group))
        {
            group = new MessageGroupData
            {
                GroupId = groupId,
                CurrentSectionId = sectionId,
                RefreshTime = Extensions.GetUnixSec(),
                Status = MessageGroupStatus.MessageGroupDoing
            };
            group.Sections.Add(new MessageSectionData
            {
                SectionId = sectionId,
                Status = MessageSectionStatus.MessageSectionDoing,
                ToChooseItemId = itemConfig.NextItemIDList
            });
            Data.Groups.Add(groupId, group);
        }
        else
        {
            group.CurrentSectionId = sectionId;
            group.RefreshTime = Extensions.GetUnixSec();
            group.Status = MessageGroupStatus.MessageGroupDoing;
            if (group.Sections.All(m => m.SectionId != sectionId)) // new section
            {
                group.Sections.Add(new MessageSectionData
                {
                    SectionId = sectionId,
                    Status = MessageSectionStatus.MessageSectionDoing,
                    ToChooseItemId = itemConfig.NextItemIDList
                });

                if (itemConfig.NextItemIDList.Count == 1)
                    await FinishMessageItem(itemConfig.NextItemIDList[0], false, true);
            }
            else // old
            {
                group.Sections.First(m => m.SectionId == sectionId).Status = MessageSectionStatus.MessageSectionDoing;
            }
        }

        // sync
        if (sendPacket)
        {
            var notify = new PacketPlayerSyncScNotify(group, group.Sections.First(m => m.SectionId == sectionId));
            await Player.SendPacket(notify);
        }
    }

    public async ValueTask FinishSection(int sectionId, bool sendPacket = true)
    {
        GameData.MessageSectionConfigData.TryGetValue(sectionId, out var sectionConfig);
        if (sectionConfig == null) return;
        var groupId = sectionConfig.GroupID;
        if (!Data.Groups.TryGetValue(groupId, out var group)) return;
        var section = group.Sections.First(m => m.SectionId == sectionId);
        if (section.Status != MessageSectionStatus.MessageSectionDoing) return;
        section.Status = MessageSectionStatus.MessageSectionFinish;
        if (group.Sections.All(m => m.Status == MessageSectionStatus.MessageSectionFinish))
            group.Status = MessageGroupStatus.MessageGroupFinish;

        // sync
        if (sendPacket)
        {
            var notify = new PacketPlayerSyncScNotify(group, section);
            await Player.SendPacket(notify);
        }

        // broadcast to mission system
        await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.MessagePerformSectionFinish);
        await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.MessageSectionFinish);
    }

    public async ValueTask FinishMessageItem(int itemId, bool sendPacket = true, bool trusted = false)
    {
        GameData.MessageItemConfigData.TryGetValue(itemId, out var itemConfig);
        if (itemConfig == null) return;
        var groupId = itemConfig.GroupID;
        var sectionId = itemConfig.SectionID;
        if (!Data.Groups.TryGetValue(groupId, out var group)) return;
        var section = group.Sections.First(m => m.SectionId == sectionId);
        if (section.Status != MessageSectionStatus.MessageSectionDoing) return;
        // Reject client ids that aren't currently offered — stops arbitrary message-flow advancement.
        // Internal auto-advance passes trusted:true (it may legitimately chain across sections).
        if (!trusted && !section.ToChooseItemId.Contains(itemId)) return;
        section.ToChooseItemId.Clear();
        section.Items.Add(new MessageItemData
        {
            ItemId = itemId
        });
        section.ToChooseItemId.AddRange(itemConfig.NextItemIDList);

        group.RefreshTime = Extensions.GetUnixSec();

        if (section.ToChooseItemId.Count == 1) // if only one item, auto finish
            await FinishMessageItem(section.ToChooseItemId[0], false, true);

        if (sendPacket)
        {
            // sync
            var notify = new PacketPlayerSyncScNotify(group, section);
            await Player.SendPacket(notify);
        }
    }

    #endregion
}
