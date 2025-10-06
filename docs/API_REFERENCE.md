## API Reference

### Base URL
`http://localhost:3000/api`

### Authentication
No authentication required for the API (configure webhook secret for security).

### Endpoints

#### Build Management

Start a Build
```http
POST /api/builds
Content-Type: application/json
```
```json
{
  "repoUrl": "https://github.com/Darshwan/CI-Testing.git", // You can add your repo url here !!!
  "branch": "main" // Type your branch name
}
```
### Response:
```json
{
  "message": "Build started!",
  "buildId": "68ce99c6f0626edbef7aa148",
  "viewBuild": "http://localhost:3000/api/builds/68ce99c6f0626edbef7aa148"
}
```
### Get Build Status 
```http
GET /api/builds/:buildId
```
### Response 
```json
{
  "_id": "68ce99c6f0626edbef7aa148",
  "repo": "https://github.com/username/repo.git",
  "branch": "main",
  "status": "success",
  "output": "Build logs...",
  "duration": 45000,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```
### Get Build History
```http
GET /api/builds?limit=10
```
### Webhook Endpoints
GitHub Webhook
```http
POST /webhook/github
Content-Type: application/json
X-GitHub-Event: push
X-Hub-Signature-256: sha256=...
```
```json
{
  "repository": { ... },
  "ref": "refs/heads/main",
  "head_commit": { ... }
}
```

### WebSocket Events

#### Client Events

*   request-builds - Request build history
    

#### Server Events

*   new-build - New build started
    
*   build-update - Build progress update
    
*   build-complete - Build completed
    
*   build-error - Build failed