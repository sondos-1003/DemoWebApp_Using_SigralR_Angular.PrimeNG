import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class SignalRServiceService {

  constructor() { }
  private hubConnection: HubConnection | null = null;

  private connectedSource = new Subject<{ connectionId: string; userId: string }>();
  private notificationSource = new Subject<{ title: string; message: string }>();
  private privateMessageSource = new Subject<{ from: string; message: string }>();
  private groupMessageSource = new Subject<{ group: string; from: string; message: string }>();
  private userJoinedSource = new Subject<{ group: string; userId: string; members: string[] }>();
  private userLeftSource = new Subject<{ group: string; userId: string; members: string[] }>();
  private supportRequestedSource = new Subject<{ roomName: string; userId: string }>();
  private supportSessionCreatedSource = new Subject<string>();
  private supportMessageSource = new Subject<{ room: string; from: string; message: string }>();
  private toastSource = new Subject<{ severity?: string; message: string }>();

  // Observables for components
  connected$ = this.connectedSource.asObservable();
  notifications$ = this.notificationSource.asObservable();
  privateMessages$ = this.privateMessageSource.asObservable();
  groupMessages$ = this.groupMessageSource.asObservable();
  userJoined$ = this.userJoinedSource.asObservable();
  userLeft$ = this.userLeftSource.asObservable();
  supportRequested$ = this.supportRequestedSource.asObservable();
  supportSessionCreated$ = this.supportSessionCreatedSource.asObservable();
  supportMessages$ = this.supportMessageSource.asObservable();
  toast$ = this.toastSource.asObservable();

  start(userId: string, hubUrl: string = 'https://localhost:7037/chatHub'): Promise<void> {
    const url = `${hubUrl}?user=${encodeURIComponent(userId)}`;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(url)
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();

    return this.hubConnection.start();
  }

  private registerHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.on('Connected', (connectionId: string, userId: string) => {
      this.connectedSource.next({ connectionId, userId });
    });

    this.hubConnection.on('ReceiveNotification', (title: string, message: string) => {
      this.notificationSource.next({ title, message });
    });

    this.hubConnection.on('ReceivePrivateMessage', (from: string, message: string) => {
      this.privateMessageSource.next({ from, message });
    });

    this.hubConnection.on('ReceiveGroupMessage', (group: string, from: string, message: string) => {
      this.groupMessageSource.next({ group, from, message });
    });

    this.hubConnection.on('UserJoinedGroup', (group: string, userId: string, members: string[]) => {
        console.log( userId, "JOINED EVENT RECEIVED:", group);
      this.userJoinedSource.next({ group, userId, members });
      this.toastSource.next({severity: 'success', message: `${userId} joined ${group}`});
    });

    this.hubConnection.on('UserLeftGroup', (group: string, userId: string, members: string[]) => {
      this.userLeftSource.next({ group, userId, members });
      this.toastSource.next({severity: 'warn', message: `${userId} left ${group}`});
      
    });

    this.hubConnection.on('SupportRequested', (roomName: string, userId: string) => {
      this.supportRequestedSource.next({ roomName, userId });
    });

    this.hubConnection.on('SupportSessionCreated', (roomName: string) => {
      this.supportSessionCreatedSource.next(roomName);
    });

    this.hubConnection.on('ReceiveSupportMessage', (room: string, from: string, message: string) => {
      this.supportMessageSource.next({ room, from, message });
    });
  }

  // Invokes
  joinGroup(group: string) { return this.invoke('JoinGroup', group); }
  leaveGroup(group: string) { return this.invoke('LeaveGroup', group); }
  sendGroupMessage(group: string, message: string) { return this.invoke('SendMessageToGroup', group, message); }
  sendPrivateMessage(toUserId: string, message: string) { return this.invoke('SendPrivateMessage', toUserId, message); }
  requestSupport() { return this.invoke('RequestSupport'); }
  joinSupportRoom(roomName: string) { return this.invoke('JoinSupportRoom', roomName); }
  sendSupportMessage(roomName: string, message: string) { return this.invoke('SendSupportMessage', roomName, message); }
  getGroupMembers(groupName: string) { return this.invoke('GetGroupMembers', groupName); }

  private invoke(method: string, ...args: any[]) {
    if (!this.hubConnection) return Promise.reject('Not connected');
    return this.hubConnection.invoke(method, ...args);
  }

  stop() { return this.hubConnection ? this.hubConnection.stop() : Promise.resolve(); }
}