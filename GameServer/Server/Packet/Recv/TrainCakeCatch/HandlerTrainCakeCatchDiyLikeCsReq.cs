using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainCakeCatch;

[Opcode(CmdIds.TrainCakeCatchDiyLikeCsReq)]
public class HandlerTrainCakeCatchDiyLikeCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var packet = new BasePacket(CmdIds.TrainCakeCatchDiyLikeScRsp);
        packet.SetData(connection.Player!.TrainCakeCatchManager!.LikeDiy());
        await connection.SendPacket(packet);
    }
}
