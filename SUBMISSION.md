# Project Submission

**Project:** Clean Code Bot — Automated Refactorer

**Repository:** https://github.com/lagear/clean_code_bot

**Author:** lagear

**Submission Date:** 2026-04-02

---

## Description

CLI tool that accepts a "dirty" or undocumented source code file and returns
an optimized version following SOLID principles with comprehensive documentation
(Docstrings / JSDoc).

## Key Deliverables

| Deliverable | Location |
|---|---|
| Main script | `clean_code_bot.py` |
| Dependencies | `requirements.txt` |
| Before/After examples | `examples/` |
| Unit tests (71 tests) | `tests/test_clean_code_bot.py` |
| Documentation | `README.md` |

## How to Run

```bash
git clone https://github.com/lagear/clean_code_bot.git
cd clean_code_bot
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your API key
python clean_code_bot.py -f examples/python_before.py --verbose
```
