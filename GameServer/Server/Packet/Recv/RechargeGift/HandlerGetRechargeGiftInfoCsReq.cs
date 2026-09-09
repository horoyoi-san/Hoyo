using March7thHoney.GameServer.Server.Packet.Send.RechargeGift;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.RechargeGift;

[Opcode(CmdIds.GetRechargeGiftInfoCsReq)]
public class HandlerGetRechargeGiftInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetRechargeGiftInfoScRsp());
    }
}
