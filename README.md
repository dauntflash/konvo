# Konvo

A real-time desktop chat and social platform built with Next.js and PocketBase.

## Features

- Real-time messaging with typing indicators, read receipts, and reply threads
- Media sharing — images, video, audio, documents, and camera capture
- Live notifications for likes and comments
- Social feed with posts, likes, comments, replies, and saves
- User profiles with stats, saved posts, and notification history
- Block/unblock users, report posts, delete chat history
- Custom chat wallpapers
- Desktop-only experience

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** PocketBase
- **UI:** Bootstrap Icons, React Toastify, Emoji Picker React

## Getting Started

### Prerequisites

- Node.js 18+
- PocketBase (download from [pocketbase.io](https://pocketbase.io))

### Setup

1. Clone the repo:
```bash
   git clone https://github.com/dauntflash/konvo.git
   cd konvo
```

2. Install dependencies:
```bash
   npm install
```

3. Start PocketBase:
```bash
   ./pocketbase serve --http=0.0.0.0:8090
```

4. Create `.env.local` in the root:

5. Run the dev server:
```bash
   npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## PocketBase Collections

The app requires the following collections in PocketBase:

| Collection | Description |
|---|---|
| `users` | Auth collection with username, avatar, about, wallpaper, isTyping, typingTo |
| `posts` | postCaption, postPic, likes, likedBy (relation), savedBy (relation), creator (relation) |
| `comments` | text, post (relation), user (relation), replyTo, replyToUsername |
| `messages` | text, file, fileType, fileName, sender, receiver, timestamp, status, replyTo, hiddenFor |
| `notifications` | recipient, actor, type, post, read |
| `reports` | post, reporter, reason |
| `blocks` | blocker, blocked |

## PocketBase Setup

Download and import the schema directly into your PocketBase instance:

1. Go to your PocketBase admin panel → Settings → Import collections
2. Paste or upload the [`pb_schema.json`](./pb_schema.json) file from this repo
3. Click Import

This will create all required collections with the correct fields and relations automatically — no manual setup needed.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_PB_URL` | PocketBase server URL |

## License

MIT
