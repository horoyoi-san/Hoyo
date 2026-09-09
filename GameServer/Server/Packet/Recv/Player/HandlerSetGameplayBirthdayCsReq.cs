using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.SetGameplayBirthdayCsReq)]
public class HandlerSetGameplayBirthdayCsReq : Handler<SetGameplayBirthdayCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetGameplayBirthdayCsReq req)
    {
        var month = req.Birthday / 100;
        var day = req.Birthday % 100;
        if (month < 1 || month > 12 || day < 1 || day > 31)
        {
            await connection.SendPacket(new PacketSetGameplayBirthdayScRsp());
            return;
        }

        var playerData = player.Data;
        if (playerData.Birthday != 0)
        {
            await connection.SendPacket(new PacketSetGameplayBirthdayScRsp());
            return;
        }

        playerData.Birthday = (int)req.Birthday;

        await connection.SendPacket(new PacketSetGameplayBirthdayScRsp(req.Birthday));
    }
}
