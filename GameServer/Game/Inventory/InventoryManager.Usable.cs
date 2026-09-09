using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Item;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.Phone;
using March7thHoney.GameServer.Server.Packet.Send.Player;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    private async ValueTask<ItemData?> AddUsableItem(int itemId, int count, ItemConfigExcel itemConfig)
    {
        ItemData? itemData = null;
        switch (itemConfig.ItemSubType)
        {
            case ItemSubTypeEnum.HeadIcon:
                if (!Player.PlayerUnlockData!.HeadIcons.Contains(itemId))
                {
                    Player.PlayerUnlockData!.HeadIcons.Add(itemId);
                    MarkDirty();
                }
                break;
            case ItemSubTypeEnum.ChatBubble:
                if (!Player.PlayerUnlockData!.ChatBubbles.Contains(itemId))
                {
                    Player.PlayerUnlockData!.ChatBubbles.Add(itemId);
                    MarkDirty();
                    await Player.SendPacket(new PacketUnlockChatBubbleScNotify(itemId));
                }
                break;
            case ItemSubTypeEnum.PhoneTheme:
                if (!Player.PlayerUnlockData!.PhoneThemes.Contains(itemId))
                {
                    Player.PlayerUnlockData!.PhoneThemes.Add(itemId);
                    MarkDirty();
                    await Player.SendPacket(new PacketUnlockPhoneThemeScNotify(itemId));
                }
                break;
            case ItemSubTypeEnum.PersonalCard:
                if (!Player.PlayerUnlockData!.PersonalCards.Contains(itemId))
                {
                    Player.PlayerUnlockData!.PersonalCards.Add(itemId);
                    MarkDirty();
                }
                break;
            case ItemSubTypeEnum.PhoneCase:
                if (!Player.PlayerUnlockData!.PhoneCases.Contains(itemId))
                {
                    Player.PlayerUnlockData!.PhoneCases.Add(itemId);
                    MarkDirty();
                    await Player.SendPacket(new PacketUnlockPhoneCaseScNotify(itemId));
                }
                break;
            case ItemSubTypeEnum.PlayerOutfit:
                itemData = await PutItem(itemId, count);
                break;
            case ItemSubTypeEnum.AvatarSkin:
                if (!GameData.AvatarSkinData.TryGetValue(itemId, out var skinExcel)) break;
                var avatarId = skinExcel.AvatarID;
                if (!Player.PlayerUnlockData!.Skins.TryGetValue(avatarId, out var value))
                {
                    value = [];
                    Player.PlayerUnlockData.Skins[avatarId] = value;
                }

                if (!value.Contains(itemId))
                {
                    value.Add(itemId);
                    MarkDirty();
                    await Player.SendPacket(new PacketUnlockAvatarSkinScNotify(itemId));
                }
                break;
            case ItemSubTypeEnum.Food:
            case ItemSubTypeEnum.Book:
            case ItemSubTypeEnum.FindChest:
            case ItemSubTypeEnum.Gift:
            case ItemSubTypeEnum.ForceOpitonalGift:
                itemData = await PutItem(itemId, count);
                break;
        }

        itemData ??= new ItemData
        {
            ItemId = itemId,
            Count = count
        };
        return itemData;
    }
}
