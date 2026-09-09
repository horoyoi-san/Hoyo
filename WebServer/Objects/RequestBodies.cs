namespace March7thHoney.WebServer.Objects;

public class LoginReqJson
{
    public string? account { get; set; }
    public string? password { get; set; }
    public bool is_crypto { get; set; }
    public string? device { get; set; }
    public string? device_id { get; set; }
    public string? device_fp { get; set; }
}

public class PassportLoginReqJson
{
    public string? account { get; set; }
    public string? password { get; set; }
    public string? device { get; set; }
    public string? device_id { get; set; }
    public string? device_fp { get; set; }
}

public class VerifyReqJson
{
    public string? uid { get; set; }
    public string? token { get; set; }
}

public class LoginV2ReqJson
{
    public int app_id { get; set; }
    public int channel_id { get; set; }
    public string? data { get; set; }
    public string? device { get; set; }
    public string? sign { get; set; }
}

public class PassportTokenVerifyReqJson
{
    public string mid { get; set; } = "";
    public bool refresh { get; set; }
    public TokenInfo token { get; set; } = new();

    public class TokenInfo
    {
        public int token_type { get; set; }
        public string token { get; set; } = "";
    }
}

public class PassportSTokenVerifyReqJson
{
    public string mid { get; set; } = "";
    public string stoken { get; set; } = "";
    public bool refresh { get; set; }
}

public class RegisterReqJson
{
    public string? account { get; set; }
    public string? username { get; set; }
    public string? email { get; set; }
    public string? password { get; set; }
    public string? confirm { get; set; }
    public string? confirm_password { get; set; }
    public string? confirmPassword { get; set; }
    public string? device { get; set; }
    public string? device_id { get; set; }
    public string? device_fp { get; set; }
}

public class SendVerificationEmailReqJson
{
    public string? account { get; set; }
    public string? username { get; set; }
    public string? email { get; set; }
}

public class ForgotPasswordReqJson
{
    public string? account { get; set; }
    public string? username { get; set; }
    public string? email { get; set; }
}

public class ResetPasswordReqJson
{
    public string? uid { get; set; }
    public string? token { get; set; }
    public string? password { get; set; }
    public string? confirm { get; set; }
    public string? confirm_password { get; set; }
    public string? confirmPassword { get; set; }
}
