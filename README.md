<h1 align="center">
  🚀 DevBox (Replit Clone)
</h1>

<p align="center">
  <strong>A full-stack, cloud-based Integrated Development Environment (IDE) built for seamless coding and execution.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📖 Overview

**DevBox** is a powerful cloud-based coding platform inspired by Replit. It provides a full-fledged IDE right in your browser, featuring a sophisticated code editor, an integrated terminal, real-time file synchronization, and scalable backend infrastructure. 

Whether you're writing simple scripts or building complex applications, this platform offers the tools you need to code efficiently from anywhere.

---

## ✨ Key Features

- 💻 **Advanced Code Editor:** Powered by **Monaco Editor** (the same engine behind VS Code) for syntax highlighting, autocomplete, and a rich coding experience.
- 🖥️ **Integrated Terminal:** Fully functional in-browser terminal using **XTerm.js** and **node-pty**, connected to the backend execution environment.
- 🔄 **Real-Time Synchronization:** Seamless communication between the frontend and the execution server using **Socket.io**.
- 📂 **File System Management:** Real-time file watching and directory tree rendering.
- 🔐 **Secure User Authentication:** JWT-based user authentication and secure data storage using **MongoDB**.
- 🐳 **Containerized Execution:** Utilizes **Docker** to safely run and isolate user code environments.
- 🎨 **Beautiful UI/UX:** Responsive and modern interface designed with **Material UI** and **Framer Motion** animations.

---

## 🏗️ Project Architecture

The application is structured into four main micro-services/components:

1. 🌐 `Website-frontend`: The main landing page and user dashboard (React, Framer Motion, React Router).
2. 🛠️ `frontend`: The core web-based IDE application (Vite, React, Monaco Editor, XTerm.js, Socket.io-client).
3. 🗄️ `server`: The main API backend handling user authentication, project metadata, and database operations (Express, Mongoose, JWT).
4. ⚙️ `coding-server`: The dedicated execution environment that hosts the PTY terminal, watches file changes, and interacts with the Docker container (Express, node-pty, Socket.io).

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas URL)
- [Docker](https://www.docker.com/) (for code execution environments)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/devbox.git
   cd devbox
   ```

2. **Install all dependencies:**
   The root directory contains a script to install dependencies across the workspaces.
   ```bash
   npm run install:all
   ```

3. **Environment Variables:**
   Create a `.env` file in the `server` and `coding-server` directories.
   
   *Example for `server/.env`:*
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

### Running the Application

You can start the entire application suite with a single command from the root directory:

```bash
npm start
```
This command utilizes `concurrently` to:
- Spin up the Docker containers via `docker-compose`.
- Start the Main Website Frontend.
- Start the Code Editor Frontend.

*(Note: You may need to start the `server` backend manually depending on your workflow if it's not included in the compose file).*

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js, Vite
- **Styling:** Material UI, Framer Motion
- **Editor:** Monaco Editor (@monaco-editor/react)
- **Terminal:** XTerm.js
- **State/Routing:** React Router DOM

### Backend
- **Framework:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** JSON Web Tokens (JWT), bcrypt
- **Real-time:** Socket.io
- **Terminal Execution:** node-pty
- **File Watching:** chokidar

### Infrastructure
- **Containerization:** Docker & Docker Compose

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check out the [issues page](https://github.com/yourusername/devbox/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the ISC License.

---
<p align="center">
  <i>Built with ❤️ by DevBox</i>
</p>
