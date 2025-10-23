#!/bin/bash
# Quick helper for local dev
ollama serve &             # starts Ollama
cd apps/backend && npm run dev  # starts backend in Cursor
