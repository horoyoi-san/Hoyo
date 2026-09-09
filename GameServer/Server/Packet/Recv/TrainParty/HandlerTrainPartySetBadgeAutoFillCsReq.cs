using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainParty;

[Opcode(CmdIds.TrainPartySetBadgeAutoFillCsReq)]
public class HandlerTrainPartySetBadgeAutoFillCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = TrainPartySetBadgeAutoFillCsReq.Parser.ParseFrom(data);
        var ret = connection.Player!.TrainPartyManager!.SetBadgeAutoFill(req.PELJACANAFH);

        var rsp = new BasePacket(CmdIds.TrainPartySetBadgeAutoFillScRsp);
        rsp.SetData(new TrainPartySetBadgeAutoFillScRsp
        {
            PELJACANAFH = req.PELJACANAFH,
            Retcode = ret
        });
        await connection.SendPacket(rsp);
    }
}
