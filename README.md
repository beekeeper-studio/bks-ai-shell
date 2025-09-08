# AI Shell

Ask AI to analyze your database and generate SQL queries.

![ai-shell-demo](https://github.com/user-attachments/assets/95efa8e4-b9ce-4bff-ac11-46a960812ca8)

## Development

```bash
# Clone the repo
git clone git@github.com:beekeeper-studio/bks-ai-shell.git

# Go to the directory
cd bks-ai-shell

# Link the directory to Beekeeper Studio plugins
ln -s $(pwd) ~/.config/beekeeper-studio/plugins/bks-ai-shell
# On Windows, replace $(pwd) with %cd%

# Install dependencies
yarn install

# Start development
yarn dev
```

Finally, open Beekeeper Studio 5.3 or newer (or restart the app).

## Deployment

Build the project for production:

```
yarn build
```

## Security Note

This application uses the `anthropic-dangerous-direct-browser-access: true` header to enable browser usage of the Anthropic API. While convenient for this demo, be aware that this approach exposes your API key to potential security risks in a production environment.
