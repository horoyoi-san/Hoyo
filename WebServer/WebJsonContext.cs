using System.Text.Json.Serialization;
using March7thHoney.WebServer.Controllers;
using March7thHoney.WebServer.Handler;
using March7thHoney.WebServer.Objects;
using March7thHoney.WebServer.Request;
using March7thHoney.WebServer.Response;

namespace March7thHoney.WebServer;

// Source-generated STJ metadata for every type the WebServer serializes or binds.
// CamelCase + web defaults match what MVC's JsonResult / minimal-API Results.Json
// produced before, so the wire format is unchanged — but now AOT/trim safe.
[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    NumberHandling = JsonNumberHandling.AllowReadingFromString)]
// Responses (typed)
[JsonSerializable(typeof(CreateSessionResponse))]
[JsonSerializable(typeof(AuthAdminKeyResponse))]
[JsonSerializable(typeof(ExecuteCommandResponse))]
[JsonSerializable(typeof(ServerInformationResponse))]
[JsonSerializable(typeof(PlayerInformationResponse))]
[JsonSerializable(typeof(LoginResJson))]
[JsonSerializable(typeof(PassportLoginResJson))]
// Two distinct nested VerifyData types — give each a unique metadata property name.
[JsonSerializable(typeof(LoginResJson.VerifyData), TypeInfoPropertyName = "LoginVerifyData")]
[JsonSerializable(typeof(PassportLoginResJson.VerifyData), TypeInfoPropertyName = "PassportVerifyData")]
[JsonSerializable(typeof(ComboTokenResJson))]
[JsonSerializable(typeof(FingerprintResJson))]
// Request bodies (binding) + deserialized payloads
[JsonSerializable(typeof(LoginReqJson))]
[JsonSerializable(typeof(PassportLoginReqJson))]
[JsonSerializable(typeof(VerifyReqJson))]
[JsonSerializable(typeof(LoginV2ReqJson))]
[JsonSerializable(typeof(PassportTokenVerifyReqJson))]
[JsonSerializable(typeof(PassportSTokenVerifyReqJson))]
[JsonSerializable(typeof(RegisterReqJson))]
[JsonSerializable(typeof(SendVerificationEmailReqJson))]
[JsonSerializable(typeof(ForgotPasswordReqJson))]
[JsonSerializable(typeof(ResetPasswordReqJson))]
[JsonSerializable(typeof(GateWayRequest))]
[JsonSerializable(typeof(CreateSessionRequestBody))]
[JsonSerializable(typeof(AuthAdminKeyRequestBody))]
[JsonSerializable(typeof(AdminExecRequest))]
[JsonSerializable(typeof(ServerInformationRequest))]
[JsonSerializable(typeof(PlayerInformationRequest))]
[JsonSerializable(typeof(LoginTokenData))]
// Response records (former anonymous payloads)
[JsonSerializable(typeof(StatusResult))]
[JsonSerializable(typeof(ConsoleResult))]
[JsonSerializable(typeof(HandbookLanguages))]
[JsonSerializable(typeof(PassportConfigResult))]
[JsonSerializable(typeof(LoadConfigResult))]
[JsonSerializable(typeof(PassportLoginBody))]
[JsonSerializable(typeof(RegResult))]
[JsonSerializable(typeof(RegVerifyResult))]
// Admin panel envelopes
[JsonSerializable(typeof(AdminResult<EmptyData>))]
[JsonSerializable(typeof(AdminResult<AdminLoginData>))]
[JsonSerializable(typeof(AdminResult<AccountsData>))]
[JsonSerializable(typeof(AdminResult<OverviewData>))]
[JsonSerializable(typeof(AdminResult<RegistrationData>))]
[JsonSerializable(typeof(AdminResult<IdentityLimitData>))]
[JsonSerializable(typeof(AdminResult<AccessData>))]
[JsonSerializable(typeof(AdminResult<ExecCommandData>))]
[JsonSerializable(typeof(AdminResult<AccountWrap>))]
[JsonSerializable(typeof(AdminResult<AccountEmailWrap>))]
[JsonSerializable(typeof(AdminResult<AccountOnlineWrap>))]
[JsonSerializable(typeof(AdminResult<DeletedUid>))]
// Admin request bodies (RDG resolves these at endpoint-build time, so they must be source-gen'd
// under AOT or the whole endpoint graph fails to materialize -> 500 on every route).
[JsonSerializable(typeof(AdminRoutes.AdminLoginRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminCreateAccountRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminUpdateAccountRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminSetPasswordRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminBanAccountRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminExecuteCommandRequest))]
[JsonSerializable(typeof(AdminRoutes.AdminRegistrationRequest))]
// Bare scalars embedded into the admin HTML page (AdminPageRenderer).
[JsonSerializable(typeof(string))]
[JsonSerializable(typeof(string[]))]
public partial class WebJsonContext : JsonSerializerContext;
