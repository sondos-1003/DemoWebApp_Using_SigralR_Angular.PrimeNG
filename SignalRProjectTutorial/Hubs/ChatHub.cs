using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Linq;

namespace SignalRProjectTutorial.Hubs
{
    public class ChatHub : Hub
    {
        // connectionId -> userId
        private static readonly ConcurrentDictionary<string, string> ConnectionUser = new();

        // userId -> set of connectionIds
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> UserConnections = new();

        // groupName -> set of connectionIds
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> GroupConnections = new();

        // supportRoomName -> ownerUserId
        private static readonly ConcurrentDictionary<string, string> SupportRooms = new();

        public override Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            ConnectionUser[Context.ConnectionId] = userId;
            var conns = UserConnections.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
            conns[Context.ConnectionId] = 0;
            Clients.Caller.SendAsync("Connected", Context.ConnectionId, userId);
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            if (ConnectionUser.TryRemove(Context.ConnectionId, out var userId))
            {
                if (UserConnections.TryGetValue(userId, out var conns))
                {
                    conns.TryRemove(Context.ConnectionId, out _);
                    if (conns.IsEmpty)
                    {
                        UserConnections.TryRemove(userId, out _);
                    }
                }
            }

            // Remove this connection from any groups it's in
            foreach (var kv in GroupConnections)
            {
                var group = kv.Key;
                var set = kv.Value;
                set.TryRemove(Context.ConnectionId, out _);
                if (set.IsEmpty)
                {
                    GroupConnections.TryRemove(group, out _);
                }
            }

            return base.OnDisconnectedAsync(exception);
        }

        // Generic notifications
        public Task SendNotificationToAll(string title, string message)
        {
            return Clients.All.SendAsync("ReceiveNotification", title, message);
        }

        public Task SendNotificationToUser(string userId, string title, string message)
        {
            return Clients.User(userId).SendAsync("ReceiveNotification", title, message);
        }

        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        // One-to-one private message using IUserIdProvider (Clients.User)
        public Task SendPrivateMessage(string toUserId, string message)
        {
            var fromUser = Context.UserIdentifier ?? Context.ConnectionId;
            return Clients.User(toUserId).SendAsync("ReceivePrivateMessage", fromUser, message);
        }

        // Groups
        public async Task JoinGroup(string groupName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            var set = GroupConnections.GetOrAdd(groupName, _ => new ConcurrentDictionary<string, byte>());
            set[Context.ConnectionId] = 0;

            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            var members = GetMembersFromGroupConnections(groupName);

            // Notify only the group that a user joined
            await Clients.Group(groupName).SendAsync("UserJoinedGroup", groupName, userId, members);
        }

        public async Task LeaveGroup(string groupName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

            if (GroupConnections.TryGetValue(groupName, out var set))
            {
                set.TryRemove(Context.ConnectionId, out _);
                if (set.IsEmpty)
                {
                    GroupConnections.TryRemove(groupName, out _);
                }
            }

            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            var members = GetMembersFromGroupConnections(groupName);

            await Clients.Group(groupName).SendAsync("UserLeftGroup", groupName, userId, members);
        }

        public Task SendMessageToGroup(string groupName, string message)
        {
            var fromUser = Context.UserIdentifier ?? Context.ConnectionId;
            return Clients.Group(groupName).SendAsync("ReceiveGroupMessage", groupName, fromUser, message);
        }

        public Task<string[]> GetGroupMembers(string groupName)
        {
            var members = GetMembersFromGroupConnections(groupName);
            return Task.FromResult(members);
        }

        private string[] GetMembersFromGroupConnections(string groupName)
        {
            if (!GroupConnections.TryGetValue(groupName, out var set))
                return Array.Empty<string>();

            var users = set.Keys
                .Select(cid => ConnectionUser.TryGetValue(cid, out var uid) ? uid : cid)
                .Distinct()
                .ToArray();
            return users;
        }

        // Help / Support flow
        public Task JoinSupportAgents()
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, "support-agents");
        }

        public Task LeaveSupportAgents()
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, "support-agents");
        }

        public async Task<string> RequestSupport()
        {
            var userId = Context.UserIdentifier ?? Context.ConnectionId;
            var roomName = $"support-{Guid.NewGuid():N}";
            SupportRooms[roomName] = userId;
            await Groups.AddToGroupAsync(Context.ConnectionId, roomName);
            await Clients.Group("support-agents").SendAsync("SupportRequested", roomName, userId);
            await Clients.Caller.SendAsync("SupportSessionCreated", roomName);
            return roomName;
        }

        public Task JoinSupportRoom(string roomName)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, roomName);
        }

        public Task LeaveSupportRoom(string roomName)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        }

        public Task SendSupportMessage(string roomName, string message)
        {
            var fromUser = Context.UserIdentifier ?? Context.ConnectionId;
            return Clients.Group(roomName).SendAsync("ReceiveSupportMessage", roomName, fromUser, message);
        }

        // Utility: return this connection id (client convenience)
        public Task<string> GetConnectionId()
        {
            return Task.FromResult(Context.ConnectionId);
        }
    }
}