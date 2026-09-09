using March7thHoney.Database;
using March7thHoney.GameServer.Game.Sync;
using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.SetPlayerOutfitCsReq)]
public class HandlerSetPlayerOutfitCsReq : Handler<SetPlayerOutfitCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetPlayerOutfitCsReq req)
    {
        if (player == null) return;

        var outfits = req.DHKFCDAGHDM?.EAKOLIJOEPA;
        player.Data.PlayerOutfitList = outfits == null ? [] : outfits.Select(x => (int)x).ToList();
        DatabaseHelper.MarkDirty(player.Uid);

        await connection.SendPacket(new PacketPlayerSyncScNotify(new PlayerOutfitSyncData(player.Data.ToPlayerOutfitProto())));
        await connection.SendPacket(new PacketSetPlayerOutfitScRsp());
    }
}
