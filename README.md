# Home Lab Dashboard

A minimalist, modern dashboard to monitor the status of your Home Lab applications.

## Features

- **Real-time Status Monitoring**: Automatically checks if your applications are online.
- **Dynamic Configuration**: Add, remove, and edit applications directly from the UI.
- **Persistence**: Your settings (IP address and application list) are saved in your browser's local storage.
- **Modern UI**: Clean, minimalist design with smooth animations.

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Deployment

1.  **Clone the repository**:
    ```bash
    git clone <your-repo-url>
    cd homelab-dashboard
    ```

2.  **Configure the default IP (Optional)**:
    Open `docker-compose.yml` and update the `VITE_HOME_LAB_IP` build argument to your Home Lab's IP address. This will be the default IP for the first time you open the dashboard.

3.  **Start the dashboard**:
    ```bash
    docker compose up -d --build
    ```

4.  **Access the dashboard**:
    Open your browser and navigate to `http://localhost:8080`.

## Configuration

Click the **Settings** (gear) icon in the top-right corner to:
- Change the **Home Lab IP Address**.
- **Add** new applications (Name, Port, Description).
- **Edit** existing applications.
- **Remove** applications you no longer need.

All changes are saved automatically to your browser's local storage.

## Note on Private Network Access (PNA)

Modern browsers may restrict `fetch` requests to local IP addresses (like `10.0.0.x`) if the dashboard is served over HTTPS or from a different origin. If you see "Offline" for all apps even when they are online, check your browser's console for "Private Network Access" errors. You may need to access the dashboard over HTTP or adjust your browser settings.
