using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("windy", "Game.Command.Windy.Desc", "Game.Command.Windy.Usage", permission: CommandPermissions.Windy)]
public class CommandWindy : ICommand
{
    [CommandDefault]
    public async ValueTask Windy(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var luaRoot = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Lua"));
        string filePath;
        try
        {
            filePath = HoyoToonLuaPayloadBuilder.ResolveLuaPath(luaRoot, arg.Raw);
        }
        catch (IOException)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Windy.ReadError", arg.Raw.Replace("\\", "/")));
            return;
        }

        if (File.Exists(filePath))
        {
            var fileBytes = await HoyoToonLuaPayloadBuilder.BuildAsync(luaRoot, arg.Raw);
            await arg.Target.SendPacket(new HandshakePacket(fileBytes));
            await arg.SendMsg(I18NManager.Translate("Game.Command.Windy.Loaded", filePath.Replace("\\", "/")));
        }
        else
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Windy.ReadError", arg.Raw.Replace("\\", "/")));
        }
    }
}
