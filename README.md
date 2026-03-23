# Instagram Clone

A full-featured social media web application inspired by Instagram, built with a Node.js/Express backend and a vanilla JavaScript frontend. The application is fully localized in **Hebrew** with right-to-left (RTL) layout support.

---

## Features

### Users & Authentication
- Register and log in with email, phone number, or username
- JWT-based authentication with secure token handling
- Profile management with avatar upload
- Account deletion

### Social Graph
- Follow and unfollow users
- User suggestions
- View followers and following lists
- Geographic map visualization of followed users (Google Maps)

### Posts
- Create posts with text, images, or video
- Edit and delete your own posts
- Like / unlike with live counters
- Comment on posts, delete comments
- Share posts within the app
- Share posts directly to a Facebook Page
- Search posts by title, content, date, or author
- Filter posts by media type (text, image, video)
- Hashtag support

### Stories
- Upload stories with automatic 24-hour expiration
- Story rings from followed users on the feed
- View stories by owner

### Groups
- Create groups with name, description, category, and cover image
- Join and leave groups
- Admin controls: add/remove members
- Search and filter groups by name, category, or date range

### Feed
- Personalized feed showing posts from followed users
- Advanced search and filter modal

### Notifications
- Real-time notifications for follows, likes, and comments
- Mark individual or all notifications as read
- Unread badge counter

### Extras
- Daily historical fact (sourced from Wikipedia)
- Dark mode toggle
- Post reporting
- Dashboard with analytics
- Full RTL layout for Hebrew

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Authentication | JSON Web Tokens (JWT) |
| File Uploads | Multer |
| Password Hashing | bcrypt |
| HTTP Client | Axios |
| Frontend | Vanilla HTML5, CSS3, JavaScript |
| CSS Framework | Bootstrap 5.3 (RTL) |
| Icons | Bootstrap Icons |
| External APIs | Facebook Graph API, Google Maps Geocoding API, Wikipedia API |

---

## Project Structure

```
instagram_clone/
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── upload.js           # Multer file upload config
│   ├── controllers/
│   │   ├── facebookController.js
│   │   ├── groupController.js
│   │   ├── postController.js
│   │   ├── storyController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── groupValidation.js
│   │   └── validateObjectId.js
│   ├── models/
│   │   ├── Group.js
│   │   ├── Notification.js
│   │   ├── Post.js
│   │   ├── Story.js
│   │   └── User.js
│   ├── routes/
│   │   ├── facebookRoutes.js
│   │   ├── factRoutes.js
│   │   ├── feedRoutes.js
│   │   ├── followingRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── postRoutes.js
│   │   ├── storyRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   └── notificationService.js
│   ├── uploads/                # User-uploaded media (git-ignored)
│   ├── .env.example            # Environment variable template
│   └── server.js               # App entry point
│
└── public/                     # Frontend (served statically)
    ├── index.html              # Login page
    ├── reg.html                # Registration page
    ├── feed.html               # Main feed
    └── images/
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account and cluster
- (Optional) A Facebook Developer app with a Page Access Token
- (Optional) A Google Maps Geocoding API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/App_Development.git
   cd App_Development
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Open `backend/.env` and fill in your values:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   JWT_SECRET=your_strong_random_secret
   PAGE_ID=your_facebook_page_id
   PAGE_ACCESS_TOKEN=your_facebook_page_access_token
   ```

### Running the App

**Development** (auto-reload with nodemon):
```bash
cd backend
npm run dev
```

**Production:**
```bash
cd backend
npm start
```

The server starts on `http://localhost:5000`.

| Page | URL |
|---|---|
| Login | http://localhost:5000/ |
| Register | http://localhost:5000/reg.html |
| Feed | http://localhost:5000/feed.html |
| Health check | http://localhost:5000/api/health |

---

## API Overview

| Prefix | Description |
|---|---|
| `/api/users` | Auth, profiles, following |
| `/api/posts` | Posts, likes, comments, shares |
| `/api/groups` | Group management |
| `/api/feed` | Personalized feed |
| `/api/stories` | Stories |
| `/api/notifications` | Notifications |
| `/api/following` | Geographic follower data |
| `/api/facebook` | Facebook page integration |
| `/api/fact` | Daily historical fact |
| `/uploads` | Static media files |

---

## License

This project is for educational purposes.
