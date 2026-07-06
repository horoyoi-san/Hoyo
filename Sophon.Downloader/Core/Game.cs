using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core
{
    class Game
    {
        public string[] GameIds { get; set; } = Array.Empty<string>();

        public enum GameType
        {
            nap,
            hkrpg,
            hk4e,
            bh3,
            abc,
            hyg
        }

        static readonly Dictionary<(Region, GameType), string[]> gameMap = new()
        {
            {(Region.OSREL, GameType.nap), new[] { "U5hbdsT9W7" }},
            {(Region.CNREL, GameType.nap), new[] { "x6znKlJ0xK" }},
            {(Region.OSREL, GameType.hkrpg), new[] { "4ziysqXOQ8" }},
            {(Region.CNREL, GameType.hkrpg), new[] { "64kMb5iAWu" }},
            {(Region.OSREL, GameType.hk4e), new[] { "gopR6Cufr3" }},
            {(Region.CNREL, GameType.hk4e), new[] { "1Z8W5NHUQb" }},
            {(Region.OSREL, GameType.bh3), new[] { "5TIVvvcwtM" }},
            {(Region.CNREL, GameType.bh3), new[] { "osvnlOc0S8" }},

            {(Region.OSBETA, GameType.abc), new[] { "4qvmDrMwKS" }},
            {(Region.CNBETA, GameType.abc), new[] { "j7rlly0oYR", "lgyIM35mz8" }},
            {(Region.OSBETA, GameType.hyg), new[] { "679gqJWz4L" }},
            {(Region.CNBETA, GameType.hyg), new[] { "Dg5IUTLSzd" }},
        };

        public Game(Region region, string id)
        {
            bool isRel = !Enum.TryParse(id, out GameType game);

            if (isRel)
            {
                GameIds = new[] { id };
            }
            else
            {
                GameIds = gameMap[(region, game)];
            }
        }

        public string[] GetGameIds()
        {
            return GameIds;
        }
    }
}
