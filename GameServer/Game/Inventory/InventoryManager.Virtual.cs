using March7thHoney.Data.Excel;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    private async ValueTask<ItemData?> AddVirtualItem(int itemId, int count, ItemConfigExcel itemConfig)
    {
        var actualCount = 0;
        switch (itemConfig.ID)
        {
            case 1:
                Player.Data.Hcoin += count;
                actualCount = Player.Data.Hcoin;
                break;
            case 2:
                Player.Data.Scoin += count;
                actualCount = Player.Data.Scoin;
                break;
            case 3:
                Player.Data.Mcoin += count;
                actualCount = Player.Data.Mcoin;
                break;
            case 11:
                Player.Data.Stamina += count;
                actualCount = Player.Data.Stamina;
                break;
            case 22:
                Player.Data.Exp += count;
                Player.OnAddExp();
                actualCount = Player.Data.Exp;
                break;
            case 32:
                Player.Data.TalentPoints += count;
                actualCount = Player.Data.TalentPoints;
                break;
        }

        if (count != 0)
        {
            await Player.SendPacket(new PacketPlayerSyncScNotify(Player.ToProto()));
            return new ItemData
            {
                ItemId = itemId,
                Count = actualCount
            };
        }

        return null;
    }
}
