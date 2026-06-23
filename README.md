# Konvo 

> A real-time desktop chat and social platform — built with Next.js 15 and PocketBase.

Konvo brings together private messaging and a public social feed in one sleek, desktop-first experience. Chat with friends in real time, share media, react to posts, and stay connected — all with zero backend complexity thanks to PocketBase.

---

##  Features

###  Messaging
- Real-time chat with instant message delivery
- Typing indicators so you know when someone's responding
- Read receipts (sent / delivered / seen)
- Reply threads — quote any message to keep context
- Share images, videos, audio, documents, and even capture from your camera
- Custom chat wallpapers per conversation
- Delete chat history for yourself

### Social Feed
- Post with captions and images
- Like, comment, reply to comments, and save posts
- Live notifications for likes and comments
- Report inappropriate posts

### Profiles
- User profiles with stats (posts, followers, etc.)
- View saved posts and notification history
- Block / unblock users

---

##  Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Framework  | [Next.js 15](https://nextjs.org/) + TypeScript  |
| Backend    | [PocketBase](https://pocketbase.io/)            |
| Styling    | Tailwind CSS                                    |
| Icons      | Bootstrap Icons                                 |
| UI Extras  | React Toastify, Emoji Picker React, React Select |

---

##  Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **PocketBase** — [download here](https://pocketbase.io/docs/)

### 1. Clone the repo

```bash
git clone https://github.com/dauntflash/konvo.git
cd konvo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PocketBase

Download the PocketBase binary for your OS from [pocketbase.io](https://pocketbase.io/docs/), place it in the project root (or anywhere you prefer), then run:

```bash
./pocketbase serve --http=0.0.0.0:8090
```

Then import the schema:

1. Open your PocketBase admin panel at `http://localhost:8090/_/`
2. Go to **Settings → Import collections**
3. Upload or paste the contents of [`pb_schema.json`](./pb_schema.json)
4. Click **Import** — all collections are created automatically 

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_PB_URL=http://localhost:8090
```

> If you're deploying PocketBase to a remote server, replace `localhost:8090` with your server's URL.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live! 🎉

---

##  Database Schema

Konvo uses the following PocketBase collections. You don't need to create these manually — just import `pb_schema.json`.

| Collection      | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `users`         | Auth collection — stores username, avatar, about, wallpaper, typing status |
| `posts`         | Social feed posts with captions, images, likes, and saves               |
| `comments`      | Comments and threaded replies on posts                                  |
| `messages`      | Private messages with file support, read status, and reply references   |
| `notifications` | Real-time alerts for likes, comments, and other activity                |
| `reports`       | User-submitted post reports                                             |
| `blocks`        | Block relationships between users                                       |

---

##  Project Structure

```
konvo/
├── app/               # Next.js app router — pages and layouts
├── lib/               # Utility functions, PocketBase client, helpers
├── public/
│   └── bgImages/      # Bundled chat wallpaper options
├── pb_schema.json     # PocketBase collection schema (import this!)
├── .env.local         # Your environment variables (create this)
└── ...config files
```

---

##  Deployment

### Frontend (Next.js)

Deploy to [Vercel](https://vercel.com/) in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dauntflash/konvo)

Set `NEXT_PUBLIC_PB_URL` to your hosted PocketBase URL in the Vercel environment settings.

### Backend (PocketBase)

PocketBase is a single binary — you can host it on any VPS (DigitalOcean, Railway, Fly.io, etc.). See the [PocketBase deployment docs](https://pocketbase.io/docs/going-to-production/) for guides.

---

##  Contributing

Contributions, bug reports, and feature requests are welcome! Here's how to get involved:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please open an issue first to discuss any significant changes.

---

##  License

MIT — see [LICENSE](./LICENSE) for details.

---

> **Note:** Konvo is currently a desktop-only experience. Mobile support may be added in future releases.