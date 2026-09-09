using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerForceSyncGameStateFinishCsReq)]
public class HandlerForceSyncGameStateFinishCSReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        _ = PlayerForceSyncGameStateFinishCsReq.Parser.ParseFrom(data);

        var packet = new BasePacket((ushort)CmdIds.PlayerForceSyncGameStateFinishScRsp);
        packet.SetData(new PlayerForceSyncGameStateFinishScRsp());
        await connection.SendPacket(packet);
    }
}
