# AI Creative Prompt Assistant 

This is a **Next.js-based AI Prompt Generation Tool**. 
It helps users create highly detailed, high-quality descriptive prompts for creative writing and digital art generation. It supports custom API endpoints (BYOK - Bring Your Own Key).

## ✨ Features

*   **Client-Side Only**: Runs entirely in the browser. No backend server required.
*   **Universal API Support**: Compatible with OpenAI, DeepSeek, LocalAI, or any OpenAI-compatible API.
*   **Persistent Config**: Automatically saves your API settings locally.
*   **One-Click Generation**: Acts as a "Prompt Engineer" to generate detailed tag combinations.

## 🚀 Deployment Guide (GitHub + Zeabur)

### Step 1: Upload to GitHub
1.  Create a **new** repository on GitHub with a **generic name** (e.g., `creative-prompter` or `my-ai-tools`).
2.  Upload all files from this project to the new repository.
    - If developing locally:
      ```bash
      git init
      git add .
      git commit -m "Initial commit"
      git remote add origin <your-new-repo-url>
      git push -u origin main
      ```

### Step 2: Deploy on Zeabur
1.  Log in to [Zeabur](https://zeabur.com).
2.  Click **Create Project** -> **Deploy New Service** -> **GitHub**.
3.  Select your new repository.
4.  Zeabur will automatically detect Next.js and deploy.
5.  **No environment variables needed** (API Key is entered in the web UI).

## 🌐 Usage (with Local Proxy)

If you are using a local proxy (e.g., port `7897`):

1.  Open your deployed site.
2.  Click the **Settings** icon.
3.  **API Endpoint**: Enter your API provider's URL.
    - OpenAI: `https://api.openai.com/v1/chat/completions`
    - DeepSeek: `https://api.deepseek.com/chat/completions`
    - Local Proxy: `http://localhost:3000/v1/chat/completions` (ensure CORS is enabled)
4.  **Model Name**: Enter model name (e.g., `gpt-3.5-turbo`, `deepseek-chat`).
5.  **API Key**: Enter your key.
6.  Save and Generate.

**Note**: Since this is a client-side app, ensure your API provider supports CORS or use a CORS proxy if connecting from a browser.

## Admin Image Archive

Generated images shown in the admin gallery are read from recent image logs.

Notes:

- The admin gallery keeps only the latest 200 image records.
- Some upstream image URLs may expire over time.
