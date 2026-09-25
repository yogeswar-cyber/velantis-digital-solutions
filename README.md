# VELANTIS DIGITAL SOLUTIONS

> Production-ready full-stack digital solutions platform for the VELANTIS freelance team.

VELANTIS is a digital solutions studio providing modern web development, e-commerce systems, booking solutions, automation, UI/UX design, and technical support.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 + Vite 8
- **Routing**: React Router 7
- **Icons**: Lucide React
- **Styling**: Modern responsive CSS design system (White + `#ff5a00` warm orange accent + dark navy typography)

### Backend (In Progress)
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting, Argon2id/Bcrypt password hashing, HttpOnly secure cookies

---

## 📁 Repository Structure

```text
velantis-digital-solutions/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Brand logos and imagery
│   ├── components/         # Reusable UI components
│   ├── pages/              # Visual application pages
│   ├── services/           # Frontend API client
│   ├── styles.css          # Design system styles
│   └── main.jsx            # Application entrypoint
├── server/                 # Express backend API & controllers
│   ├── prisma/             # Database schema & migrations
│   └── src/                # Backend routes, controllers, middleware
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── package.json            # Pinned dependencies & scripts
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: (for backend database services)

### Installation
1. Clone the repository and navigate into the project directory:
   ```bash
   git clone <repo-url>
   cd velantis-digital-solutions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL and SMTP configuration
   ```

---

## 💻 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite development server for the frontend |
| `npm run build` | Compiles the production-ready frontend bundle into `dist/` |
| `npm run preview` | Locally serves the production build for testing |

---

## 🔒 Security Best Practices

- **Never commit `.env` files** or secrets to version control.
- All client-submitted data is strictly validated server-side.
- File uploads are validated by MIME type, size limit, and stored under randomized storage keys.
- Administrative endpoints require authenticated sessions and role-based permissions.

---

## 📄 License
Private repository © 2026 VELANTIS DIGITAL SOLUTIONS. All rights reserved.
