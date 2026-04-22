"use strict";

// Wait for DOM so elements exist before we access them.
document.addEventListener("DOMContentLoaded", () => {
    let connection = null;
    let currentGroup = null;
    let supportRoom = null;

    // DOM helpers
    const qs = id => document.getElementById(id);
    const appendItem = (listId, text) => {
        const list = qs(listId);
        if (!list) return console.warn(`Missing list element: ${listId}`);
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = text;
        list.appendChild(li);
        list.scrollTop = list.scrollHeight;
    };
    const clearList = id => {
        const el = qs(id);
        if (!el) return;
        el.innerHTML = "";
    };

    // register handlers (called after connection is created)
    function registerHandlers() {
        if (!connection) return;
        connection.on("Connected", (connectionId, userId) => {
            appendNotification(`Connected: ${userId} (conn ${connectionId})`);
        });

        connection.on("ReceiveNotification", (title, message) => {
            appendNotification(`${title}: ${message}`);
        });

        connection.on("ReceivePrivateMessage", (from, message) => {
            appendItem("privateMessages", `[Private] ${from}: ${message}`);
        });

        connection.on("ReceiveGroupMessage", (group, from, message) => {
            if (group === currentGroup) {
                appendItem("groupMessages", `[${group}] ${from}: ${message}`);
            } else {
                appendNotification(`Message in ${group} from ${from}`);
            }
        });

        connection.on("UserJoinedGroup", (group, userId, members) => {
            if (group === currentGroup) {
                updateGroupMembers(members);
                appendItem("groupMessages", `-- ${userId} joined ${group} --`);
            } else {
                appendNotification(`${userId} joined group ${group}`);
            }
        });

        connection.on("UserLeftGroup", (group, userId, members) => {
            if (group === currentGroup) {
                updateGroupMembers(members);
                appendItem("groupMessages", `-- ${userId} left ${group} --`);
            } else {
                appendNotification(`${userId} left group ${group}`);
            }
        });

        connection.on("SupportRequested", (roomName, userId) => {
            appendNotification(`Support requested by ${userId} in ${roomName}`);
        });

        connection.on("SupportSessionCreated", (roomName) => {
            supportRoom = roomName;
            const supportRoomEl = qs("supportRoom");
            if (supportRoomEl) supportRoomEl.textContent = roomName;
            const supportPanel = qs("supportPanel");
            if (supportPanel) supportPanel.style.display = "block";
            appendNotification(`Support session created: ${roomName}`);
        });

        connection.on("ReceiveSupportMessage", (room, from, message) => {
            if (room === supportRoom) {
                appendItem("supportMessages", `[Support:${room}] ${from}: ${message}`);
            } else {
                appendNotification(`Support msg in ${room} from ${from}`);
            }
        });
    }

    function appendNotification(text) {
        const area = qs("notificationArea");
        if (!area) return console.warn("Missing notificationArea element");
        const span = document.createElement("div");
        span.className = "alert alert-info py-1 my-1";
        span.textContent = text;
        area.prepend(span);
        // auto remove after 8s
        setTimeout(() => span.remove(), 8000);
    }

    function updateGroupMembers(members) {
        clearList("groupMembers");
        const container = qs("groupMembers");
        if (!container) return;
        members.forEach(m => {
            const li = document.createElement("li");
            li.className = "list-group-item";
            li.textContent = m;
            container.appendChild(li);
        });
    }

    // Safe wiring of UI event listeners: check elements exist first.
    const connectBtn = qs("connectButton");
    const userInput = qs("userInput");
    if (connectBtn && userInput) {
        connectBtn.addEventListener("click", async () => {
            const user = userInput.value?.trim();
            if (!user) {
                alert("Enter a user id before connecting.");
                return;
            }

            if (connection) {
                try { await connection.stop(); } catch { }
            }

            connection = new signalR.HubConnectionBuilder()
                .withUrl("/chatHub?user=" + encodeURIComponent(user))
                .withAutomaticReconnect()
                .build();

            registerHandlers();

            try {
                await connection.start();
                connectBtn.disabled = true;
                userInput.disabled = true;
                appendNotification("Connected as " + user);
            } catch (err) {
                console.error(err.toString());
                alert("Failed to connect: " + err);
            }
        });
    } else {
        console.warn("connectButton or userInput element not found in DOM.");
    }

    const joinGroupBtn = qs("joinGroupBtn");
    if (joinGroupBtn) {
        joinGroupBtn.addEventListener("click", async () => {
            const group = qs("groupInput")?.value?.trim();
            if (!group) return alert("Enter group name");
            if (!connection) return alert("Not connected");
            await connection.invoke("JoinGroup", group);
            currentGroup = group;
            const currentGroupEl = qs("currentGroup");
            if (currentGroupEl) currentGroupEl.textContent = group;
            clearList("groupMessages");
            clearList("groupMembers");
            const members = await connection.invoke("GetGroupMembers", group);
            updateGroupMembers(members);
        });
    }

    const leaveGroupBtn = qs("leaveGroupBtn");
    if (leaveGroupBtn) {
        leaveGroupBtn.addEventListener("click", async () => {
            if (!currentGroup) return;
            if (!connection) return;
            await connection.invoke("LeaveGroup", currentGroup);
            appendItem("groupMessages", `-- You left ${currentGroup} --`);
            currentGroup = null;
            const currentGroupEl = qs("currentGroup");
            if (currentGroupEl) currentGroupEl.textContent = "-";
            clearList("groupMembers");
        });
    }

    const sendGroupBtn = qs("sendGroupBtn");
    if (sendGroupBtn) {
        sendGroupBtn.addEventListener("click", async () => {
            const text = qs("groupMessageInput")?.value?.trim();
            if (!text) return;
            if (!currentGroup) return alert("Join a group first");
            if (!connection) return alert("Not connected");
            await connection.invoke("SendMessageToGroup", currentGroup, text);
            const input = qs("groupMessageInput");
            if (input) input.value = "";
        });
    }

    const sendPrivateBtn = qs("sendPrivateBtn");
    if (sendPrivateBtn) {
        sendPrivateBtn.addEventListener("click", async () => {
            const to = qs("privateTo")?.value?.trim();
            const text = qs("privateMessageInput")?.value?.trim();
            if (!to || !text) return;
            if (!connection) return alert("Not connected");
            await connection.invoke("SendPrivateMessage", to, text);
            appendItem("privateMessages", `[To ${to}] ${text}`);
            const input = qs("privateMessageInput");
            if (input) input.value = "";
        });
    }

    const helpBtn = qs("helpBtn");
    if (helpBtn) {
        helpBtn.addEventListener("click", async () => {
            if (!connection) return alert("Not connected");
            // Request support session; server will reply with SupportSessionCreated
            await connection.invoke("RequestSupport");
        });
    }

    const sendSupportBtn = qs("sendSupportBtn");
    if (sendSupportBtn) {
        sendSupportBtn.addEventListener("click", async () => {
            const text = qs("supportMessageInput")?.value?.trim();
            if (!text) return;
            if (!supportRoom) return alert("No support session active");
            if (!connection) return alert("Not connected");
            await connection.invoke("SendSupportMessage", supportRoom, text);
            appendItem("supportMessages", `[You] ${text}`);
            const input = qs("supportMessageInput");
            if (input) input.value = "";
        });
    }
});