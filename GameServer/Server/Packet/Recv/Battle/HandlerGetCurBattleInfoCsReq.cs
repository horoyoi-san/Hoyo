using March7thHoney.GameServer.Server.Packet.Send.Battle;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Battle;

[Opcode(CmdIds.GetCurBattleInfoCsReq)]
public class HandlerGetCurBattleInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetCurBattleInfoScRsp());
    }
}
