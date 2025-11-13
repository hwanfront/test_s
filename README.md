# Test Project

A modern web application built with Next.js 14, React 18, and AI-powered analysis capabilities using Google Gemini API.

## 🚀 Tech Stack

- **Framework**: Next.js 14+ with React 18+
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **Styling**: Tailwind CSS 3.x
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Backend**: Supabase
- **AI**: Google Gemini API
- **Code Quality**: ESLint, TypeScript

## 📁 Project Structure

```text
src/          # Source code
tests/        # Test files
```

## 🛠️ Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys and configuration
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

## 🏃 Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Run tests and linter
npm test && npm run lint
```

The application will be available at `http://localhost:3000`

## 🏗️ Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## 📋 Features

- **Core AI Analysis MVP**: AI-powered analysis using Google Gemini API
- **Modern UI**: Responsive design with Tailwind CSS and shadcn/ui
- **Type Safety**: Full TypeScript support
- **Real-time Data**: Supabase integration
- **State Management**: Efficient state handling with Zustand

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📝 Code Style

- Follow TypeScript 5.x standard conventions
- Use ESLint for code quality
- Maintain consistent formatting

## 🤝 Contributing

1. Follow the coding guidelines in `.github/copilot-instructions.md`
2. Write tests for new features
3. Run `npm test && npm run lint` before committing
4. Ensure TypeScript types are properly defined

## 📄 License

[Add your license here]

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev)
- [shadcn/ui](https://ui.shadcn.com)
