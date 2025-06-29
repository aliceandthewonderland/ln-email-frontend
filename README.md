# LNemail Client

A modern web-based email client built with vanilla JavaScript and Node.js backend with CORS support.

## Features

- 🔐 Secure token-based authentication
- 📧 Email composition and sending
- 📬 Inbox management with real-time updates
- 📱 Responsive design for all devices
- 🌐 CORS-enabled backend for secure cross-origin requests
- ⚡ Fast and lightweight

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd lnemail
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at:
- **Local**: http://localhost:3000
- **Network**: http://127.0.0.1:3000

## CORS Configuration

The server is configured with CORS support for the following origins:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://lnemail.net`

To add more allowed origins, edit the `corsOptions` in `server.js`.

## API Endpoints

- `GET /` - Serves the main application
- `GET /api/health` - Health check endpoint
- Static files are served from the root directory

## Project Structure

```
lnemail/
├── server.js          # Node.js Express server with CORS
├── package.json       # Node.js dependencies and scripts
├── index.html         # Main HTML file
├── script.js          # Frontend JavaScript
├── styles.css         # CSS styles
├── .gitignore        # Git ignore file
└── README.md         # This file
```

## Usage

1. Start the server using `npm start` or `npm run dev`
2. Open your browser and navigate to http://localhost:3000
3. Enter your LNemail access token to connect
4. Use the interface to:
   - View your inbox
   - Compose and send emails
   - Read email details

## Environment Variables

You can set the following environment variables:

- `PORT` - Server port (default: 3000)

Example:
```bash
PORT=8080 npm start
```

## Security Features

- CORS protection for cross-origin requests
- Input validation and sanitization
- Secure token handling
- Error handling middleware

## Development

For development with auto-restart on file changes:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## License

MIT License

## Support

For issues and questions, please refer to the LNemail API documentation.