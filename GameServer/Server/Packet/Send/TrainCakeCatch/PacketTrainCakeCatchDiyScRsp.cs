using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainCakeCatch;

public class PacketTrainCakeCatchDiyScRsp : BasePacket
{
    public PacketTrainCakeCatchDiyScRsp(BFAKMCIJFCB diy) : base(CmdIds.TrainCakeCatchDiyScRsp)
    {
        SetData(new TrainCakeCatchDiyScRsp
        {
            NLJBJMDPBGN = diy
        });
    }
}
