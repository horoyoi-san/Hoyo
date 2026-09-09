namespace March7thHoney.Kcp.KcpSharp;

internal interface IKcpConversationUpdateNotificationSource
{
    ReadOnlyMemory<byte> Packet { get; }
    void Release();
}