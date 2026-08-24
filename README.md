# CarePulse Clinic - Appointment & Live Queue System

A medical-grade, single-doctor **Clinic Appointment & Live Queue Management System** designed for high outpatient (OPD) throughput and zero hosting/database costs.

---

## 🌟 Key Features

1. **Patient Booking Portal (`/`)**:
   - Displays "Doctor on Duty Today" (specialization, experience, qualifications, consultation fee, standard 15-min slots).
   - Date picker with morning & evening session slot generation.
   - Prevents double-booking and automatically allocates daily sequential token numbers (#01, #02...).

2. **Patient Live Tracker & Self Check-In (`/track/[id]` & `/track`)**:
   - Real-time token status indicator (`BOOKED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).
   - One-tap **"I Have Arrived (Check-In)"** button to intimate clinic staff upon physical arrival.
   - Real-time waiting position and estimated wait time countdown.
   - SWR live polling every 4 seconds.

3. **Doctor / Reception Queue Management Desk (`/admin`)**:
   - Live queue table categorized by *Waiting (Checked-In)*, *In-Consultation*, *Booked (Not Arrived)*, *Completed*, *Skipped*.
   - One-click **"Call Next Patient"**, **"Start Visit"**, **"Finish"**, **"Skip / No-Show"**.
   - Quick **Walk-In Registration** modal to assign immediate tokens to walk-in patients.
   - Active Doctor switcher on duty.

4. **Waiting Room TV Screen (`/display`)**:
   - Fullscreen Kiosk mode for waiting room smart TVs/monitors.
   - Giant **"NOW SERVING: TOKEN #XX"** display with dual-tone audio chime announcement.
   - **"UP NEXT"** queue preview list.
   - Live digital clock and clinic status ticker.

---

## 🛠️ Zero-Cost Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + React 18
- **Styling**: Tailwind CSS + Lucide Icons + Canvas Confetti
- **ORM & Database**: Prisma ORM with SQLite (Local) / Neon PostgreSQL (Production)
- **Live Sync**: SWR real-time lightweight polling
- **Hosting**: Vercel Free Tier ($0/mo) + Neon Free Tier ($0/mo)

---

## 🚀 Getting Started Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Initialize and Seed the Database
```bash
npx prisma db push
npm run db:seed
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel (100% Free)

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. In Vercel Marketplace, add **Neon Serverless Postgres** (Free Tier).
4. Update `prisma/schema.prisma` datasource provider to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Deploy!
