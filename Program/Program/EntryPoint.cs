using March7thHoney.Command;
using March7thHoney.Command.Command;
using March7thHoney.Configuration;
using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums;
using March7thHoney.GameServer.Command;
using March7thHoney.GameServer.Server;
using March7thHoney.GameServer.Server.Packet;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Program.Generator;
using March7thHoney.Program.Handbook;
using March7thHoney.Util;
using March7thHoney.Util.License;
using March7thHoney.WebServer;
using March7thHoney.WebServer.Handler;
using March7thHoney.WebServer.Server;
using System.Globalization;
using System.IO.Compression;
using System.Runtime.InteropServices;

namespace March7thHoney.Program.Program;

public class EntryPoint
{
    private static readonly Logger Logger = new("Program");
    public static readonly DatabaseHelper DatabaseHelper = new();
    public static readonly Listener Listener = new();
    public static readonly CommandManager CommandManager = new();
    private static PosixSignalRegistration? _sigtermRegistration;

    public static async Task Main(string[] args)
    {
        var publicMode = PublicModeSwitch.Enabled;
        IConsole.InitConsole();
        IConsole.RedrawInput(IConsole.Input);
        AppDomain.CurrentDomain.ProcessExit += (_, _) =>
        {
            Logger.Info(I18NManager.Translate("Server.ServerInfo.Shutdown"));
            PerformCleanup();
        };
        AppDomain.CurrentDomain.UnhandledException += (obj, arg) =>
        {
            Logger.Error(I18NManager.Translate("Server.ServerInfo.UnhandledException", obj.GetType().Name),
                (Exception)arg.ExceptionObject);
            Logger.Info(I18NManager.Translate("Server.ServerInfo.Shutdown"));
            PerformCleanup();
            Environment.Exit(1);
        };

        Console.CancelKeyPress += (_, eventArgs) =>
        {
            Logger.Info(I18NManager.Translate("Server.ServerInfo.CancelKeyPressed"));
            eventArgs.Cancel = true;
            Environment.Exit(0);
        };
        // .NET 10 dropped ProcessExit on window-close/logoff/shutdown; hook the Win32 console control events so the DB save runs (Windows-only kernel32 P/Invoke).
        if (OperatingSystem.IsWindows())
            SetConsoleCtrlHandler(ConsoleCtrlHandlerKeepAlive, true);
        else if (OperatingSystem.IsLinux())
            _sigtermRegistration = PosixSignalRegistration.Create(PosixSignal.SIGTERM, OnSigTerm);
        var time = DateTime.Now;

        // pack the old log
        var logDirectory = new DirectoryInfo(GetConfig().Path.LogPath);
        if (logDirectory.Exists)
        {
            List<string> packed = [];
            foreach (var oldFile in logDirectory.GetFiles().ToArray())
            {
                if (!oldFile.Name.EndsWith(".log")) continue;
                if (oldFile.Name.EndsWith("-debug.log")) continue;
                if (packed.Contains(oldFile.Name)) continue;

                var fileName = oldFile.Name.Replace(".log", "");
                var debugFileName = fileName + "-debug";
                var oldDebugFile = logDirectory.GetFiles(debugFileName + ".log").FirstOrDefault();

                if (oldFile.Exists)
                {
                    var zipFileName = fileName + ".zip";
                    var zipFile = new FileInfo(GetConfig().Path.LogPath + $"/{zipFileName}");
                    if (zipFile.Exists) zipFile.Delete();
                    using (var zip = ZipFile.Open(zipFile.FullName, ZipArchiveMode.Create))
                    {
                        zip.CreateEntryFromFile(oldFile.FullName, oldFile.Name);
                        if (oldDebugFile is { Exists: true })
                            zip.CreateEntryFromFile(oldDebugFile.FullName, oldDebugFile.Name);
                    }

                    oldFile.Delete();
                    oldDebugFile?.Delete();
                    packed.Add(oldFile.Name);
                    packed.Add(oldDebugFile?.Name ?? "");
                }
            }
        }

        // Initialize the logfile
        var counter = 0;
        FileInfo file;
        FileInfo zi;
        while (true)
        {
            file = new FileInfo(GetConfig().Path.LogPath + $"/{DateTime.Now:yyyy-MM-dd}-{++counter}.log");
            zi = new FileInfo(GetConfig().Path.LogPath + $"/{DateTime.Now:yyyy-MM-dd}-{counter}.zip");
            if (file is not { Exists: false, Directory: not null }) continue;
            if (zi is not { Exists: false, Directory: not null }) continue;
            file.Directory.Create();
            break;
        }

        var debugFile = new FileInfo(GetConfig().Path.LogPath + $"/{DateTime.Now:yyyy-MM-dd}-{counter}-debug.log");

        Logger.SetLogFile(file);
        Logger.SetDebugLogFile(debugFile);
        // Load the config
        try
        {
            ConfigManager.LoadConfig(publicMode);
        }
        catch (Exception e)
        {
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToLoadItem", I18NManager.Translate("Word.Config")), e);
            Console.ReadLine();
            return;
        }

        // Load the language
        try
        {
            I18NManager.LoadLanguage();
        }
        catch (Exception e)
        {
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToLoadItem", I18NManager.Translate("Word.Language")), e);
            Console.ReadLine();
            return;
        }

        // Starting logs after i18n is ready
        Logger.Info(I18NManager.Translate("Server.ServerInfo.StartingServer"));
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.Config")));
        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem", I18NManager.Translate("Word.Language")));
        ConfigManager.Logger.Info(
            I18NManager.Translate("Server.ServerInfo.CurrentVersion", GameConstants.GAME_VERSION));
        if (publicMode)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.PublicModeEnabled"));
            if (!await OnlineActivationManager.ValidateAsync(GameConstants.GAME_VERSION))
            {
                Logger.Warn(I18NManager.Translate("Server.ServerInfo.PublicModeValidationFailed"));
                if (!Console.IsInputRedirected)
                {
                    Console.WriteLine();
                    Console.WriteLine("Press Enter to close...");
                    Console.ReadLine();
                }

                return;
            }
        }

