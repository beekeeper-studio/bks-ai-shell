# AI Shell

Ask AI to analyze your database and generate SQL queries.

![ai-shell-demo](https://github.com/user-attachments/assets/95efa8e4-b9ce-4bff-ac11-46a960812ca8)

## Development

Run the commands below, and then open Beekeeper Studio.

```bash
cd ~/.config/beekeeper-studio/plugins
git clone git@github.com:beekeeper-studio/bks-ai-shell.git
cd ./bks-ai-shell
yarn install
yarn build # or yarn build --watch
```

If you run Beekeeper Studio project locally, you can right click the AI Shell tab header > `[DEV] Reload Plugin View` to reload the iframe.

## Deployment

Build the project for production:

```
yarn build
```

## Security Note

This application uses the `dangerouslyAllowBrowser: true` flag to enable browser usage of the LangChain components. While convenient for this demo, be aware that this approach exposes your API key to potential security risks in a production environment.

