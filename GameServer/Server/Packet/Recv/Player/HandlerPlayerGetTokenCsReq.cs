using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.Database.Player;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerGetTokenCsReq)]
public class HandlerPlayerGetTokenCsReq : Handler
{
    private readonly Logger _logger = new("GameServer");

    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = PlayerGetTokenCsReq.Parser.ParseFrom(data);
        _logger.Info(
            $"PlayerGetToken requested. remote={connection.RemoteEndPoint} account_uid={req.AccountUid} token_len={req.Token?.Length ?? 0}");
        if (!int.TryParse(req.AccountUid, out var requestedUid) || string.IsNullOrWhiteSpace(req.Token))
        {
            _logger.Warn(
                $"PlayerGetToken rejected invalid request. remote={connection.RemoteEndPoint} account_uid={req.AccountUid} token_len={req.Token?.Length ?? 0}");
            await connection.SendPacket(new PacketPlayerGetTokenScRsp(0, Retcode.RetNotInWhiteList));
            return;
        }

        // Validate the game login token before creating a player session.
        int uid;

        if (ConfigManager.Config.ServerOption.ServerConfig.RunDispatch ||
            string.IsNullOrEmpty(ConfigManager.Config.ServerOption.ServerConfig.FromDispatchBaseUrl))
        {
            var account = DatabaseHelper.Instance?.GetInstance<AccountData>(requestedUid);
            if (account == null)
            {
                _logger.Warn($"PlayerGetToken rejected missing account. remote={connection.RemoteEndPoint} uid={requestedUid}");
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(0, Retcode.RetNotInWhiteList));
                return;
            }

            var isDispatchToken = account.ValidateDispatchToken(req.Token);
            var isComboToken = account.ValidateComboToken(req.Token);
            if (!isDispatchToken && !isComboToken)
            {
                _logger.Warn(
                    $"PlayerGetToken rejected invalid token. remote={connection.RemoteEndPoint} uid={requestedUid} token_len={req.Token?.Length ?? 0}");
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(0, Retcode.RetNotInWhiteList));
                return;
            }

            var identityKeys = AccountBanHelper.BuildIdentityKeys([],
                connection.RemoteEndPoint.Address.ToString());
            if (account.GetBanStatus().IsActive)
                account.AddKnownIdentityKeys(identityKeys);

            if (AccountBanHelper.TryGetActiveBan(account, identityKeys, out var banStatus))
            {
                account.ClearLoginTokens();
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(
                    (uint)account.Uid,
                    Retcode.RetNotInWhiteList,
                    AccountBanHelper.ToBlackInfo(banStatus),
                    msg: banStatus.FormatLoginMessage()));
                return;
            }

            if (!account.CanLogin())
            {
                account.ClearLoginTokens();
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(
                    (uint)account.Uid,
                    Retcode.RetNotInWhiteList,
                    msg: ConfigManager.Config.ServerOption.Auth.EmailVerificationRequiredMessage));
                return;
            }

            uid = account.Uid;
            account.AddKnownIdentityKeys(identityKeys);
            account.SyncPermissionsWithRole();
            _logger.Info(
                $"PlayerGetToken accepted. remote={connection.RemoteEndPoint} uid={uid} token_type={(isDispatchToken ? "dispatch" : "combo")}");
        }
        else
        {
            var dispatchUrl = ConfigManager.Config.ServerOption.ServerConfig.FromDispatchBaseUrl;
            var targetUrl = $"{dispatchUrl}/validate_account_token";
            var headers = new Dictionary<string, string>();
            var exchangeSecret = ConfigManager.Config.ServerOption.ServerConfig.ServerExchangeSecret;
            if (!string.IsNullOrWhiteSpace(exchangeSecret))
                headers["X-March7thHoney-Server-Secret"] = exchangeSecret;

            var form = new Dictionary<string, string>
            {
                ["accountUid"] = req.AccountUid,
                ["token"] = req.Token
            };

            var res = await HttpNetwork.SendPostFormRequest(targetUrl, form, headers);
            if (res.Item1 != 200 || res.Item2 == null)
            {
                _logger.Warn(
                    $"PlayerGetToken dispatch exchange rejected. remote={connection.RemoteEndPoint} status={res.Item1} body_len={res.Item2?.Length ?? 0}");
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(0, Retcode.RetNotInWhiteList,
                    msg: res.Item1 == 403 ? res.Item2 ?? string.Empty : string.Empty));
                return;
            }

            if (!int.TryParse(res.Item2, out uid))
            {
                _logger.Warn(
                    $"PlayerGetToken dispatch exchange returned invalid uid. remote={connection.RemoteEndPoint} body={res.Item2}");
                await connection.SendPacket(new PacketPlayerGetTokenScRsp(0, Retcode.RetNotInWhiteList));
                return;
            }
        }


        if (!ResourceManager.IsLoaded)
        {
            _logger.Warn($"PlayerGetToken accepted but resource manager is not loaded. remote={connection.RemoteEndPoint} uid={uid}");
            // resource manager not loaded, return
            return;
        }

        var prev = Listener.GetActiveConnection(uid);
        if (prev != null)
        {
            prev.Stop();
        }

        connection.State = SessionStateEnum.WAITING_FOR_LOGIN;

        var pd = DatabaseHelper.Instance?.GetInstance<PlayerData>(uid);
        connection.Player = pd == null ? new PlayerInstance(uid) : new PlayerInstance(pd);

        connection.DebugFile = Path.Combine(ConfigManager.Config.Path.LogPath, "Debug/", $"{uid}/",
            $"Debug-{DateTime.Now:yyyy-MM-dd HH-mm-ss}.log");

        await connection.Player.OnGetToken();
        connection.Player.Connection = connection;
        await connection.SendPacket(new PacketPlayerGetTokenScRsp(connection));

        if (ConfigManager.Config.GameServer.UsePacketEncryption)
        {
            connection.XorKey = Crypto.GenerateXorKey(connection.ClientSecretKeySeed);
            _logger.Info($"{connection.RemoteEndPoint} key exchange successful");
        }
    }
}

