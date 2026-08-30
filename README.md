# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## MongoDB Atlas / Compass sync

The app stores data in Lovable Cloud. To mirror it into MongoDB Atlas so you can
browse it in Compass, run the sync from your own machine (MongoDB needs a raw TCP
connection that the hosted runtime can't open):

```bash
npm install mongodb
MONGODB_URI="<your Atlas connection string>" \
PORTAL_URL="https://<your-app>.lovable.app" \
MONGO_SYNC_TOKEN="<MONGO_SYNC_TOKEN from app secrets>" \
node scripts/sync-to-mongo.mjs
```

It upserts `students`, `subjects`, `attendance` and `marks` into the
`campus_portal` database. Re-run it (or schedule it) to refresh.
