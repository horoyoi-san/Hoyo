namespace March7thHoney.WebServer.Objects;

public class PassportLoginResJson
{
    public PassportLoginResJson()
    {
    }

    public PassportLoginResJson(string aid, string email, string token)
    {
        data = new VerifyData(aid, email, token);
    }

    public string? message { get; set; }
    public int retcode { get; set; }
    public VerifyData? data { get; set; }

    public static PassportLoginResJson Error(int retcode, string message)
    {
        return new PassportLoginResJson
        {
            retcode = retcode,
            message = message,
            data = null
        };
    }

    public static PassportLoginResJson Success(string uid, string username, string email, bool isEmailVerified,
        string token)
    {
        var response = new PassportLoginResJson
        {
            retcode = 0,
            message = "OK",
            data = new VerifyData(uid, email, token)
        };

        response.data.user_info.aid = uid;
        response.data.user_info.mid = uid;
        response.data.user_info.account_name = username;
        response.data.user_info.email = email;
        response.data.user_info.is_email_verify = isEmailVerified ? "1" : "0";
        response.data.user_info.area_code = "**";
        response.data.user_info.mobile = "";
        response.data.user_info.safe_area_code = "";
        response.data.user_info.safe_mobile = "";
        response.data.user_info.realname = "";
        response.data.user_info.identity_code = "";
        response.data.user_info.rebind_area_code = "";
        response.data.user_info.rebind_mobile = "";
        response.data.user_info.rebind_mobile_time = "1";
        response.data.user_info.links = [];
        response.data.user_info.country = "CN";
        response.data.user_info.password_time = "1";
        response.data.user_info.is_adult = 0;
        response.data.user_info.unmasked_email = email;
        response.data.user_info.unmasked_email_type = string.IsNullOrWhiteSpace(email) ? 0 : 1;
        response.data.token.token_type = "1";
        response.data.token.token = token;
        response.data.ext_user_info.guardian_email = "";
        response.data.ext_user_info.birth = "0";

        return response;
    }

    public class VerifyData
    {
        public VerifyData(string aid, string email, string token)
        {
            user_info.aid = aid;
            user_info.email = email;
            this.token.token = token;
        }

        public string bind_email_action_ticket { get; set; } = "";
        public ExtUserInfoData ext_user_info { get; set; } = new();
        public string reactivate_action_token { get; set; } = "";
        public UserInfoData user_info { get; set; } = new();
        public TokenData token { get; set; } = new();
    }

    public class ExtUserInfoData
    {
        public string birth { get; set; } = "0";
        public string guardian_email { get; set; } = "";
    }

    public class UserInfoData
    {
        public string account_name { get; set; } = "";
        public string aid { get; set; } = "";
        public string area_code { get; set; } = "**";
        public string country { get; set; } = "CN";
        public string email { get; set; } = "";
        public string is_email_verify { get; set; } = "0";
        public string identity_code { get; set; } = "";
        public int is_adult { get; set; }
        public List<LinkData> links { get; set; } = [];
        public string mid { get; set; } = "";
        public string mobile { get; set; } = "";
        public string password_time { get; set; } = "1";
        public string realname { get; set; } = "";
        public string rebind_area_code { get; set; } = "";
        public string rebind_mobile { get; set; } = "";
        public string rebind_mobile_time { get; set; } = "";
        public string safe_area_code { get; set; } = "";
        public string safe_mobile { get; set; } = "";
        public string unmasked_email { get; set; } = "";
        public int unmasked_email_type { get; set; }
    }

    public class TokenData
    {
        public string token { get; set; } = "";
        public string token_type { get; set; } = "1";
    }

    public class LinkData
    {
        public string nickname { get; set; } = "";
        public string thirdparty { get; set; } = "";
        public string union_id { get; set; } = "";
    }
}