        // Initialize the database
        Task databaseInitTask;
        try
        {
            databaseInitTask = Task.Run(DatabaseHelper.Initialize);

            while (!DatabaseHelper.LoadAccount)
            {
                if (databaseInitTask.IsFaulted)
                    databaseInitTask.GetAwaiter().GetResult();

                Thread.Sleep(100);
            }

            Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItem",
                I18NManager.Translate("Word.DatabaseAccount")));
        }
        catch (Exception e)
        {
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToLoadItem", I18NManager.Translate("Word.Database")), e);
            Console.ReadLine();
            return;
        }

        HandlerManager.Init();
        if (ConfigManager.Config.GameServer.UsePacketEncryption)
        {
            Crypto.ClientSecretKey = Crypto.InitEc2b();
            if (Crypto.ClientSecretKey == null) ConfigManager.Config.GameServer.UsePacketEncryption = false;
        }

        Logger.Warn(I18NManager.Translate("Server.ServerInfo.WaitForAllDone"));
        WebProgram.Main([], GetConfig().HttpServer.Port, GetConfig().HttpServer.GetBindDisplayAddress());
        Logger.Info(I18NManager.Translate("Server.ServerInfo.ServerRunning", I18NManager.Translate("Word.Dispatch"),
            GetConfig().HttpServer.GetDisplayAddress()));

        if (ConfigManager.Config.ServerOption.ServerConfig.RunGateway)
        {
            var handler =
                new March7thHoneyListener.ConnectionCreatedHandler((conversation, remote) =>
                    new Connection(conversation, remote));
            March7thHoneyListener.CreateConnection = handler;
            March7thHoneyListener.StartListener();
        }

        GenerateLogMap();

        // Load the game data
        if (ConfigManager.Config.ServerOption.ServerConfig.RunGateway)
        {
            try
            {
                var isCache = false;
                if (File.Exists(ResourceCache.CachePath))
                    if (ConfigManager.Config.ServerOption.UseCache)
                    {
                        Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
                            I18NManager.Translate("Word.Cache")));
                        isCache = ResourceCache.LoadCache();

                        // Clear all game data if cache loading fails
                        if (!isCache)
                        {
                            ResourceCache.ClearGameData();
                            Logger.Warn(I18NManager.Translate("Server.ServerInfo.CacheLoadFailed"));
                        }
                    }
                    else
                    {
                        File.Delete(ResourceCache.CachePath);
                        Logger.Warn(I18NManager.Translate("Server.ServerInfo.CacheLoadSkip"));
                    }

                if (!isCache)
                {
                    Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadingItem",
                        I18NManager.Translate("Word.GameData")));
                    ResourceManager.LoadGameData();

                    // Generate the binary cache synchronously so it is guaranteed to be written before
                    // startup completes (otherwise a fire-and-forget save can be lost on early exit).
                    if (ConfigManager.Config.ServerOption.UseCache && ResourceCache.IsComplete)
                    {
                        Logger.Warn(I18NManager.Translate("Server.ServerInfo.WaitingItem",
                            I18NManager.Translate("Word.Cache")));
                        await ResourceCache.SaveCache();
                    }
                }

                // Banners.json is operator-authored content, not dumped game data: it is the one file a
                // server owner edits to open or close a warp banner. Baking it into Resource.bin made
                // those edits invisible until the whole resource cache was regenerated - which needs the
                // raw Resources tree most deployments do not ship. Re-read it after the cache branch so a
                // banner change only needs a restart (or /reload banner).
                GameData.BannersConfig = ResourceManager.LoadBanners();
            }
            catch (Exception e)
            {
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToLoadItem", I18NManager.Translate("Word.GameData")),
                    e);
                Console.ReadLine();
                return;
            }

            // check option
            if (args.Contains("-generate-tourn"))
            {
                TournRoomGenerator.GenerateFile("RogueTournRoom.json");
                return;
            }
        }

        // Register the command handlers
        try
        {
            CommandManager.RegisterCommands();
        }
        catch (Exception e)
        {
            Logger.Error(
                I18NManager.Translate("Server.ServerInfo.FailedToInitializeItem",
                    I18NManager.Translate("Word.Command")), e);
            Console.ReadLine();
            return;
        }

        CommandExecutor.OnRunCommand += (sender, e) => { CommandManager.HandleCommand(e, sender); };

        MuipManager.OnExecuteCommand += CommandManager.HandleCommand;
        MuipManager.OnGetServerInformation += x =>
        {
            foreach (var con in March7thHoneyListener.GetSnapshot())
                if ((con as Connection)?.Player != null)
                    x.Add((con as Connection)!.Player!.Uid, (con as Connection)!.Player!.Data);
        };
        MuipManager.OnGetPlayerStatus += (int uid, out PlayerStatusEnum status, out PlayerSubStatusEnum subStatus) =>
        {
            subStatus = PlayerSubStatusEnum.None;
            foreach (var con in March7thHoneyListener.GetSnapshot())
                if ((con as Connection)!.Player != null && (con as Connection)!.Player!.Uid == uid)
                {
                    // TODO 4.3: ChallengeManager 暂停
                    if ((con as Connection)!.Player!.RaidManager?.Data.CurRaidId != 0)
                    {
                        status = PlayerStatusEnum.Raid;
                    }
                    else if ((con as Connection)!.Player!.StoryLineManager?.StoryLineData.CurStoryLineId != 0)
                    {
                        status = PlayerStatusEnum.StoryLine;
                    }
                    else
                    {
                        status = PlayerStatusEnum.Explore;
                    }

                    if ((con as Connection)!.Player!.BattleInstance != null) subStatus = PlayerSubStatusEnum.Battle;

                    return;
                }

            status = PlayerStatusEnum.Offline;
        };

        // generate the handbook
        if (ConfigManager.Config.ServerOption.ServerConfig.RunGateway)
        {
            var handbookThread = new Thread(HandbookGenerator.GenerateAll)
            {
                IsBackground = true,
                Name = "HandbookGenerator",
                Priority = ThreadPriority.Lowest
            };
            handbookThread.Start();
        }

        if (!DatabaseHelper.LoadAllData)
        {
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.WaitForAllDone"));
            try
            {
                while (!DatabaseHelper.LoadAllData) // wait for all data to be loaded
                {
                    if (databaseInitTask.IsFaulted)
                        databaseInitTask.GetAwaiter().GetResult();

                    Thread.Sleep(100);
                }
            }
            catch (Exception e)
            {
                Logger.Error(
                    I18NManager.Translate("Server.ServerInfo.FailedToLoadItem",
                        I18NManager.Translate("Word.Database")), e);
                Console.ReadLine();
                return;
            }

            Logger.Info(I18NManager.Translate("Server.ServerInfo.LoadedItem", I18NManager.Translate("Word.Database")));
        }

        AuthRateLimiter.Initialize();

        ServerUtils.InitializeHandlers();

        // check if the database is up to date
        var updated = false;
        foreach (var avatarData in DatabaseHelper.GetAllInstanceFromMap<AvatarData>()!)
        {
            if (avatarData.DatabaseVersion == GameConstants.AvatarDbVersion) continue;

            foreach (var avatar in avatarData.Avatars)
            {
                var formalAvatar = new FormalAvatarInfo
                {
                    BaseAvatarId = avatar.AvatarId,
                    AvatarId = avatar.PathId == 0 ? avatar.AvatarId : avatar.PathId,
                    CurrentHp = avatar.CurrentHp,
                    CurrentSp = avatar.CurrentSp,
                    Exp = avatar.Exp,
                    ExtraLineupHp = avatar.ExtraLineupHp,
                    ExtraLineupSp = avatar.ExtraLineupSp,
                    IsMarked = avatar.IsMarked,
                    Level = avatar.Level,
                    Promotion = avatar.Promotion,
                    PathInfos = []
                };

                foreach (var info in avatar.PathInfoes)
                {
                    if (info.Value.PathId == 0)
                        info.Value.PathId = avatar.AvatarId;
                    formalAvatar.PathInfos.Add(info.Value.PathId, new PathInfo(info.Value.PathId)
                    {
                        PathId = info.Value.PathId,
                        EquipId = info.Value.EquipId,
                        Rank = info.Value.Rank,
                        Relic = info.Value.Relic,
                        Skin = info.Value.Skin,
                        EnhanceInfos =
                        {
                            {
                                0, new EnhanceInfo(0)
                                {
                                    SkillTree = avatar.SkillTreeExtra.GetValueOrDefault(info.Value.PathId) ?? []
                                }
                            }
                        }
                    });
                }

                avatarData.FormalAvatars.Add(formalAvatar);
            }

            avatarData.DatabaseVersion = "20250430";
            updated = true;
            DatabaseHelper.MarkDirty(avatarData.Uid);
        }

        if (updated)
        {
            Logger.Info(I18NManager.Translate("Server.ServerInfo.UpdatedItem",
                I18NManager.Translate("Word.Database")));
            DatabaseHelper.SaveDatabase();
        }

        if (args.Contains("--upgrade-database")) DatabaseHelper.UpgradeDatabase();

        var elapsed = DateTime.Now - time;
        Logger.Info(I18NManager.Translate("Server.ServerInfo.ServerStarted",
            Math.Round(elapsed.TotalSeconds, 2).ToString(CultureInfo.InvariantCulture)));

        if (GetConfig().ServerOption.EnableMission)
            Logger.Warn(I18NManager.Translate("Server.ServerInfo.MissionEnabled"));

        ResourceManager.IsLoaded = true;
        await LifecycleNotifier.NotifyStartedAsync(GameConstants.GAME_VERSION);

        IConsole.OnConsoleExcuteCommand += command =>
        {
            CommandManager.HandleCommand(command, new ConsoleCommandSender(Logger));
            IConsole.RedrawInput(IConsole.Input);
        };

        IConsole.ListenConsole();
        GC.KeepAlive(_sigtermRegistration);
    }

    public static ConfigContainer GetConfig()
    {
        return ConfigManager.Config;
    }

    private delegate bool ConsoleCtrlHandlerRoutine(uint ctrlType);

    private static readonly ConsoleCtrlHandlerRoutine ConsoleCtrlHandlerKeepAlive = OnConsoleCtrl;

    [DllImport("kernel32.dll")]
    private static extern bool SetConsoleCtrlHandler(ConsoleCtrlHandlerRoutine handler, bool add);

    // CTRL_CLOSE(2)/LOGOFF(5)/SHUTDOWN(6): exit cleanly so PerformCleanup saves; Ctrl+C/Break stay with CancelKeyPress.
    private static bool OnConsoleCtrl(uint ctrlType)
    {
        if (ctrlType is 2 or 5 or 6) Environment.Exit(0);
        return false;
    }

    private static void OnSigTerm(PosixSignalContext context)
    {
        context.Cancel = true;
        Environment.Exit(0);
    }

    private static void PerformCleanup()
    {
        var notificationTask = LifecycleNotifier.NotifyMaintenanceAsync();
        // Stopping a live connection on shutdown can throw (disposed CancellationTokenSource race); never let it skip the save.
        try { March7thHoneyListener.GetSnapshot().ForEach(x => x.Stop()); }
        catch (Exception e) { Logger.Error("Cleanup: failed to stop connections", e); }
        DatabaseHelper.SaveDatabase();
        notificationTask.GetAwaiter().GetResult();
    }

    private static void GenerateLogMap()
    {
        // get opcode from CmdIds
        var opcodes = typeof(CmdIds).GetFields().Where(x => x.FieldType == typeof(int)).ToList();
        foreach (var opcode in opcodes)
        {
            var name = opcode.Name;
            var value = (int)opcode.GetValue(null)!;
            March7thHoneyConnection.LogMap.TryAdd(value, name);
        }
    }
}
