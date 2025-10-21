# Contributing to IntelliCI Server

Thank you for your interest in contributing to **IntelliCI Server**!  
Your help makes this project better for everyone. 💙

This document explains how you can report issues, propose new features, and submit your first pull request.

## Project Overview

**IntelliCI Server** is a backend service designed to make Continuous Integration (CI) smarter —  
leveraging intelligent log analysis, auto-build triggers, and developer insights.

Built with:
- **Node.js + Express**
- **TypeScript**
- **MongoDB**
- **Docker-ready architecture**
---
## Getting Started

### Fork the Repository

Click the **"Fork"** button on the top-right of this repo to make your own copy.

Then clone your fork:

```bash
git clone https://github.com/Darshwan/IntelliCI-Server.git
cd IntelliCI-Server
```
### Install Dependencies
```bash
npm install
```
### Environment Setup
Create a .env file in the root directory:
```bash
PORT=
MONGO_URI=
JWT_SECRET=
NODE_ENV=
```
### Run the Development Server
```bash
npm run dev
```
## Project Structure
```bash
intellici-server/
├── config/          # DB connection
├── controllers/     # Core logic
├── docs/            # Documentation
├── public/          # Static Files serving 
├── routes/          # API routes
├── services/        # Core Features
├── webhooks/        # Webhook
├── index.js         # App entry point
├── DockerFile      
├── docker-compose.yml   
├── package.json
├── tsconfig.json
└── .env.example
```
### Coding Guidelines

- Use TypeScript for all source files (.ts).
- Follow the existing code style:
   - 2-space indentation
   - Use semicolons
   - Prefer async/await over callbacks
- Add JSDoc comments for complex functions.
- Commit messages should follow conventional commits:
```bash
feat: add new endpoint for build triggers
fix: resolve token validation issue
docs: update contributing guide
refactor: optimize log parser
```
### Testing
Before pushing your changes, ensure that all tests pass:
```bash
npm test
```
Add new tests for any new features or bug fixes.
## Submitting a Pull Request (PR)
1. Create a new branch from main:
```bash
git checkout -b feat/your-feature-name
```
2. Commit your changes with a clear message.
3. Push your branch:
```bash
git push origin feat/your-feature-name
```
4. Open a Pull Request on GitHub with:
   - A clear title
   - Description of what you added or fixed
   - Screenshots (if applicable)

## Reporting Issues
If you find a bug, please:
 - Check if it’s already reported under Issues
- Include detailed steps to reproduce it
- Mention your OS, Node.js version, and logs if possible
## Suggesting Features
We love ideas!
Open a new issue with the label enhancement and describe:
- What problem it solves
- How it improves the developer experience
- Any possible implementation ideas
## Code of Conduct
Be respectful, helpful, and inclusive.
No harassment or discrimination of any kind will be tolerated.
## Ready to Contribute?
1. Fork the repo
2. Create a feature branch
3. Implement your change
4. Test everything
5. Submit a Pull Request 🚀

Thank you for contributing to IntelliCI Server —