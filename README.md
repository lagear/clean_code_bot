# Clean Code Bot

A CLI tool that accepts a "dirty" or undocumented source code file and returns an optimized version that follows **SOLID principles**, with comprehensive technical documentation (Docstrings / JSDoc).

It uses a **Chain-of-Thought (CoT)** prompt strategy — the AI first performs a logical analysis of the code before proposing specific improvements — and includes input sanitization to prevent **prompt injection** attacks.

Supports three LLM backends: **OpenAI**, **Groq** (free cloud tier), and **Ollama** (fully local, no API key required).

---

## Features

- Refactors code to follow all five SOLID principles
- Adds docstrings (Python) or JSDoc (JavaScript/TypeScript)
- Chain-of-Thought reasoning: analyze → plan → refactor
- Supports **OpenAI** and **Groq** (free tier) as LLM providers
- Prompt injection protection
- `--dry-run` mode to preview the prompt before sending
- `--verbose` mode to inspect the AI's reasoning

---

## Supported Languages

| Extension | Language   |
|-----------|------------|
| `.py`     | Python     |
| `.js`     | JavaScript |
| `.ts`     | TypeScript |
| `.java`   | Java       |
| `.go`     | Go         |
| `.rb`     | Ruby       |
| `.cs`     | C#         |
| `.cpp`    | C++        |
| `.c`      | C          |
| `.php`    | PHP        |

---

## Requirements

