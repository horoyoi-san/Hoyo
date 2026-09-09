using March7thHoney.Database.TrainParty;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.TrainParty;

public class PacketTrainPartyBuildDiyScRsp : BasePacket
{
    public PacketTrainPartyBuildDiyScRsp(TrainAreaInfo? area) : base(CmdIds.TrainPartyBuildDiyScRsp)
    {
        // 4.4 replaced the inline DynamicInfo echo with a re-architected rep field (JKPJFKCBIEM/BHOPIKPAMPJ)
        // with no recoverable mapping. Return the essential ack (area id + retcode); the placed decoration
        // state re-syncs via GetData / BuildRoom notify.
        var proto = area == null
            ? new TrainPartyBuildDiyScRsp
            {
                Retcode = (uint)Retcode.RetTrainPartyDiyTagNotMatch
            }
            : new TrainPartyBuildDiyScRsp
            {
                AreaId = (uint)area.AreaId
            };

        SetData(proto);
    }
}
