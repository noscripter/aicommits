# Troubleshooting Network Issues

This guide helps you resolve common network and TLS connection issues with aicommits.

## Common Error: "Client network socket disconnected before secure TLS connection was established"

This error indicates a TLS handshake failure. Here are the most effective solutions:

### 1. Check Your Network Connection
```bash
# Test basic connectivity to OpenAI
curl -I https://api.openai.com
```

### 2. Increase Timeout
The default timeout is 10 seconds. Try increasing it:
```bash
aicommits config set timeout=30000  # 30 seconds
```

### 3. Configure Retry Attempts
Enable automatic retries for transient network issues:
```bash
aicommits config set retries=3
```

### 4. Corporate Network / Proxy Issues
If you're behind a corporate firewall or proxy:

#### Set HTTP/HTTPS Proxy
```bash
# Via config
aicommits config set proxy=http://your-proxy:port

# Via environment variables
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

#### For Corporate Networks with SSL Inspection
If your corporate network inspects SSL traffic, you may need to disable TLS verification (use with caution):
```bash
aicommits config set insecure-tls=true
```

### 5. DNS Issues
Try using a different DNS server:
```bash
# Temporarily use Google DNS
export DNS_SERVER=8.8.8.8
```

### 6. Network Interface Issues
Try switching networks:
- Switch from WiFi to mobile hotspot
- Try a different WiFi network
- Use a VPN if available

### 7. Firewall Issues
Ensure your firewall allows outbound HTTPS connections to:
- `api.openai.com` (port 443)

### 8. Check OpenAI API Status
Visit https://status.openai.com to check if there are any ongoing issues.

## Configuration Options for Network Issues

| Option | Default | Description |
|--------|---------|-------------|
| `timeout` | 10000 | Request timeout in milliseconds |
| `retries` | 2 | Number of retry attempts for failed requests |
| `proxy` | none | HTTP/HTTPS proxy URL |
| `insecure-tls` | false | Disable TLS certificate verification (use with caution) |

## Advanced Debugging

### Enable Node.js Debug Logs
```bash
export NODE_DEBUG=tls,net
aicommits
```

### Check TLS Version Support
```bash
node -e "console.log(process.versions.openssl)"
```

### Test Direct Connection
```bash
node -e "
const https = require('https');
const req = https.request('https://api.openai.com', (res) => {
  console.log('Connection successful:', res.statusCode);
});
req.on('error', (err) => console.error('Connection failed:', err.message));
req.end();
"
```

## Still Having Issues?

If none of these solutions work:

1. **Check your system time** - Ensure your system clock is accurate
2. **Update Node.js** - Ensure you're using a recent version of Node.js
3. **Try a different machine** - Test from a different computer/network
4. **Contact your network administrator** - If in a corporate environment

## Reporting Issues

When reporting network issues, please include:
- Your operating system and version
- Node.js version (`node --version`)
- Network environment (home, corporate, etc.)
- Complete error message
- Output of `aicommits config get` (remove sensitive data) 