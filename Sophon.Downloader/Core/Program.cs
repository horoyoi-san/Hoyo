using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Mono.Options;

namespace Core
{
    public class Program
    {
        public static bool silent = false;
        public static string action = "";
        public static string updateFrom = "";

        public static async Task<int> Main(params string[] args)
        {
            bool showHelp = false;
            // arguments
            string gameId = "";
            string updateFrom = "";
            string updateTo = "";
            string outputDir = "";
            string matchingField = "";
            // options
            string region = "OSREL"; // default region
            string branch = "main"; // default branch
            string launcherId = "";
            string platApp = "";
            int threads = Environment.ProcessorCount;
            int maxHttpHandle = 128;

            var options = new OptionSet {
                { "region=", "", v => region = v },
                { "branch=", "", v => branch = v },
                { "launcherId=", "", v => launcherId = v },
                { "platApp=", "", v => platApp = v },
                { "threads=", "", v => threads = int.Parse(v) },
                { "handles=", "", v => maxHttpHandle = int.Parse(v) },
                { "silent", "", v => silent = v != null },
                { "h|help", "show help", v => showHelp = v != null },
            };

            List<string> extra;
            try
            {
                extra = options.Parse(args);
                action = "";

                if (extra.Count > 1)
                {
                    action = extra[0].ToLower();
                }

                if (action == "full" && extra.Count >= 5)
                {
                    gameId = extra[1];
                    matchingField = extra[2];
                    updateFrom = extra[3];
                    outputDir = extra[4];
                }
                else if (action == "update" && extra.Count >= 6)
                {
                    gameId = extra[1];
                    matchingField = extra[2];
                    updateFrom = extra[3];
                    updateTo = extra[4];
                    outputDir = extra[5];
                }
                else
                {
                    showHelp = true;
                }
            }
            catch (OptionException e)
            {
                Console.WriteLine("Error: " + e.Message);
                Console.WriteLine("Use --help for usage.");
                return 0;
            }

            if (!silent) Console.WriteLine($"Sophon.Downloader v{Assembly.GetExecutingAssembly().GetName().Version} - Made with love by Horoyoi-san <3");

            if (showHelp)
            {
                string exeName = Process.GetCurrentProcess().ProcessName + ".exe";
                Console.WriteLine($"""
                    Usage:
                        {exeName} full <gameId> <package> <version> <outputDir> [options]                     Download full game assets
                        {exeName} update <gameId> <package> <updateFrom> <updateTo> <outputDir> [options]     Download update assets

                    Arguments:
                        <gameId>        Game ID, either hoyo id (hk4e, hkrpg, nap, bh2) or REL id (gopR6Cufr3, ...)
                        <package>       What to download, either "game" or for audio "zh-cn", "en-us", "ja-jp" or "ko-kr"
                        <version>       Version to download
                        <updateFrom>    Version to update from
                        <updateTo>      Version to update to
                        <outputDir>     Output directory to save the downloaded files

                    Options:
                        --region=<value>            Region to use, either OSREL (overseas) or CNREL (china), defaults to OSREL
                        --branch=<value>            Override branch name of the game data
                        --launcherId=<value>        Override launcher ID used when fetching packages
                        --platApp=<value>           Override platform application ID used when fetching packages
                        --threads=<value>           Number of threads to use, defaults to the number of processors
                        --handles=<value>           Number of HTTP handles to use, defaults to 128
                        --silent                    Suppress confirmation message and output
                        -h, --help                  Show this help message

                        | Zenless Zone Zero |2.8|Sophon.Downloader.exe full U5hbdsT9W7 game 2.3 output --region=OSREL |
                        | Zenless Zone Zero |2.8|Sophon.Downloader.exe full x6znKlJ0xK game 2.3 output --region=CNREL |
                        | Honkai: Star Rail |4.5|Sophon.Downloader.exe full 4ziysqXOQ8 game 3.6 output --region=OSREL |
                        | Honkai: Star Rail |4.5|Sophon.Downloader.exe full 64kMb5iAWu game 3.6 output --region=CNREL |
                        | Genshin Impact |6.7|Sophon.Downloader.exe full gopR6Cufr3 game 6.0 output --region=OSREL |
                        | Genshin Impact |6.7|Sophon.Downloader.exe full 1Z8W5NHUQb game 6.0 output --region=CNREL |
                        | Honkai Impact 3rd |9.0|Sophon.Downloader.exe full 5TIVvvcwtM game 8.4 output --region=OSREL |
                        | Honkai Impact 3rd |9.0|Sophon.Downloader.exe full osvnlOc0S8 game 8.4 output --region=CNREL |
                        | Honkai: Nexus anima |0.3.0|Sophon.Downloader.exe full 4qvmDrMwKS game 0.3.0 output --region=OSBETA |
                        | Honkai: Nexus anima |0.3.0|Sophon.Downloader.exe full j7rlly0oYR game 0.3.0 output --region=CNBETA |
                        | Honkai: Nexus anima |0.6.0|Sophon.Downloader.exe full IWISpEcDbC game 0.6.0 output --region=OSBETA |
                        | Honkai: Nexus anima |0.6.0|Sophon.Downloader.exe full lgyIM35mz8 game 0.6.0 output --region=CNBETA |
                        | Petit Planet |0.83.6|Sophon.Downloader.exe full 0fijU7nET7 game 0.83.6 output --region=CNBETA |
                        | Petit Planet |0.92.7|Sophon.Downloader.exe full 679gqJWz4L game 0.92.7 output --region=OSBETA |
                        | Petit Planet |0.92.7|Sophon.Downloader.exe full Dg5IUTLSzd game 0.92.7 output --region=CNBETA |
                 """);
                return 0;
            }

            // main
            Enum.TryParse(region, out Region curRegion);
            BranchType curBranch = Enum.Parse<BranchType>(branch, true);
            Game game = new Game(curRegion, gameId);
            SophonUrl sophonUrl = new SophonUrl(
            curRegion,
            game.GetGameIds(),
            curBranch,
            launcherId,
            platApp);
            await sophonUrl.GetBuildData();

            if (!silent) Console.WriteLine($"Running with {threads} threads and {maxHttpHandle} handles");

            if (updateFrom.Count(c => c == '.') == 1) updateFrom += ".0";
            string prevManifest = sophonUrl.GetBuildUrl(updateFrom, false);
            string newManifest = "";
            if (action == "update")
            {
                if (updateTo.Count(c => c == '.') == 1) updateTo += ".0";
                newManifest = sophonUrl.GetBuildUrl(updateTo, true);
            }

            await Downloader.StartDownload(prevManifest, newManifest, threads, maxHttpHandle, outputDir, matchingField);

            return 0;
        }
    }
}
