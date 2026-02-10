# Atlas-AI 🌍

> **A fully local, privacy-first AI assistant running on your device.**

Atlas-AI is a research-grade local AI system. It implements a custom inference engine using `llama-cpp-python` for running quantized GGUF models and `sentence-transformers` for local embeddings, offering full control over the RAG pipeline without external runtime dependencies.

![Atlas-AI Banner](./atlas-web/public/window.svg)

## ✨ Features

- **🧠 Native GGUF Inference**: Runs Llama 2/3 directly in Python memory (no external APIs).
- **📚 Local Embeddings**: Uses high-performance BERT models via `sentence-transformers`.
- **🏠 100% Offline**: Models are downloaded once and run entirely on your hardware.
- **🚀 GPU Acceleration**: Optimizable via `llama.cpp` bindings (CUDA/Metal).
- **🎨 Modern UI**: Next.js + shadcn/ui interface.
- **🔌 API-First**: FastAPI backend with full Swagger documentation.

## 🏗 Architecture

- **Frontend**: Next.js 14, React 19, Tailwind CSS v4
- **Backend**: FastAPI, LangChain
- **Inference**: llama-cpp-python (GGUF), Hugging Face Hub

## 🚀 Quick Start

### 1. Backend
```bash
cd atlas-engine
pip install -r requirements.txt
uvicorn app.main:app
# First run will download models (~4GB)
```

### 2. Frontend
```bash
cd atlas-web
npm install && npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.
