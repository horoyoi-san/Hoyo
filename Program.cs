using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace Proxy
{
    internal static class Program
    {
        private const string Title = "Horoyoi-san | FreeSR Proxy";
        private const string GuardianPath = "tool/SR.Tool.Proxy.Guardian.exe";

        private static ProxyService s_proxyService = null!;
        private static bool s_clearupd = false;
        private static readonly ProxyConfig Config = new ProxyConfig
        {
            DestinationHost = "localhost",
            DestinationPort = 21000,
            RedirectDomains = {
                ".hoyoverse.com",
                ".mihoyo.com",
                ".yuanshen.com",
                ".bhsr.com",
                ".starrails.com",
                ".juequling.com",
                ".zenlesszonezero.com",
                ".bh3.com",
                ".honkaiimpact3.com",
                ".mob.com",
                ".hyg.com"
            },
            AlwaysIgnoreDomains = {
                "autopatchcn.yuanshen.com",
                "autopatchhk.yuanshen.com",
                "autopatchcn.juequling.com",
                "autopatchos.zenlesszonezero.com",
                "autopatchcn.bhsr.com",
                "autopatchos.starrails.com"
            },
            BlockUrls ={
                "/data_abtest_api/config/experiment/list",
                "/common/hkrpg_global/announcement/api/getAlertPic",
                "/common/hkrpg_global/announcement/api/getAlertAnn",
                "/hkrpg_global/combo/red_dot/list",
                "/data_abtest_api/config/experiment/list",
                "/sdk/upload",
                "/sdk/dataUpload",
                "/common/h5log/log/batch",
                "/crash/dataUpload",
                "/crashdump/dataUpload",
                "/client/event/dataUpload",
                "/log",
                "/asm/dataUpload",
                "/sophon/dataUpload",
                "/apm/dataUpload",
                "/2g/dataUpload",
                "/v1/firelog/legacy/log",
                "/h5/upload",
                "/_ts",
                "/perf/config/verify",
                "/ptolemaios_api/api/reportStrategyData",
                "/combo/box/api/config/sdk/combo",
                "/hkrpg_global/combo/granter/api/compareProtocolVersion",
                "/admin/mi18n",
                "/combo/box/api/config/sw/precache",
                "/hkrpg_global/mdk/agreement/api/getAgreementInfos",
                "/device-fp/api/getExtList",
                "/admin/mi18n/plat_os/m09291531181441/m09291531181441-version.json",
                "/admin/mi18n/plat_oversea/m2020030410/m2020030410-version.json"
            },
            ForceRedirectOnUrlContains = {
                "query_dispatch",
                "query_gateway",
                "query_region_list",
                "query_cur_region"
            }
        };

        private static async Task Main(string[] args)
        {
            Console.Title = Title;

            // ✅ เพิ่ม ASCII LOGO ของ Horoyoi-san
                string logo = @"
██╗  ██╗ ██████╗ ██████╗  ██████╗ ██╗   ██╗ ██████╗ ██╗      ███████╗ █████╗ ███╗   ██╗
██║  ██║██╔═══██╗██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔═══██╗██║      ██╔════╝██╔══██╗████╗  ██║
███████║██║   ██║██████╔╝██║   ██║ ╚████╔╝ ██║   ██║██║█████╗███████╗███████║██╔██╗ ██║
██╔══██║██║   ██║██╔══██╗██║   ██║  ╚██╔╝  ██║   ██║██║╚════╝╚════██║██╔══██║██║╚██╗██║
██║  ██║╚██████╔╝██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║      ███████║██║  ██║██║ ╚████║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝      ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
";

    // ✅ ดึงสีทั้งหมดจาก Enum
    ConsoleColor[] colors = Enum.GetValues(typeof(ConsoleColor))
        .Cast<ConsoleColor>()
        .Where(c => c != ConsoleColor.Black) // ตัดสีดำออกเพราะมองไม่เห็น
        .ToArray();

    _ = Task.Run(async () =>
    {
        int i = 0;
        while (true)
        {
            Console.Clear();
            Console.ForegroundColor = colors[i % colors.Length];
            Console.WriteLine(logo);
            Console.ResetColor();
            await Task.Delay(1000); // เปลี่ยนสีทุก 1 วิ
            i++;
        }
    });

//    string logo = @"
            //██╗  ██╗ ██████╗ ██████╗  ██████╗ ██╗   ██╗ ██████╗ ██╗      ███████╗ █████╗ ███╗   ██╗
            //██║  ██║██╔═══██╗██╔══██╗██╔═══██╗╚██╗ ██╔╝██╔═══██╗██║      ██╔════╝██╔══██╗████╗  ██║
            //███████║██║   ██║██████╔╝██║   ██║ ╚████╔╝ ██║   ██║██║█████╗███████╗███████║██╔██╗ ██║
            //██╔══██║██║   ██║██╔══██╗██║   ██║  ╚██╔╝  ██║   ██║██║╚════╝╚════██║██╔══██║██║╚██╗██║
            //██║  ██║╚██████╔╝██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║      ███████║██║  ██║██║ ╚████║
            //╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝      ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
            //";

            //    ConsoleColor[] colors = new[]
            //    {
            //        ConsoleColor.Red,
            //        ConsoleColor.Yellow,
            //        ConsoleColor.Green,
            //        ConsoleColor.Cyan,
            //        ConsoleColor.Blue,
            //        ConsoleColor.Magenta
            //    };

            //    _ = Task.Run(async () =>
            //    {
            //        int i = 0;
            //        while (true)
            //        {
            //            Console.Clear();
            //            Console.ForegroundColor = colors[i % colors.Length];
            //            Console.WriteLine(logo);
            //            Console.ResetColor();
            //            await Task.Delay(1000); // 👈 เปลี่ยนสีทุก 1 วินาที
            //            i++;
            //        }
            //    });

            Console.WriteLine("Proxy for private servers provided by Horoyoi-san");

            _ = Task.Run(WatchGuardianAsync);
            CheckProxy();

            s_proxyService = await ProxyService.CreateAsync(Config.DestinationHost, Config.DestinationPort, Config);

            Console.WriteLine("Proxy is running");

            AppDomain.CurrentDomain.ProcessExit += OnProcessExit;
            Console.CancelKeyPress += OnProcessExit;

            await Task.Delay(Timeout.Infinite);
        }

        private static async Task WatchGuardianAsync()
        {
            var proc = StartGuardian();
            if (proc == null)
            {
                Console.WriteLine("Guardian start failed. Your proxy settings may not be able to recover after closing.");
                return;
            }

            while (!proc.HasExited)
            {
                await Task.Delay(1000);
            }
            Console.WriteLine("! Guardian exit");
            OnProcessExit(null, null);
            Environment.Exit(0);
        }

        private static Process? StartGuardian()
        {
            if (!OperatingSystem.IsWindows()) return null;

            try
            {
                return Process.Start(new ProcessStartInfo(GuardianPath, $"{Environment.ProcessId}")
                {
                    UseShellExecute = false,
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                Console.WriteLine();
                return null;
            }
        }

        private static void OnProcessExit(object? sender, EventArgs? args)
        {
            if (s_clearupd) return;
            s_proxyService?.Shutdown();
            s_clearupd = true;
        }

        public static void CheckProxy()
        {
            try
            {
                string? ProxyInfo = GetProxyInfo();
                if (ProxyInfo != null)
                {
                    Console.WriteLine("well... It seems you are using other proxy software(such as Clash,V2RayN,Fiddler,etc)");
                    Console.WriteLine($"You system proxy: {ProxyInfo}");
                    Console.WriteLine("You have to close all other proxy software to make sure SR.Tool.Proxy can work well.");
                    Console.WriteLine("Press any key to continue if you closed other proxy software, or you think you are not using other proxy.");
                    Console.ReadKey();
                }
            }
            catch (NullReferenceException)
            {

            }
        }

        public static string? GetProxyInfo()
        {
            try
            {
                IWebProxy proxy = WebRequest.GetSystemWebProxy();
                Uri? proxyUri = proxy.GetProxy(new Uri("https://www.example.com"));
                if (proxyUri == null) return null;

                string proxyIP = proxyUri.Host;
                int proxyPort = proxyUri.Port;
                string info = proxyIP + ":" + proxyPort;
                return info;
            }
            catch
            {
                return null;
            }
        }
    }
}
