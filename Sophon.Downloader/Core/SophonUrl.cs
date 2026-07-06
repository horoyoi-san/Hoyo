using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;

namespace Core
{
    #region getGamesBranches structure
    public class BranchesRoot
    {
        public int retcode { get; set; }
        public string message { get; set; }
        public BranchesData data { get; set; }
    }

    public class BranchesData
    {
        public List<BranchesGameBranch> game_branches { get; set; }
    }

    public class BranchesGameBranch
    {
        public BranchesGame game { get; set; }
        public BranchesMain main { get; set; }
        public BranchesMain pre_download { get; set; }
    }

    public class BranchesGame
    {
        public string id { get; set; }
        public string biz { get; set; }
    }

    public class BranchesMain
    {
        public string package_id { get; set; }
        public string branch { get; set; }
        public string password { get; set; }
        public string tag { get; set; }
        public List<string> diff_tags { get; set; }
        public List<BranchesCategory> categories { get; set; }
    }

    public class BranchesCategory
    {
        public string category_id { get; set; }
        public string matching_field { get; set; }
    }
    #endregion

    public enum Region
    {
        OSREL,
        CNREL,
        OSBETA,
        CNBETA
    }

    public enum BranchType
    {
        Main,
        PreDownload
    }

    public class SophonUrl
    {
        private string apiBase { get; set; }
        private string sophonBase { get; set; }
        private List<string> gameIds { get; set; } = new();
        private BranchType branch { get; set; }
        private string platApp { get; set; }

        private string gameBiz { get; set; } = "";
        private string packageId { get; set; } = "";
        private string password { get; set; } = "";

        private BranchesRoot branchBackup { get; set; } = new BranchesRoot();

        public List<string> launcherIds { get; set; } = new();

        public SophonUrl(
            Region region,
            IEnumerable<string> gameIds,
            BranchType branch = BranchType.Main,
            string launcherId = "",
            string platApp = "")
        {
            UpdateRegion(region);

            this.gameIds = gameIds.ToList();
            this.branch = branch;

            if (!string.IsNullOrEmpty(launcherId))
                this.launcherIds = new List<string> { launcherId };

            if (!string.IsNullOrEmpty(platApp))
                this.platApp = platApp;
        }

        public void UpdateRegion(Region region)
        {
            switch (region)
            {
                case Region.OSREL:
                    apiBase = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches";
                    sophonBase = "https://sg-public-api.hoyoverse.com/downloader/sophon_chunk/api/getBuild";
                    launcherIds = new List<string> { "VYTpXlbWo8" };
                    platApp = "ddxf6vlr1reo";
                    break;

                case Region.CNREL:
                    apiBase = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches";
                    sophonBase = "https://api-takumi.mihoyo.com/downloader/sophon_chunk/api/getBuild";
                    launcherIds = new List<string> { "jGHBHlcOq1" };
                    platApp = "ddxf5qt290cg";
                    break;

                case Region.OSBETA:
                    apiBase = "https://sg-hyp-api-beta.hoyoverse.com/hyp/hyp-connect/api/getGameBranches";
                    sophonBase = "https://sg-beta-api.hoyoverse.com/downloader/sophon_chunk/api/getBuild";
                    launcherIds = new List<string> { "9HDza24TWA", "95ODRGH3xC" };
                    platApp = "ddxf7scwm7ls";
                    break;

                case Region.CNBETA:
                    apiBase = "https://hyp-api-beta.mihoyo.com/hyp/hyp-connect/api/getGameBranches";
                    sophonBase = "https://api-beta.mihoyo.com/downloader/sophon_chunk/api/getBuild";
                    launcherIds = new List<string> { "kwykHprMm9", "TC4836G73s", "WBjNy0hOrG" };
                    platApp = "ddxf5dufpuyo";
                    break;

                default:
                    throw new ArgumentOutOfRangeException(nameof(region), region, null);
            }
        }

        public async Task<int> GetBuildData()
        {
            var tasks =
                from gameId in gameIds
                from launcherId in launcherIds
                select Task.Run(async () =>
                {
                    var uri = new UriBuilder(apiBase);
                    var query = HttpUtility.ParseQueryString(uri.Query);

                    query["game_ids[]"] = gameId;
                    query["launcher_id"] = launcherId;
                    uri.Query = query.ToString();

                    try
                    {
                        var json = await FetchUrl(uri.ToString());
                        var obj = JsonSerializer.Deserialize<BranchesRoot>(json);

                        if (obj == null)
                            return null;

                        var data = ParseBuildData(obj, branch);

                        return new
                        {
                            gameId,
                            launcherId,
                            obj,
                            data
                        };
                    }
                    catch
                    {
                        return null;
                    }
                });

            var results = await Task.WhenAll(tasks);

            var success = results.FirstOrDefault(r => r != null && r.data[0] == "OK");

            if (success != null)
            {
                gameBiz = success.data[1];
                packageId = success.data[2];
                password = success.data[3];
                branchBackup = success.obj;

                Console.WriteLine($"✅ Success launcher: {success.launcherId}");
                return 0;
            }

            Console.WriteLine("❌ All launcherIds failed");
            return -1;
        }

        private string[] ParseBuildData(BranchesRoot obj, BranchType searchBranch)
        {
            if (obj?.data?.game_branches == null || obj.data.game_branches.Count == 0)
                return new[] { "ERROR", "No game branches data" };

            if (obj.retcode != 0)
                return new[] { "ERROR", $"API retcode {obj.retcode}: {obj.message}" };

            var branchObj = GetBranch(obj, searchBranch);
            if (branchObj == null)
                return new[] { "ERROR", $"Branch {searchBranch} not found" };

            var gameObj = GetBranchGame(obj);
            if (gameObj == null)
                return new[] { "ERROR", "Game info not found" };

            return new[]
            {
                "OK",
                gameObj.biz ?? "",
                branchObj.package_id ?? "",
                branchObj.password ?? ""
            };
        }

        public string GetBuildUrl(string version, bool isUpdate = false)
        {
            var uri = new UriBuilder(sophonBase);
            var query = HttpUtility.ParseQueryString(uri.Query);

            if (Program.action == "update" && !isUpdate)
            {
                var data = ParseBuildData(branchBackup, BranchType.Main);

                query["branch"] = "main";
                query["package_id"] = data[2];
                query["password"] = data[3];
            }
            else
            {
                query["branch"] = branch.ToString().ToLower();
                query["package_id"] = packageId;
                query["password"] = password;
            }

            query["plat_app"] = platApp;

            if (Program.action == "update" && !isUpdate && branch == BranchType.PreDownload)
                query["tag"] = version;

            uri.Query = query.ToString();
            return uri.ToString();
        }

        private static async Task<string> FetchUrl(string url)
        {
            using var client = new HttpClient();
            return await client.GetStringAsync(url);
        }

        private static BranchesGame? GetBranchGame(BranchesRoot obj)
        {
            return obj?.data?.game_branches?
                .FirstOrDefault(b => b.game != null)?.game;
        }

        private static BranchesMain? GetBranch(BranchesRoot obj, BranchType searchBranch)
        {
            return obj?.data?.game_branches?
                .Select(b => searchBranch == BranchType.Main ? b.main : b.pre_download)
                .FirstOrDefault(b => b != null);
        }
    }
}
