# Trellia - Kanban Project Management Tool

Trellia is a full-stack Kanban-style project management application built with Next.js, Express, and Prisma. It allows users to create boards, manage lists, and track tasks (cards) with features like drag-and-drop, checklists, due dates, and more.

## Project Structure

- `/trellia_backend`: Express.js server with Prisma ORM.
- `/trellia_frontend`: Next.js application with Tailwind CSS.

---

## Prerequisites

- **Node.js**: v18 or higher.
- **pnpm**: Recommended package manager (npm or yarn also work).
- **PostgreSQL**: A running instance of PostgreSQL.

---

## Getting Started

### 1. Backend Setup (`/trellia_backend`)

1. **Navigate to the directory**:
   ```bash
   cd trellia_backend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `trellia_backend` folder (or use the existing one) and set your database connection string and port:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/trelliadb"
   PORT=5000
   ```

4. **Initialize Metadata**:
   Ensure your database is synchronized with the Prisma schema:
   ```bash
   npx prisma db push
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```
   The backend will be running at `http://localhost:5000`.

---

### 2. Frontend Setup (`/trellia_frontend`)

1. **Navigate to the directory**:
   ```bash
   cd trellia_frontend
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the `trellia_frontend` folder and point it to the backend API:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

---

## Key Features

- **Dynamic Boards**: Create and customize project boards with colors or backgrounds.
- **List Management**: Organize tasks into vertical columns (lists) with drag-and-drop reordering.
- **Task Interaction**: 
  - Rich task details with descriptions and comments.
  - Multi-item checklists with progress tracking.
  - Due date management with overdue indicators.
  - File and URL attachments.
  - Member assignments and label categorization.
- **Mobile Responsive**: Optimized layout for both desktop and mobile devices.
- **Activity Log**: Track changes and updates within each task.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS, Lucide React, @hello-pangea/dnd.
- **Backend**: Node.js, Express.js.
- **Database**: PostgreSQL with Prisma ORM.
