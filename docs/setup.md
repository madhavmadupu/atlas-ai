# Setup Guide

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Visual Studio Build Tools** (Optional, for GPU acceleration on Windows)

## 1. Backend Setup (`atlas-engine`)

Atlas-AI runs models locally using `llama-cpp-python` and `sentence-transformers`.

```bash
cd atlas-engine

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies (This includes PyTorch and Llama runtime)
pip install -r requirements.txt

# (Optional) GPU Acceleration
# If you have an NVIDIA GPU, reinstall llama-cpp-python with CUDA support:
# set CMAKE_ARGS="-DLLAMA_CUBLAS=on"
# pip install llama-cpp-python --upgrade --force-reinstall --no-cache-dir
```

**First Run:**
When you start the server for the first time, it will automatically download:
1. **Llama-2-7b-Chat-GGUF** (~4GB)
2. **all-MiniLM-L6-v2** (~80MB)

Please be patient.

```bash
# Start Server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 2. Frontend Setup (`atlas-web`)

```bash
cd atlas-web
npm install
npm run dev
```

## 3. Configuration

You can change the model in `atlas-engine/app/config.py`:
- `LLM_REPO_ID`: Hugging Face repo (e.g., `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`)
- `LLM_FILENAME`: Specific GGUF file name.
