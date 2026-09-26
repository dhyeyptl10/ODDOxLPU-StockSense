# Core-Inv-indus





# 🚀 CoreInventory – Smart Inventory Management System

CoreInventory is a **modern Inventory Management System (IMS)** designed to digitize and streamline inventory operations inside businesses.  

Many organizations still rely on **manual registers, Excel sheets, or scattered tools** to manage stock. This creates issues like inaccurate tracking, delayed operations, and poor visibility.

CoreInventory solves this by providing a **centralized, real-time, role-based web platform** where admins, managers, and warehouse staff can efficiently manage inventory operations.

----

# 📌 Problem Statement

Businesses often struggle with inventory management due to:

- Manual stock tracking
- Multiple Excel sheets
- Lack of real-time visibility
- Human errors in stock counting
- Poor coordination between warehouse teams

This system replaces those outdated methods with a **centralized digital platform** that allows teams to manage stock in real time.

---

# 🎯 Target Users

### Admin
- Controls the entire system
- Manages users and warehouses
- Monitors inventory performance

### Inventory Manager
- Manages incoming and outgoing stock
- Approves product transfers
- Tracks stock levels

### Warehouse Staff
- Handles picking and shelving
- Performs stock transfers
- Updates inventory counts

---

# ✨ Key Features

## 🔐 Authentication System
- User signup and login
- Role-based access control
- Secure authentication using JWT
- OTP-based password reset

---

## 📦 Inventory Management
- Add new products
- Update product details
- Track product quantities
- View product movement history
- Adjust stock levels

---

## 🏬 Warehouse Management
- Manage multiple warehouses
- Track stock location
- Transfer inventory between warehouses
- Monitor warehouse activity

---

## 📊 Role-Based Dashboards

### Admin Dashboard
Admin has full control over the system.

Features:
- Manage users
- Manage warehouses
- View all products
- Monitor inventory status
- Track system activities

---

### Inventory Manager Dashboard
Managers handle stock flow and product tracking.

Features:
- Add and manage products
- Track stock levels
- Manage deliveries
- Approve warehouse transfers

---

### Warehouse Staff Dashboard
Warehouse staff perform physical inventory operations.

Features:
- Pick and pack products
- Transfer stock between warehouses
- Update product quantities
- Perform stock counting

---

# 🛠 Tech Stack

## Frontend
- React
- Vite
- CSS
- JavaScript
- REST API Integration

## Backend
- Node.js
- Express.js

## Database
- SQLite / SQL Database

## Authentication
- JSON Web Tokens (JWT)

## Deployment
- Netlify (Frontend)
- Node.js server (Backend)

---

# 📂 Project Structure

```
coreinventory
│
├── backend
│   ├── db
│   ├── middleware
│   ├── routes
│   ├── utils
│   └── server.js
│
├── src
│   ├── pages
│   ├── store
│   ├── components
│   ├── api.js
│   └── App.jsx
│
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

# ⚙️ Installation Guide

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/coreinventory.git
cd coreinventory
```

---

## 2️⃣ Install Frontend Dependencies

```bash
npm install
```

---

## 3️⃣ Install Backend Dependencies

```bash
cd backend
npm install
```

---

## 4️⃣ Start Backend Server

```bash
npm start
```

Backend will run on:

```
http://localhost:5000
```

---

## 5️⃣ Start Frontend Application

Return to root folder:

```bash
cd ..
npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

---

# 🌐 Deployment Guide

## Deploy Frontend on Netlify

1. Push your project to GitHub
2. Go to Netlify
3. Click **Add New Site**
4. Select **Import from GitHub**
5. Choose your repository

### Build Settings

Build Command

```
npm run build
```

Publish Directory

```
dist
```

---

# 🔗 API Overview

## Authentication

| Method | Endpoint | Description |
|------|------|------|
POST | /api/auth/signup | Register new user
POST | /api/auth/login | Login user
POST | /api/auth/reset-password | Reset password

---

## Products

| Method | Endpoint | Description |
|------|------|------|
GET | /api/products | Get all products
POST | /api/products | Add product
PUT | /api/products/:id | Update product
DELETE | /api/products/:id | Delete product

---

## Warehouses

| Method | Endpoint | Description |
|------|------|------|
GET | /api/warehouses | Get warehouses
POST | /api/warehouses | Add warehouse

---

## Transfers

| Method | Endpoint | Description |
|------|------|------|
POST | /api/transfers | Transfer stock
GET | /api/transfers | View transfer history

---

# 📈 Future Improvements

Possible future upgrades for the system:

- Barcode scanning support
- QR code product tracking
- AI-based stock prediction
- Advanced analytics dashboard
- Mobile app for warehouse staff
- Multi-company support

---

# 🧠 Project Goals

The goal of CoreInventory is to:

- Improve stock accuracy
- Provide real-time inventory visibility
- Reduce manual work
- Increase warehouse efficiency
- Provide a scalable inventory solution

---

# 👨‍💻 Author

Developed as a **hackathon project submission**.

---

# ⭐ Support

If you like this project, please give it a **star ⭐ on GitHub**.
