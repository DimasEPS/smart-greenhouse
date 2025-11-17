# Greenhouse Monitoring System 🌿

Smart IoT-based greenhouse monitoring and control system dengan real-time sensor data visualization dan automated actuator control.

![Dashboard](https://img.shields.io/badge/Next.js-15.1.6-black?logo=next.js)
![React Query](https://img.shields.io/badge/React_Query-5.90.7-FF4154?logo=reactquery)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-010101?logo=socket.io)

## ✨ Features

- **Real-time Sensor Monitoring**
  - Temperature, Humidity, Soil Moisture, Light Intensity, Rain Detection
  - Auto-refresh setiap 10 detik
  - WebSocket untuk update instant

- **Actuator Control**
  - Roof/Glass control (Servo MG996R)
  - Water pump automation (Relay)
  - Manual override dari web dashboard

- **Historical Data Charts**
  - Time range selector: 24 jam, 7 hari, 30 hari
  - Interactive line charts dengan Recharts
  - Data grouping yang smart berdasarkan rentang waktu

- **Modern Tech Stack**
  - Server-side rendering dengan Next.js 15
  - Optimistic updates dengan React Query
  - Real-time komunikasi via WebSocket
  - Database ORM dengan Prisma

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15.1.6 (App Router)
- React Query (TanStack Query) 5.90.7
- Recharts untuk data visualization
- Tailwind CSS + shadcn/ui components
- Lucide React icons

**Backend:**
- Next.js API Routes
- Prisma ORM
- MySQL Database
- WebSocket Server (ws package)

**IoT Simulation:**
- Node.js simulator untuk testing
- Realistic sensor data generation

## 📋 Prerequisites

- Node.js 18+ 
- MySQL/MariaDB
- npm atau yarn

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/DimasEPS/smart-greenhouse.git
cd smart-greenhouse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Buat database MySQL baru:

```sql
CREATE DATABASE greenhouse_db;
```

Copy `.env.example` ke `.env` dan sesuaikan database URL:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/greenhouse_db"
```

### 4. Run Database Migration

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

Dashboard akan tersedia di: `http://localhost:3000/dashboard`

### 6. (Optional) Start IoT Simulator

Untuk testing tanpa hardware fisik:

```bash
node scripts/iot-simulator.js
```

## 📱 Usage

1. **Dashboard**: Akses `http://localhost:3000/dashboard`
2. **Lihat data sensor**: Real-time updates setiap 10 detik
3. **Control actuators**: Klik tombol "Buka Kaca" atau "Hidupkan Pompa"
4. **View history**: Pilih rentang waktu (24h/7d/30d) pada grafik

## 🔧 API Endpoints

```
GET  /api/sensors              # List semua sensor
GET  /api/readings             # Ambil sensor readings (with filters)
GET  /api/readings/latest      # Ambil pembacaan sensor terbaru
POST /api/readings/batch       # Simpan batch readings dari IoT

GET  /api/actuators            # List semua actuators
GET  /api/actuators/:id/status # Status actuator tertentu
POST /api/actuators/:id/commands # Kirim command ke actuator
```

## 🌐 WebSocket

Connect ke: `ws://localhost:3000/ws`

**Message Types:**
- `sensor_reading` - Data sensor dari ESP8266
- `actuator_command` - Command dari dashboard ke ESP8266
- `command_ack` - Acknowledgment dari ESP8266

## 📝 Database Schema

Lihat schema lengkap di `src/db/greenhouse.dbml` atau:

```bash
npx prisma studio
```

## 🤝 Contributing

Pull requests are welcome! Untuk perubahan besar, silakan buka issue terlebih dahulu.

## 📄 License

MIT

## 👨‍💻 Author

**Dimas EPS**
- GitHub: [@DimasEPS](https://github.com/DimasEPS)

