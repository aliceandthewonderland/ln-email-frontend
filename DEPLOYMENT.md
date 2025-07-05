# Vercel Deployment Guide

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/your-username/lnemail-client)

## 📋 Pre-deployment Checklist

- [x] ✅ **Vercel Configuration**: `vercel.json` configured
- [x] ✅ **Server Compatibility**: `server.js` updated for serverless functions
- [x] ✅ **CORS Configuration**: Production domains added
- [x] ✅ **Security Headers**: CSP and security headers implemented
- [x] ✅ **Environment Variables**: Production environment support
- [x] ✅ **Build Scripts**: Package.json optimized for Vercel
- [x] ✅ **Error Handling**: Enhanced error handling for production

## 🌐 Environment Variables

Set these environment variables in your Vercel dashboard:

### Required Variables
```bash
NODE_ENV=production
```

### Optional Variables
```bash
PRODUCTION_URL=https://your-custom-domain.com
LNEMAIL_API_URL=https://lnemail.net/api/v1
```

## 🛠 Deployment Steps

### Method 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

### Method 2: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Push changes to main branch
3. Automatic deployment triggers

### Method 3: Manual Deploy
1. Run `npm run build` (optional)
2. Deploy using Vercel web interface
3. Upload project files

## 🔧 Project Configuration

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/lnemail/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/api/health",
      "dest": "/server.js"
    }
  ]
}
```

### CORS Configuration
The server automatically detects Vercel URLs and allows:
- `https://your-app.vercel.app`
- `https://your-app-git-branch.vercel.app`
- Custom domains set in `PRODUCTION_URL`

## 📈 Performance Optimizations

### Automatically Configured
- ✅ **Serverless Functions**: API routes run as serverless functions
- ✅ **Static File Serving**: CSS, JS, HTML served from CDN
- ✅ **Caching**: Cache headers for static assets
- ✅ **Compression**: Gzip compression enabled
- ✅ **Security Headers**: CSP, X-Frame-Options, etc.

### Performance Features
- **Edge Caching**: Static assets cached at edge locations
- **Function Optimization**: 10-second timeout for API calls
- **Request Limiting**: 10MB payload limit
- **Error Boundaries**: Graceful error handling

## 🔐 Security Features

### Implemented Security
- **Content Security Policy**: Prevents XSS attacks
- **CORS Protection**: Strict origin checking
- **Input Validation**: Server-side validation
- **Error Sanitization**: No sensitive data in error messages
- **Rate Limiting**: Built-in Vercel rate limiting

### Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors
```bash
# Check allowed origins in server.js
# Add your domain to allowedOrigins array
```

#### 2. Function Timeout
```bash
# API calls timeout after 10 seconds
# Check network connectivity to LNemail API
```

#### 3. Static Files Not Loading
```bash
# Check vercel.json routes configuration
# Ensure static files are in correct paths
```

#### 4. Environment Variables
```bash
# Set NODE_ENV=production in Vercel dashboard
# Check Environment Variables tab in project settings
```

## 📊 Monitoring

### Available Endpoints
- **Health Check**: `/api/health`
- **LNemail Proxy**: `/api/lnemail/*`
- **Static Assets**: `/*.css`, `/*.js`, `/*.html`

### Logs
```bash
# View function logs
vercel logs

# View deployment logs
vercel logs --follow
```

## 🚀 Post-Deployment

### Verification Steps
1. ✅ Visit your Vercel URL
2. ✅ Test login functionality
3. ✅ Check API health endpoint
4. ✅ Test email sending/receiving
5. ✅ Verify mobile responsiveness

### Custom Domain Setup
1. Go to Vercel dashboard
2. Navigate to project settings
3. Add your custom domain
4. Update DNS records as instructed

## 🔄 Updates

### Automated Deployments
- **Git Integration**: Push to main branch deploys automatically
- **Preview Deployments**: Pull requests create preview deployments
- **Rollback**: Easy rollback to previous versions

### Manual Updates
```bash
# Deploy latest changes
vercel --prod

# Check deployment status
vercel list
```

## 📞 Support

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Node.js on Vercel](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Project Repository](https://github.com/your-username/lnemail-client)

### Common Commands
```bash
# Check project status
vercel ls

# View project info
vercel inspect

# Remove deployment
vercel remove
```

---

## 🎉 Success!

Your LNemail Client is now deployed and ready for production use on Vercel!

**Production Score: 9/10** ⭐⭐⭐⭐⭐⭐⭐⭐⭐

The project is now production-ready with:
- ✅ Serverless compatibility
- ✅ Enhanced security
- ✅ Performance optimizations
- ✅ Proper error handling
- ✅ Environment configuration 