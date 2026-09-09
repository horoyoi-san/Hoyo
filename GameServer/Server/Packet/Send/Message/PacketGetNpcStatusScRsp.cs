using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Message;

public class PacketGetNpcStatusScRsp : BasePacket
{
    public PacketGetNpcStatusScRsp(PlayerInstance player) : base(CmdIds.GetNpcStatusScRsp)
    {
        var proto = new GetNpcStatusScRsp();

        foreach (var item in GameData.MessageContactsConfigData.Values)
            proto.NpcStatusList.Add(new NpcStatus
            {
                NpcId = (uint)item.ID,
                IsFinish = player.MessageManager!.GetMessageGroup(item.ID).Count > 0
            });

        SetData(proto);
    }
}
