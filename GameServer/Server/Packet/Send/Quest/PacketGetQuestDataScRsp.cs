using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Quest;

public class PacketGetQuestDataScRsp : BasePacket
{
    public PacketGetQuestDataScRsp(PlayerInstance player) : base(CmdIds.GetQuestDataScRsp)
    {
        var proto = new GetQuestDataScRsp();
        foreach (var quest in GameData.QuestDataData.Values)
            proto.QuestList.Add(new Proto.Quest
            {
                Id = (uint)quest.QuestID,
                Status = player.QuestManager?.GetQuestStatus(quest.QuestID) ?? QuestStatus.QuestNone
            });
        SetData(proto);
    }
}
