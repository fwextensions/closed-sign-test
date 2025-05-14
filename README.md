# SF Office Closure Sign Generator

A web application for San Francisco city employees to create standardized "Sorry, we're closed" signs for their offices. The app uses GPT-4o to standardize closure information and generates both printable signs and JSON data for CMS integration.

## Features

- Simple form for entering department name and closure information
- AI-powered standardization of closure information using OpenAI's GPT-4o
- Beautifully designed printable closure signs
- JSON output for integration with city CMS systems
- Mobile-responsive design

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

### Installation

1. Clone this repository or download the files

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Rename `.env.example` to `.env` (or create a new `.env` file)
   - Add your OpenAI API key to the `.env` file:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     PORT=3000
     ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Enter your department name
2. Describe when your office will be closed
3. Specify when your office will reopen
4. Add any additional information (optional)
5. Click "Generate Sign" to create your standardized closure sign
6. Click "Print Sign" to print the sign
7. The JSON data at the bottom can be used for CMS integration

## Development

For development with auto-restart on file changes:

```bash
npm run dev
```

## License

City and County of San Francisco © 2025
