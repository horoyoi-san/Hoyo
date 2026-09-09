using March7thHoney.GameServer.Server.Packet.Send.TrainParty;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartyUseCardCsReq)]
public class HandlerTrainPartyUseCardCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartyUseCardCsReq.Parser.ParseFrom(data);
        var manager = connection.Player!.TrainPartyManager!;
        var ret = manager.UseCard(req.FGIHKKKOGJD);

        var rsp = new BasePacket(CmdIds.TrainPartyUseCardScRsp);
        rsp.SetData(new TrainPartyUseCardScRsp
        {
            FGIHKKKOGJD = req.FGIHKKKOGJD,
            Retcode = ret
        });
        await connection.SendPacket(rsp);
        await connection.SendPacket(new PacketTrainPartySettleNotify(connection.Player!));
    }
}
