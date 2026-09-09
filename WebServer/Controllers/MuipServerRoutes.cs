using March7thHoney.WebServer.Request;
using March7thHoney.WebServer.Server;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace March7thHoney.WebServer.Controllers;

public static class MuipServerRoutes
{
    public static void MapMuipServerRoutes(this IEndpointRouteBuilder app)
    {
        app.MapPost("/muip/create_session",
            ([FromBody] CreateSessionRequestBody req) => Results.Json(MuipManager.CreateSession(req.key_type)));

        app.MapPost("/muip/auth_admin",
            ([FromBody] AuthAdminKeyRequestBody req) => Results.Json(MuipManager.AuthAdmin(req.session_id, req.admin_key)));

        app.MapGet("/muip/exec_cmd",
            ([AsParameters] AdminExecRequest req) =>
                Results.Json(MuipManager.ExecuteCommand(req.SessionId, req.Command, req.TargetUid)));

        app.MapPost("/muip/exec_cmd",
            ([FromBody] AdminExecRequest req) =>
                Results.Json(MuipManager.ExecuteCommand(req.SessionId, req.Command, req.TargetUid)));

        app.MapGet("/muip/server_information",
            ([AsParameters] ServerInformationRequest req) => Results.Json(MuipManager.GetInformation(req.SessionId)));

        app.MapPost("/muip/server_information",
            ([FromBody] ServerInformationRequest req) => Results.Json(MuipManager.GetInformation(req.SessionId)));

        app.MapGet("/muip/player_information",
            ([AsParameters] PlayerInformationRequest req) =>
                Results.Json(MuipManager.GetPlayerInformation(req.SessionId, req.Uid)));

        app.MapPost("/muip/player_information",
            ([FromBody] PlayerInformationRequest req) =>
                Results.Json(MuipManager.GetPlayerInformation(req.SessionId, req.Uid)));

        app.MapGet("/server/type",
            () => Results.Text("{\"serverType\": \"March7thHoneyServer\"}", "application/json"));
    }
}
