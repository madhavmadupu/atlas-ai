# Setup Guide

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Ollama** installed on your machine ([Download](https://ollama.com))

## 1. Configure Ollama

Ensure Ollama is running and pull the required models:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

(Note: You can change the models in `atlas-engine/.env`)

## 2. Backend Setup (`atlas-engine`)

```bash
cd atlas-engine

# Create virtual environment
python -m venv .venv

# Activate venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Create .env
cp .env.example .env

# Start Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend is running at [http://localhost:8000/docs](http://localhost:8000/docs).

## 3. Frontend Setup (`atlas-web`)

```bash
cd atlas-web

# Install dependencies
npm install

# Start Dev Server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use Atlas-AI.

## 4. Usage

- **Chat**: Type messages to chat with the local LLM.
- **RAG**: Click the attachment icon 📎 to upload documents (PDF, TXT, MD).
- **Context**: Once uploaded, the AI will automatically have access to your documents.
- **Status**: The top-right indicator shows if Ollama is connected and if GPU is active.
