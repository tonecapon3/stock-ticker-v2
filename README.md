# Stock Ticker

This is a real-time stock ticker application built with [React](https://react.dev/) and [Vite](https://vitejs.dev/).

## Features

- Real-time stock price updates
- Support for multiple currencies
- Interactive price history charts
- Ability to add, remove, and manually adjust stocks
- Secure access control and input handling
- Session management with logout functionality

## Tech Stack

- **Framework**: React
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charting**: Chart.js
- **Testing**: Jest & React Testing Library

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```
npm run server (this will start the API server which will allow the remote control panel to communicate with the main stock page)

> stock-ticker@0.1.0 server
> node server.js

[dotenv@17.2.1] injecting env (22) from .env.local -- tip: ⚙️  write to custom object with { processEnv: myObject }
🚀 Remote Control Panel API Server running on http://localhost:3001
📋 Available endpoints:
  POST /api/remote/auth - Login
  GET  /api/remote/auth - Verify token
  GET  /api/remote/stocks - Get all stocks
  POST /api/remote/stocks - Add stock
  PUT  /api/remote/stocks/:symbol - Update stock
  DELETE /api/remote/stocks/:symbol - Delete stock
  GET  /api/remote/controls - Get system controls
  PUT  /api/remote/controls - Update controls
  POST /api/remote/controls/emergency - Emergency stop
  GET  /api/remote/status - Get system status
  POST /api/remote/status/health - Health check
  POST /api/remote/restart - Restart server (admin only)

🔑 Available accounts:
  Username: admin (full access)
  Username: controller (control access)
  ⚠️  Use environment-configured passwords

🔧 Environment Status:
  Admin hash: ✅ SET
  Controller hash: ✅ SET

  =====================

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result to get to the main stock page.
Open [http://localhost:3000/remote](http://localhost:3000/remote) with your browser to see the result to get to the remote control page.

You can start editing the application by modifying files in the `src` directory. The application will auto-update as you edit the files.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Runs the app in the development mode.
- `npm run server`: Runs the api server for the remote control panel.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run preview`: Serves the production build locally.
- `npm test`: Launches the test runner in the interactive watch mode.
- `npm run lint`: Lints the project files.
