## GitHub Webhook Setup Guide

### 1. Generate Webhook Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Add to your .env file:

```env
GITHUB_WEBHOOK_SECRET=your_generated_secret_here
```

### 2. Configure GitHub Webhook

Go to your GitHub repository → Settings → Webhooks → Add webhook
(I recommend, use [ngrok](https://ngrok.com/) or disable SSL verification for testing)
Configure the webhook:

Payload URL

```text
https://your-domain.com/webhook/github
```
Content type

```text
application/json
```
Secret

```text
Your generated secret from step 1
```

Which events would you like to trigger this webhook?

```text
Just the push event
```
SSL verification
```text
Enable SSL verification (recommended)
```
### 3. Test Your Webhook

* Make a push to your repository
* Check your server logs for webhook reception
* Verify the build starts automatically

### 4. Troubleshooting
* Common Issues
* Webhook not triggering
* Check server is running and accessible
* Verify URL is correct
* Check secret matches
* Builds not starting
* Verify MongoDB connection
* Check repository permissions
* SSL Errors
* Use HTTPS for production
* For testing, use ngrok or disable SSL verification