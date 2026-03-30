# Home Lab Dashboard

A minimalist dashboard for monitoring and accessing local Home Lab applications.

## Quick Start (Docker Compose)

1.  Clone or download this repository.
2.  Open `docker-compose.yml` and update the `VITE_HOME_LAB_IP` argument to your Home Lab's IP address.
3.  Run the following command:
    ```bash
    docker-compose up -d --build
    ```
4.  Access the dashboard at `http://localhost:8080`.

## Configuration

The application target IP is set at build time via the `VITE_HOME_LAB_IP` environment variable. If you change your Home Lab IP, you must rebuild the container:

```bash
VITE_HOME_LAB_IP=192.168.1.50 docker-compose up -d --build
```

## GitHub Integration

This project is ready to be exported to GitHub. You can use the built-in **"Export to GitHub"** feature in the AI Studio menu to create a new repository and push this code directly.

### Manual GitHub Setup

If you prefer to do it manually:

1.  Create a new repository on GitHub.
2.  Initialize your local directory:
    ```bash
    git init
    git add .
    git commit -m "Initial commit: Home Lab Dashboard"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```

## Features

- **Real-time Monitoring:** Polls ports every 30 seconds.
- **Auto-Sorting:** Active applications move to the top.
- **Minimalist UI:** Clean design with Inter font and Lucide icons.
