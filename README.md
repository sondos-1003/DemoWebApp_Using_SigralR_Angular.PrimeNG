# Real-Time Chat Application

A real-time chat application built using **.NET Web API** and **Angular**, leveraging **SignalR** for instant communication and **PrimeNG** for a modern UI experience.

---

## 🏗️ Architecture

- **Backend:** .NET Web API
- **Frontend:** Angular
- **Real-Time Engine:** SignalR (Hub / ChatHub)
- **UI Library:** PrimeNG

---

## Backend – .NET (SignalR Hub)

The backend is focused on enabling real-time communication using **SignalR**.

### 🔹 Core Concept

The application uses a **SignalR Hub (ChatHub)** to manage connections and messaging between clients.

### 🔹 Responsibilities

- Handle client connections and disconnections
- Broadcast messages to all connected users in the same group
- Send messages to specific users (private chat) or groups

---

## 🔄 SignalR (ChatHub)

SignalR is the core of this application.

### 🔹 What It Does

- Maintains persistent connections (**WebSockets** when possible)
- Enables server-to-client communication instantly
- Supports multiple clients connected at the same time

### 🔹 Chat Features

- Send messages in real-time
- Receive messages instantly without refresh
- Broadcast to all users or specific groups
- Handle user join/leave events

---

## Project Features

### Notifications
Real-time notifications sent from the server to the client.

### Chat Between Users
One-to-one real-time chat between two users.

### Group Chat
Real-time chat inside a group/channel/room.

### Help Icon with Support
A help/support feature where the user can communicate with support in real time.

---

## 💻 Frontend – Angular

Angular handles the client-side chat interface and real-time interaction.

### 🔹 Responsibilities

- Connect to SignalR Hub
- Send messages to the server
- Receive and display messages instantly
- Manage UI state

---

## SignalR Integration in Angular

Angular connects to the backend using the **SignalR client**.

### 🔹 Flow

- Establish connection to ChatHub
- Listen for incoming messages
- Update UI using Signals
- Send messages to the server

---

## 🎨 UI – PrimeNG

PrimeNG is used to build a clean and interactive chat interface.

### 🔹 Components Used

- Input fields for typing messages
- Buttons for sending messages
- Message panels / cards
- Toast notifications

### 🔹 Benefits

- Fast UI development
- Responsive design
- Modern user interface components
