# Atlas-AI 🌍

> **A fully local, privacy-first AI assistant running on your device.**

Atlas-AI combines the power of open-source LLMs (via Ollama) with a modern, knowledge-aware RAG system to give you a smart assistant that respects your data privacy.

![Atlas-AI Banner](./atlas-web/public/window.svg)

## ✨ Features

- **🏠 100% Local**: No data leaves your machine. Powered by Ollama.
- **📚 RAG (Knowledge Base)**: Upload PDFs, Markdown, or Text files. Atlas-AI indexes them instantly and cites sources in its answers.
- **🚀 GPU Acceleration**: Automatically detects and uses NVIDIA GPUs for fast inference.
- **🎨 Modern UI**: Beautiful dark-mode interface built with Next.js and shadcn/ui.
- **⚡ Streaming**: Real-time token streaming for a snappy chat experience.
- **🔌 API-First**: Full Python FastAPI backend with Swagger documentation.

## 🏗 Architecture

- **Frontend**: [Next.js](https://nextjs.org), [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com), [LangChain](https://langchain.com), [ChromaDB](https://www.trychroma.com)
- **AI Engine**: [Ollama](https://ollama.com) (Llama 3.2, etc.)

## 🚀 Quick Start

### 1. Prerequisites

- [Ollama](https://ollama.com) installed and running.
- Python 3.10+
- Node.js 18+

### 2. Setup

**Install Dependencies:**

```bash
# Backend
cd atlas-engine
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../atlas-web
npm install
```

### 3. Run

**Start Backend:**
```bash
# (In atlas-engine/)
uvicorn app.main:app
```

**Start Frontend:**
```bash
# (In atlas-web/)
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** to start chatting!

## 📖 Documentation

- [Setup Guide](docs/setup.md) - Detailed installation instructions.
- [Architecture](docs/architecture.md) - System design and data flow.
- [API Reference](docs/api-reference.md) - Backend API endpoints.

## 🤝 Contributing

This project uses a standard monorepo structure:
- `atlas-engine/`: Python backend
- `atlas-web/`: Next.js frontend

Contributions are welcome!

## 📄 License

MIT © 2026 Atlas-AI Team
