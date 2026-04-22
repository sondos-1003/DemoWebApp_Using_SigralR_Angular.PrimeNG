import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SignalRServiceService } from '../../../services/signal-rservice.service';
import { PanelModule } from 'primeng/panel';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    PanelModule,
    ToastModule,
    InputTextModule,
    ButtonModule,
    FormsModule,
    CommonModule
  ],
  providers: [MessageService],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  userId = '';
  connected = false;

  groupName = '';
  currentGroup: string | null = null;
  groupMembers: string[] = [];
  groupMessages: string[] = [];

  privateTo = '';
  privateMessages: string[] = [];

  supportRoom: string | null = null;
  supportMessages: string[] = [];

  subs: Subscription[] = [];

  constructor(
    private signalR: SignalRServiceService,
    private msg: MessageService
  ) {}

  ngOnInit() {
    this.subs.push(
      this.signalR.notifications$.subscribe((n: any) =>
        this.msg.add({ severity: 'info', summary: n.title, detail: n.message })
      ),

      this.signalR.connected$.subscribe((c: any) => {
        this.connected = true;
        this.msg.add({
          severity: 'success',
          summary: 'Connected',
          detail: `${c.userId}`
        });
      }),

      this.signalR.privateMessages$.subscribe((m: any) =>
        this.privateMessages.push(`[${m.from}] ${m.message}`)
      ),

      this.signalR.groupMessages$.subscribe((gm: any) => {
        if (gm.group === this.currentGroup) {
          this.groupMessages.push(`[${gm.from}] ${gm.message}`);
        } else {
           this.msg.add({
    key: 'global',
    severity: 'success',
    summary: 'User Joined',
    detail: `${gm.userId} joined ${gm.group}`
  });
        }
      }),

      this.signalR.userJoined$.subscribe((u: any) => {
        this.msg.add({
          severity: 'success',
          summary: 'User Joined',
          detail: `${u.userId} joined ${u.group}`
        });

        if (u.group === this.currentGroup) {
          this.groupMembers = u.members;
        }
      }),

      this.signalR.userLeft$.subscribe((u: any) => {
        if (u.group === this.currentGroup) {
          this.groupMembers = u.members;
        }
      }),

      this.signalR.supportSessionCreated$.subscribe((room: string) => {
        this.supportRoom = room;
        this.msg.add({
          severity: 'info',
          summary: 'Support session',
          detail: room
        });
      }),

      this.signalR.supportMessages$.subscribe((s: any) => {
        if (s.room === this.supportRoom) {
          this.supportMessages.push(`[${s.from}] ${s.message}`);
        } else {
          this.msg.add({
            severity: 'info',
            summary: `Support ${s.room}`,
            detail: `${s.from}: ${s.message}`
          });
        }
      }),

      this.signalR.toast$.subscribe((t: any) => {
        this.msg.add({
          severity: 'info',
          summary: 'System',
          detail: t.message
        });
      })
    );
  }

  async connect() {
    if (!this.userId) return;
    await this.signalR.start(this.userId);
     this.msg.add({
    key: 'global',
    severity: 'info',
    summary: 'System',
    detail: "Connected as " + this.userId
  });
  }

  async joinGroup() {
    if (!this.groupName) return;
    await this.signalR.joinGroup(this.groupName);

    this.currentGroup = this.groupName;
    this.groupMessages = [];
    this.msg.add({
    key: 'global',
    severity: 'info',
    summary: 'Notification',
    detail: `${this.userId} joined the group ${this.currentGroup}`
  });

    const members = await this.signalR.getGroupMembers(this.groupName) as string[];
    this.groupMembers = members || [];
  }

  async leaveGroup() {
    if (!this.currentGroup) return;

    await this.signalR.leaveGroup(this.currentGroup);

    this.currentGroup = null;
    this.groupMembers = [];
    this.groupMessages.push('-- You left the group --');
    //FOR SORT OF TEST
    this.msg.add({
    key: 'global',
    severity: 'info',
    summary: 'Notification',
    detail: `${this.userId} left the group ${this.currentGroup}`
  });
  }

  async sendGroup(messageInput: HTMLInputElement) {
    const text = messageInput.value.trim();
    if (!text || !this.currentGroup) return;

    await this.signalR.sendGroupMessage(this.currentGroup, text);

    this.groupMessages.push(`[You] ${text}`);
    messageInput.value = '';
  }

  async sendPrivate(messageInput: HTMLInputElement) {
    const text = messageInput.value.trim();
    if (!text || !this.privateTo) return;

    await this.signalR.sendPrivateMessage(this.privateTo, text);

    this.privateMessages.push(`[To ${this.privateTo}] ${text}`);
    messageInput.value = '';
  }

  async requestSupport() {
    const room = await this.signalR.requestSupport() as string;
    if (!this.supportRoom) this.supportRoom = room;
  }

  async sendSupport(messageInput: HTMLInputElement) {
    const text = messageInput.value.trim();
    if (!text || !this.supportRoom) return;

    await this.signalR.sendSupportMessage(this.supportRoom, text);

    this.supportMessages.push(`[You] ${text}`);
    messageInput.value = '';
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.signalR.stop();
  }

  // showToast(message: string) {
  //   const el = document.createElement('div');

  //   el.innerText = message;
  //   el.style.position = 'fixed';
  //   el.style.top = '20px';
  //   el.style.right = '10px';
  //   el.style.background = '#222';
  //   el.style.color = 'red';
  //   el.style.padding = '10px 15px';
  //   el.style.borderRadius = '8px';
  //   el.style.zIndex = '9999';

  //   document.body.appendChild(el);

  //   setTimeout(() => el.remove(), 6000);
  // }
  testToast() {
  this.msg.add({
    key: 'global',
    severity: 'info',
    summary: 'Test',
    detail: 'Hello'
  });
}
  showToast(message: string) {
  this.msg.add({
    key: 'global',
    severity: 'info',
    summary: 'Notification',
    detail: message
  });
}
}