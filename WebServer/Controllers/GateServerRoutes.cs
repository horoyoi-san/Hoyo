using March7thHoney.Util;
using March7thHoney.WebServer.Handler;
using March7thHoney.WebServer.Request;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

public static class GateServerRoutes
{
    public static void MapGateServerRoutes(this IEndpointRouteBuilder app)
    {
        app.MapGet("/query_gateway", (HttpContext ctx) =>
        {
            if (!ConfigManager.Config.ServerOption.ServerConfig.RunGateway)
                return Results.StatusCode(404);

            // 手动从查询串读参，缺失取空串。Minimal API 的 [AsParameters] 会把非空 string
            // 属性当作必填参数，客户端缺任一参数即静默 400，故改回与 QueryDispatch 一致的宽松读取。
            var q = ctx.Request.Query;
            var req = new GateWayRequest
            {
                version = q["version"].ToString(),
                t = q["t"].ToString(),
                uid = q["uid"].ToString(),
                language_type = q["language_type"].ToString(),
                platform_type = q["platform_type"].ToString(),
                dispatch_seed = q["dispatch_seed"].ToString(),
                channel_id = q["channel_id"].ToString(),
                sub_channel_id = q["sub_channel_id"].ToString(),
                is_need_url = q["is_need_url"].ToString(),
                is_new_format = q["is_new_format"].ToString(),
                game_version = q["game_version"].ToString(),
                account_type = q["account_type"].ToString(),
                account_uid = q["account_uid"].ToString(),
            };

            var handler = new QueryGatewayHandler(req);
            return Results.Text(handler.Data, "text/plain");
        });
    }
}
