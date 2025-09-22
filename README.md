A lightweight, self-hosted Continuous Integration server that automatically builds and tests your code on every push. Get GitHub Actions-like functionality on your own infrastructure.

## Features

- **GitHub Webhook Integration** - Automatically trigger builds on push events
- **Real-time Dashboard** - Live build logs and progress updates
- **Secure** - GitHub webhook signature verification
- **Build History** - Track success rates and performance metrics
- **Fast** - Parallel build processing with intelligent caching

## 🏗️ Architecture

```mermaid
graph TB
    GitHub[GitHub Repository] --> Webhook[Webhook Event];
    Webhook --> IntelliCI[IntelliCI Server];
    IntelliCI --> MongoDB[(MongoDB)];
    IntelliCI --> BuildRunner[Build Runner];
    BuildRunner --> Dashboard[Real-time Dashboard];
    Dashboard --> User[User];
