using Microsoft.AspNetCore.SignalR;

namespace SignalRProjectTutorial.Infrastructure
{
    // Provides a user identifier for SignalR based on the query string "user"
    // Falls back to the authenticated Name if present.
    public class QueryStringUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
        {
            // Prefer explicit querystring ?user=someId (Angular client can set this)
            var httpContext = connection.GetHttpContext();
            if (httpContext != null)
            {
                var qs = httpContext.Request.Query;
                if (qs.TryGetValue("user", out var values) && !string.IsNullOrWhiteSpace(values.ToString()))
                {
                    return values.ToString();
                }
            }

            // fallback to authenticated user name if present
            return connection.User?.Identity?.Name;
        }
    }
}