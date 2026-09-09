using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.ReserveStaminaExchangeCsReq)]
public class HandlerReserveStaminaExchangeCsReq : Handler<ReserveStaminaExchangeCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ReserveStaminaExchangeCsReq req)
    {
        if (player == null) return;
        var amount = req.Num;
        if (amount <= 0 || player.Data.StaminaReserve < amount)
        {
            await connection.SendPacket(new PacketReserveStaminaExchangeScRsp(0));
        }
        else
        {
            player.Data.StaminaReserve -= amount;
            player.Data.Stamina += (int)amount;

            await connection.SendPacket(new PacketStaminaInfoScNotify(player));
            await connection.SendPacket(new PacketReserveStaminaExchangeScRsp(amount));
        }
    }
}
