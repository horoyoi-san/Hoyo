using March7thHoney.GameServer.Server.Packet.Send.DiceCombat;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.DiceCombat;

[Opcode(CmdIds.GetDiceCombatShopDataCsReq)]
public class HandlerGetDiceCombatShopDataCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetDiceCombatShopDataScRsp());
    }
}
