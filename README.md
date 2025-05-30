# AI Shell

A plugin for Beekeeper Studio

## Setup

1. Install dependencies:
   ```
   yarn install
   ```

2. Start the development server:
   ```
   yarn dev
   ```

3. Open your browser at http://localhost:5173

4. Enter your Claude API key when prompted (get one from https://console.anthropic.com/keys)

## Usage

1. Enter your API key on the first screen
2. Choose your preferred AI model provider (Claude is the default)
3. Start chatting with your selected AI model!
4. Your API key and preferences are stored locally in your browser

## Deployment

Build the project for production:

```
yarn build
```

## Security Note

This application uses the `dangerouslyAllowBrowser: true` flag to enable browser usage of the LangChain components. While convenient for this demo, be aware that this approach exposes your API key to potential security risks in a production environment.

