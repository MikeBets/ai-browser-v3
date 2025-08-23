# Mike Comet - AI Browser Project

## Project Overview
Building an AI-enhanced browser using Electron-Vite and Vercel AI SDK, similar to Perplexity Comet. The application combines a web browser interface with AI chat capabilities for analyzing web content and answering user queries.

## Tech Stack
- **Electron-Vite**: Fast Electron development with Vite hot reload
- **React**: Frontend UI framework
- **Vercel AI SDK**: AI model integration with streaming support
- **OpenAI GPT-4o**: Primary AI model (configurable)
- **Node.js 18+**: Runtime environment

## Key Features
- Web browser with webview for loading pages
- AI chat panel for querying page content
- Real-time streaming AI responses
- Page content extraction and analysis
- Support for multiple AI providers

## Project Structure
```
ai-browser/
├── electron.vite.config.js
├── src/
│   ├── main/           # Main process
│   ├── renderer/       # React frontend
│   └── preload/        # IPC bridge
├── package.json
└── .env               # API keys
```

## Development Commands
- `npm start`: Start development server
- `npm run build`: Build for production
- `npm install ai @ai-sdk/openai`: Install AI dependencies

## Environment Setup
Required environment variables in `.env`:
- `OPENAI_API_KEY`: OpenAI API key for AI functionality

## Security Considerations
- Context isolation enabled
- Page content truncated before sending to AI
- No sensitive data in API calls
- Secure IPC communication

## Performance Notes
- Limit page content to 1000 characters for API efficiency
- Stream responses for better UX
- Hot reload for fast development

## Next Steps
1. MVP: Basic web browsing + AI summarization
2. Enhanced search with RAG capabilities
3. Automation features (form filling, etc.)
4. UI/UX improvements with Tailwind CSS

## Cost Estimates
- Development: 1-2 weeks for MVP
- API costs: ~$0.01 per query
- Deployment: Free with Electron packaging