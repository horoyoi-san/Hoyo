using Google.Protobuf;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Server.Packet;

public abstract class Handler
{
    public abstract Task OnHandle(Connection connection, byte[] header, byte[] data);
}

/// <summary>
///     Handler base for packets that need an authenticated player but carry no request body worth parsing.
///     Folds away the repeated <c>connection.Player!</c> dereference.
/// </summary>
public abstract class PlayerHandler : Handler
{
    public sealed override Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        return OnHandle(connection, connection.Player!);
    }

    protected abstract Task OnHandle(Connection connection, PlayerInstance player);
}

/// <summary>
///     Handler base that parses the request proto once and hands the handler the player plus typed request.
///     Replaces the per-file <c>Xxx.Parser.ParseFrom(data)</c> + <c>connection.Player!</c> boilerplate.
///     <see cref="MessageExtensions.MergeFrom(IMessage, byte[])" /> uses no reflection, so this stays NativeAOT-safe.
/// </summary>
public abstract class Handler<TReq> : Handler where TReq : IMessage<TReq>, new()
{
    public sealed override Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = new TReq();
        req.MergeFrom(data);
        return OnHandle(connection, connection.Player!, req);
    }

    protected abstract Task OnHandle(Connection connection, PlayerInstance player, TReq req);
}
