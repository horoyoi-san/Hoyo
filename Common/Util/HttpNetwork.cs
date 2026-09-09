namespace March7thHoney.Util;

public static class HttpNetwork
{
    public static async ValueTask<(int, string?)> SendGetRequest(string url, int timeout = 30)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(timeout);
            var response = await client.GetAsync(url);
            var content = await response.Content.ReadAsStringAsync();
            return ((int)response.StatusCode, content);
        }
        catch (Exception ex)
        {
            return (500, ex.Message);
        }
    }

    public static async ValueTask<(int, string?)> SendPostFormRequest(string url, Dictionary<string, string> form,
        Dictionary<string, string>? headers = null, int timeout = 30)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(timeout);

            if (headers != null)
            {
                foreach (var (key, value) in headers)
                    client.DefaultRequestHeaders.TryAddWithoutValidation(key, value);
            }

            using var content = new FormUrlEncodedContent(form);
            var response = await client.PostAsync(url, content);
            var responseContent = await response.Content.ReadAsStringAsync();
            return ((int)response.StatusCode, responseContent);
        }
        catch (Exception ex)
        {
            return (500, ex.Message);
        }
    }
}
