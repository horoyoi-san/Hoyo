using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketUpdateGroupPropertyScRsp : BasePacket
{
    public PacketUpdateGroupPropertyScRsp(Retcode code) : base(CmdIds.UpdateGroupPropertyScRsp)
    {
        var proto = new UpdateGroupPropertyScRsp
        {
            Retcode = (uint)code
        };

        SetData(proto);
    }

    public PacketUpdateGroupPropertyScRsp(GroupPropertyRefreshData data, UpdateGroupPropertyCsReq req) : base(
        CmdIds.UpdateGroupPropertyScRsp)
    {
        var proto = new UpdateGroupPropertyScRsp
        {
            // TODO 4.3: 字段名变更 (ELKOCIJNABK/FNAODNGJAMM/ELNCJFFJFIH)，需重新确认 NewValue/OldValue 对应
            DimensionId = req.DimensionId,
            FloorId = req.FloorId,
            GroupId = (uint)data.GroupId,
            PropertyName = data.PropertyName
        };

        SetData(proto);
    }
}

