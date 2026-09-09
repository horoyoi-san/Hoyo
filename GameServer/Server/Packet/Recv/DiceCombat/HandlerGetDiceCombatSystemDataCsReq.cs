using March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;
using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.GetDiceCombatSystemDataCsReq)]
public class HandlerGetDiceCombatSystemDataCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var player = connection.Player!;
        var inventory = player.InventoryManager!;
        if (inventory.Data.MaterialItems.Find(x => x.ItemId == DiceCombatItems.CombatAnalystCertificateId) == null)
            await inventory.AddItem(DiceCombatItems.CombatAnalystCertificateId, 1);

        await connection.SendPacket(new PacketGetDiceCombatSystemDataScRsp(player));
    }
}
