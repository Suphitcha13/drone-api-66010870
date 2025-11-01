# Drone API (66010870)

REST API for managing drone configurations and temperature logs.

**Author:** Suphitcha  
**Student ID:** 66010870

---

## Features

- Get drone configuration details
- Check drone status
- Retrieve temperature logs with pagination
- Create new temperature log entries

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/drone-api-66010870.git
cd drone-api-66010870
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
CONFIG_URL=https://script.google.com/macros/s/YOUR_CONFIG_URL/exec
LOG_URL=https://app-tracking.pockethost.io/api/collections/drone_logs/records
LOG_API_TOKEN=your_actual_token_here
PORT=3000
```

### 4. Run the server

**Production mode:**
```bash
npm start
```

**Development mode (with auto-reload):**
```bash
npm run dev
```

The server will run on `http://localhost:3000`

### 5. Test the API

Open your browser or use Postman to test:
- `http://localhost:3000/` - Health check
- `http://localhost:3000/configs/3001` - Get drone config
- `http://localhost:3000/status/3001` - Get drone status
- `http://localhost:3000/logs/3001` - Get drone logs

## API Endpoints

### GET /configs/:droneId
Get drone configuration by ID.

**Response:**
```json
{
  "drone_id": 3001,
  "drone_name": "Dot Dot",
  "light": "on",
  "country": "India",
  "weight": 21
}
```

### GET /status/:droneId
Get drone status by ID.

**Response:**
```json
{
  "condition": "good"
}
```

### GET /logs/:droneId
Get temperature logs for a specific drone.

**Query Parameters:**
- `page` (optional) - Page number, default: 1
- `perPage` (optional) - Items per page, default: 12

**Response:**
```json
[
  {
    "drone_id": 3001,
    "drone_name": "Dot Dot",
    "created": "2024-09-22 07:37:32.111Z",
    "country": "India",
    "celsius": 45
  }
]
```

### POST /logs
Create a new temperature log entry.

**Request Body:**
```json
{
  "drone_id": 3001,
  "drone_name": "Dot Dot",
  "country": "India",
  "celsius": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

## Deployment

### Railway
1. Push code to GitHub
2. Connect your repository at [railway.app](https://railway.app)
3. Add environment variables
4. Deploy

### Render
1. Push code to GitHub
2. Create new Web Service at [render.com](https://render.com)
3. Connect repository
4. Add environment variables
5. Deploy

## Tech Stack

- Node.js
- Express.js
- Axios
- CORS

## Author

- **Name:** Suphitcha Yuennan
- **Student ID:** 66010870

## License

Copyright (c) 2025 Suphitcha Yuennan(66010870). All rights reserved.

This project is created for educational purposes as part of a university assignment.