- Python 3.11 or higher
- One of the following:
  - A **Groq** API key — free tier at [console.groq.com](https://console.groq.com/keys)
  - An **OpenAI** API key — pay-as-you-go at [platform.openai.com](https://platform.openai.com/api-keys)
  - **Ollama** installed locally — free, no account needed

---

## Installation

### macOS

```bash
# 1. Clone the repository
git clone https://github.com/your-username/clean_code_bot.git
cd clean_code_bot

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure credentials
cp .env.example .env
# Open .env in any editor and add your API key
```

### Linux

```bash
# 1. Clone the repository
git clone https://github.com/your-username/clean_code_bot.git
cd clean_code_bot

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure credentials
cp .env.example .env
# Edit .env with your preferred editor (nano, vim, etc.)
nano .env
```

> **Note:** If `python3` is not found, install it with your package manager:
> - Ubuntu/Debian: `sudo apt install python3 python3-venv`
> - Fedora/RHEL: `sudo dnf install python3`
> - Arch: `sudo pacman -S python`

### Windows

```powershell
# 1. Clone the repository
git clone https://github.com/your-username/clean_code_bot.git
cd clean_code_bot

# 2. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure credentials
copy .env.example .env
# Open .env in Notepad or any editor and add your API key
notepad .env
```

> **Note:** If `python` is not found, download and install Python from [python.org](https://www.python.org/downloads/).  
> During installation, check **"Add Python to PATH"**.

---

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```env
# Provider to use: openai | groq | ollama
CCB_PROVIDER=groq

# OpenAI API key — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Groq API key (free tier) — https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# Ollama — no key required, just make sure Ollama is running locally
```

You only need the key for the provider you intend to use. Ollama requires no key at all.

---

## Usage

### Activate the virtual environment first

| Platform       | Command                        |
|----------------|--------------------------------|
| macOS / Linux  | `source .venv/bin/activate`    |
| Windows        | `.venv\Scripts\activate`       |

### Basic usage

```bash
# Refactor a Python file, print result to stdout
python clean_code_bot.py --file examples/python_before.py

# Save output to a new file
python clean_code_bot.py -f examples/python_before.py -o clean_output.py

# Use Groq explicitly
python clean_code_bot.py -f messy_code.js --provider groq

# Use OpenAI with a specific model
python clean_code_bot.py -f messy_code.py --provider openai --model gpt-4o
```

### Show AI reasoning (Chain-of-Thought)

```bash
python clean_code_bot.py -f examples/python_before.py --verbose
```

The AI's step-by-step analysis (violation detection, refactoring plan) is printed to `stderr` so it does not pollute piped output.

### Preview the prompt without calling the API

```bash
python clean_code_bot.py -f examples/python_before.py --dry-run
```

### Enforce specific SOLID principles only

```bash
python clean_code_bot.py -f messy.py --principles "Single Responsibility,Open/Closed"
```

---

## All CLI Options

| Option              | Short | Description                                                      | Default                     |
|---------------------|-------|------------------------------------------------------------------|-----------------------------|
| `--file`            | `-f`  | Path to the source file to refactor (**required**)              | —                           |
| `--provider`        | `-p`  | LLM provider: `openai`, `groq`, or `ollama`                     | `CCB_PROVIDER` env, then `openai` |
| `--model`           | `-m`  | Override the model name                                          | Provider default            |
| `--output`          | `-o`  | Write refactored code to this file instead of stdout            | stdout                      |
| `--principles`      |       | Comma-separated SOLID principles to enforce                     | All five                    |
| `--verbose`         | `-v`  | Print CoT reasoning to stderr                                    | Off                         |
| `--dry-run`         |       | Print the prompt without calling the API                         | Off                         |

---

---

## Using Ollama (Local Open-Source Models)

[Ollama](https://ollama.com) lets you run open-source LLMs entirely on your machine — no API key, no internet connection required after the model is downloaded.

### Install Ollama

| Platform      | Command / Link                                              |
|---------------|-------------------------------------------------------------|
| macOS         | `brew install ollama`                                       |
| Linux         | `curl -fsSL https://ollama.com/install.sh \| sh`           |
| Windows       | Download the installer from [ollama.com/download](https://ollama.com/download) |

### Pull a model

```bash
# Good coding models (pick one):
ollama pull codellama        # Meta's code-focused Llama (default)
ollama pull mistral          # Mistral 7B — fast and capable
ollama pull deepseek-coder   # DeepSeek Coder — excellent for refactoring
ollama pull llama3           # Llama 3 8B — general purpose
ollama pull qwen2.5-coder    # Qwen 2.5 Coder — strong at code tasks
```

### Start the Ollama server

```bash
ollama serve
```

The server runs at `http://localhost:11434` by default. Keep this terminal open (or run it as a background service).

### Run Clean Code Bot with Ollama

```bash
# Use the default model (codellama)
python clean_code_bot.py -f examples/python_before.py --provider ollama

# Use a specific model
python clean_code_bot.py -f examples/python_before.py --provider ollama --model mistral
python clean_code_bot.py -f examples/python_before.py --provider ollama --model deepseek-coder

# Save output to file
python clean_code_bot.py -f messy.py --provider ollama --model qwen2.5-coder -o clean.py
```

### Set Ollama as the default provider

In your `.env` file:

```env
CCB_PROVIDER=ollama
```

### Recommended models by use case

| Model            | Size   | Best for                          |
|------------------|--------|-----------------------------------|
| `codellama`      | 7B     | General code refactoring (default)|
| `deepseek-coder` | 6.7B   | Detailed code analysis            |
| `qwen2.5-coder`  | 7B     | Strong SOLID/pattern adherence    |
| `mistral`        | 7B     | Fast, balanced output             |
| `llama3`         | 8B     | Good reasoning, general purpose   |

> **Note:** Larger models (13B, 34B, 70B) produce better results but require more RAM/VRAM.  
> A 7B model needs ~8 GB RAM; a 13B model needs ~16 GB.

---

## Default Models

| Provider | Default Model              |
|----------|----------------------------|
| `openai` | `gpt-4o`                   |
| `groq`   | `llama-3.3-70b-versatile`  |
| `ollama` | `codellama`                |

---

## Examples

The `examples/` folder contains ready-to-use before/after pairs:

| File                      | Description                                      |
|---------------------------|--------------------------------------------------|
| `python_before.py`        | God-class violating SRP, OCP, DIP               |
| `python_after.py`         | Refactored with abstractions and docstrings      |
| `javascript_before.js`    | Mixed-responsibility order processor             |
| `javascript_after.js`     | Refactored with interfaces, JSDoc, DI            |

Run the Python example:

```bash
python clean_code_bot.py -f examples/python_before.py -o examples/python_refactored.py --verbose
```

---

## Security

### Prompt Injection Protection

Malicious content embedded in source files (e.g., comments containing `IGNORE ALL PREVIOUS INSTRUCTIONS`) is neutralized before the code is sent to the LLM. The sanitizer detects and replaces:

- `</SOURCE_CODE>` — attempts to break out of the delimited code block
- Role-switch phrases: `SYSTEM:`, `USER:`, `ASSISTANT:` at line start
- Common jailbreak patterns: `ignore previous instructions`, `disregard all prior`, `new instructions:`, etc.
- Suspicious XML-style tags: `<system>`, `<prompt>`, `<instruction>`

Additional safeguards:
- **100 KB file size limit** — prevents token flooding
- **Extension allowlist** — only recognized source file types are accepted
- **Binary file rejection** — files with null bytes are refused
- **Structured prompt** — user code is always wrapped in `<SOURCE_CODE>` delimiters; the system prompt is never user-influenced

---

## Running Tests

```bash
# macOS / Linux
python -m pytest tests/ -v

# Windows
python -m pytest tests/ -v
```

Run only the security/injection tests:

```bash
python -m pytest tests/test_clean_code_bot.py -v -k "injection"
```

---

## Project Structure

```
clean_code_bot/
├── clean_code_bot.py       # Main CLI script
├── requirements.txt        # Runtime dependencies
├── .env.example            # Credentials template
├── .env                    # Your credentials (never commit this)
├── .gitignore
├── tests/
│   └── test_clean_code_bot.py
└── examples/
    ├── python_before.py
    ├── python_after.py
    ├── javascript_before.js
    └── javascript_after.js
```

---

## Dependencies

| Package        | Purpose                              |
|----------------|--------------------------------------|
| `click`        | CLI framework                        |
| `openai`       | OpenAI & Groq API client (compatible)|
| `python-dotenv`| Load `.env` credentials              |

---

## License

MIT
