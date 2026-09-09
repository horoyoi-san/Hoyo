namespace March7thHoney.GameServer.Server.Packet;

public static class HandlerManager
{
    public static Dictionary<int, Handler> handlers = [];

    public static void Init()
    {
        // Populated by the source generator (GeneratedHandlerRegistry) from every [Opcode] class — no reflection.
        handlers = GeneratedHandlerRegistry.Build();
    }

    public static Handler? GetHandler(int cmdId)
    {
        return handlers.GetValueOrDefault(cmdId);
    }
}
