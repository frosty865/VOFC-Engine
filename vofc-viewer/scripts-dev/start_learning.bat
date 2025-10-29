@echo off
echo 🧠 Starting Learning System...
echo.

echo 📊 Setting up learning database...
node setup_learning_simple.js

echo.
echo 🚀 Starting learning system...
curl -X POST http://localhost:3000/api/learning/start -H "Content-Type: application/json" -d "{\"action\": \"start\"}"

echo.
echo ✅ Learning system setup complete!
echo 📋 The learning system will automatically improve AI processing over time
echo 🔍 Check learning status at: http://localhost:3000/learning
echo.
pause
