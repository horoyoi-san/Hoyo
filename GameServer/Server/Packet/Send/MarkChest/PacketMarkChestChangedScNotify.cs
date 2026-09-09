using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.MarkChest;

public class PacketMarkChestChangedScNotify : BasePacket
{
    public PacketMarkChestChangedScNotify(PlayerInstance player) : base(CmdIds.MarkChestChangedScNotify)
    {
        var proto = new MarkChestChangedScNotify
        {
            MarkChestFuncInfo =
            {
                player.SceneData!.MarkedChestData.Select(x => new MarkChestFuncInfo
                {
                    FuncId = (uint)x.Key,
                    MarkChestInfoList = { x.Value.Select(y => y.ToProto()) }
                })
            }
        };

        SetData(proto);
    }
}
