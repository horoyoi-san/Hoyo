using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Message;

public class PacketGetNpcMessageGroupScRsp : BasePacket
{
    public PacketGetNpcMessageGroupScRsp(IEnumerable<uint> contactIdList, PlayerInstance instance) : base(
        CmdIds.GetNpcMessageGroupScRsp)
    {
        var proto = new GetNpcMessageGroupScRsp();

        foreach (var contactId in contactIdList)
        {
            var contact = instance.MessageManager!.GetMessageGroup((int)contactId);

            proto.MessageGroupList.AddRange(contact);
        }

        SetData(proto);
    }
}
