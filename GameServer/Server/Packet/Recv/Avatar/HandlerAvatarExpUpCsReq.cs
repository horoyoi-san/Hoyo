using March7thHoney.GameServer.Server.Packet.Send.Avatar;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.AvatarExpUpCsReq)]
public class HandlerAvatarExpUpCsReq : Handler<AvatarExpUpCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, AvatarExpUpCsReq req)
    {
        var returnItem = await player.InventoryManager!.LevelUpAvatar((int)req.BaseAvatarId, req.ItemCost);

        await connection.SendPacket(new PacketAvatarExpUpScRsp(returnItem));
    }
}
