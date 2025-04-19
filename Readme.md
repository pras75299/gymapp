# GymLogic - QR Code Based Gym Pass System

A mobile-friendly web application that enables gym members to purchase temporary passes via QR code scanning and receive an entry QR code upon successful payment.

## 🚀 Features

- **Gym Identification**: Scan gym-specific QR codes to identify the gym
- **Pass Selection**: View and select from available pass options (duration, price)
- **Payment Integration**: Secure payment processing via Stripe
- **Entry QR Code Generation**: Generate unique, time-limited QR codes for gym entry
- **QR Code Validation**: Simple validation system for gym staff

## 🛠️ Technology Stack

### Backend
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- Stripe Payment Integration
- QR Code Generation

### Frontend
- React Native
- TypeScript
- QR Code Scanner
- Responsive Design

## 📋 Prerequisites

- Node.js (v18)
- PostgreSQL
- npm
- Razorpay (for payment processing)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/pras75299/gymapp.git
cd gymapp
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
Create `.env` files in both backend and frontend directories with the following variables:

Backend (.env):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/gymlogic"
RAZORPAY_KEY_ID="your_secret_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
```


4. Initialize the database:
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

## 🚀 Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npx expo start --clear
```

The application will be available at:
- Frontend: http://localhost:8081
- Backend API: http://localhost:8080

## 📚 Project Structure

```
gymlogic/
├── backend/               # Backend application
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   └── prisma/           # Database schema and migrations

```

## 🔐 API Endpoints

- `GET /api/gym/:qrIdentifier`: Get gym details and available passes
- `POST /api/passes/purchase`: Initiate pass purchase
- `POST /api/payments/webhook`: Handle payment webhooks
- `GET /api/passes/:passId/status`: Check pass status
- `GET /api/validate/:qrCodeValue`: Validate entry QR code

## 🧪 Testing

Run tests for both backend and frontend:

```bash
# Backend tests
cd backend

# Frontend tests
cd frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

