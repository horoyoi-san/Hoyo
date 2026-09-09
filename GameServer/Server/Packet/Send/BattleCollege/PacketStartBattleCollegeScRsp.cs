using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.BattleCollege;

public class PacketStartBattleCollegeScRsp : BasePacket
{
    public PacketStartBattleCollegeScRsp(uint id, Retcode retCode, BattleInstance? instance) : base(
        CmdIds.StartBattleCollegeScRsp)
    {
        var proto = new StartBattleCollegeScRsp
        {
            Retcode = (uint)retCode,
            Id = id
        };

        if (instance != null)
            proto.BattleInfo = instance.ToProto();

        SetData(proto);
    }
}
