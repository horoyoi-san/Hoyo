using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketUpdateFloorSavedValueNotify : BasePacket
{
    public PacketUpdateFloorSavedValueNotify(string name, int savedValue, PlayerInstance player) : base(
        CmdIds.UpdateFloorSavedValueNotify)
    {
        var proto = new UpdateFloorSavedValueNotify
        {
            FloorId = (uint)player.SceneInstance!.FloorId,
            PlaneId = (uint)player.SceneInstance!.PlaneId,
            DimensionId = (uint)player.SceneInstance.ResolveDimensionId()
        };

        proto.SavedValue.Add(name, savedValue);

        SetData(proto);
    }

    public PacketUpdateFloorSavedValueNotify(Dictionary<string, int> update, PlayerInstance player) : base(
        CmdIds.UpdateFloorSavedValueNotify)
    {
        var proto = new UpdateFloorSavedValueNotify
        {
            FloorId = (uint)player.SceneInstance!.FloorId,
            PlaneId = (uint)player.SceneInstance!.PlaneId,
            DimensionId = (uint)player.SceneInstance.ResolveDimensionId()
        };

        foreach (var i in update) proto.SavedValue.Add(i.Key, i.Value);

        SetData(proto);
    }
}
