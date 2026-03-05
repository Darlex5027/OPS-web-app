# OPS Web App - Dockerized Application with Database

This project is a web application fully containerized using Docker, with MariaDB as the database backend. It provides a consistent and isolated environment for development and deployment.

---

## 📋 Prerequisites

- Docker installed and running on your system
- For Windows users: It's recommended to install Docker Desktop from the [Microsoft Store](https://apps.microsoft.com/store/detail/docker-desktop/XP8CBT8D19KZB7) for better compatibility

---

## 🚀 Getting Started

### 1. Clone the Repository

Download the ZIP file from the `main` branch, or clone it using Git:

```bash
git clone git@github.com:Darlex5027/OPS-web-app.git
cd OPS-web-app
```

### 2. Environment Configuration

1. Copy the file named `.env.example` and rename the copy to `.env`
2. Open the newly created `.env` file and set the MariaDB password:

```
DB_ROOT_PASS=your_secure_password_here
```

---

## 📦 Docker Setup

The application consists of:
- Web application container
- MariaDB database container

Make sure Docker is running before starting the application:

```bash
docker compose up -d
```

The application will be available at: **http://localhost:8080**

---

## 🔧 Development Workflow

### Branch Protection

The `main` branch is protected and direct commits are blocked to ensure code quality and stability.

### Making Contributions

#### Option A — Using the GitHub Web Interface

1. Go to https://github.com/Darlex5027/OPS-web-app/branches and click **New branch**
2. Give it a descriptive name: `feature/your-feature-name` and make sure to select `main` as the source
3. Access your branch at: `https://github.com/Darlex5027/OPS-web-app/tree/name_of_your_branch`
4. Use **Add file → Upload files** to upload your changes
5. Drop or choose your files
6. Write a commit title and a short explanation of your changes
7. Make sure **"Commit directly to `name_of_your_branch`"** is selected and click **Commit changes**
8. You can keep adding commits before opening a Pull Request
9. When ready, go to the **Pull requests** tab → **New pull request**
10. Make sure **base** is `main` and **compare** is `name_of_your_branch`
11. Click **Create a pull request**
12. Give it a title and a description of your changes
13. Click **Create a pull request**
14. Your changes will be reviewed by at least one team member and merged by the admin

#### Option B — Using Git (Command Line)

1. Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

2. Commit your changes to this branch:

```bash
git add .
git commit -m "Description of your changes"
git push origin feature/your-feature-name
```

3. Open a Pull Request on GitHub from your branch to `main`

---

## 👥 Review Process

- All pull requests require review by at least 1 collaborator
- Final merge into `main` must be performed by the repository admin: **Darlex5027 (Alex)**

---

## 👥 Team

- **Admin:** Darlex5027 (Alex)

For any questions or issues, please contact the repository admin.
