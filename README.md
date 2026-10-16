# DelanBank - Digital Banking Platform

A modern, full-stack banking application built with Next.js 14, offering comprehensive financial management capabilities with real bank integrations through Plaid API and secure payment processing via Dwolla.

![Banking App](https://img.shields.io/badge/Next.js-14.2.3-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)

## 🚀 Features

### 🏦 Banking Operations

- **Multi-Bank Account Integration**: Connect and manage multiple bank accounts via Plaid API
- **Real-Time Balance Tracking**: View consolidated balances across all connected accounts
- **Transaction History**: Comprehensive transaction tracking with categorization
- **Fund Transfers**: Secure money transfers between accounts using Dwolla payment processing

### 🔐 Security & Authentication

- **Secure Authentication**: Email/password authentication with Appwrite backend
- **Session Management**: Secure session handling with HTTP-only cookies
- **Data Encryption**: Sensitive data encryption for user privacy
- **Error Monitoring**: Integrated Sentry for real-time error tracking

### 📱 User Experience

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Charts**: Financial data visualization using Chart.js
- **Animated Counters**: Smooth number animations for balance displays
- **Modern UI Components**: Built with Radix UI primitives and shadcn/ui

### 📊 Analytics & Insights

- **Spending Categories**: Automatic transaction categorization
- **Balance Analytics**: Visual representation of financial data
- **Account Management**: Detailed account information and management tools

## 🛠️ Technology Stack

### Frontend

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI + shadcn/ui components
- **Charts**: Chart.js with React wrapper
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Backend & Services

- **Database**: Appwrite (Backend-as-a-Service)
- **Authentication**: Appwrite Auth with custom session handling
- **Bank Integration**: Plaid API for account connectivity
- **Payment Processing**: Dwolla for secure transfers
- **File Storage**: Appwrite Storage for documents

### Development Tools

- **Error Monitoring**: Sentry for production error tracking
- **Code Quality**: ESLint + TypeScript strict mode
- **Build Tool**: Next.js built-in bundler
- **Package Manager**: npm/yarn support

## 📁 Project Structure

```
dil_banking/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── sign-in/             # Login page
│   │   └── sign-up/             # Registration page
│   ├── (root)/                  # Protected routes
│   │   ├── my-banks/            # Bank accounts management
│   │   ├── payment-transfer/    # Fund transfer interface
│   │   ├── transaction-history/ # Transaction logs
│   │   └── page.tsx             # Dashboard home
│   ├── api/                     # API routes
│   └── layout.tsx               # Root layout
├── components/
│   ├── shared/                  # Reusable components
│   │   ├── AuthForm.tsx         # Authentication forms
│   │   ├── BankCard.tsx         # Bank account cards
│   │   ├── DoughnutChart.tsx    # Financial charts
│   │   ├── PlaidLink.tsx        # Bank connection UI
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   └── ...                  # Additional components
│   └── ui/                      # Base UI components
├── lib/
│   ├── actions/                 # Server actions
│   │   ├── bank.action.ts       # Bank operations
│   │   ├── user.action.ts       # User management
│   │   ├── dwolla.action.ts     # Payment processing
│   │   └── transaction.action.ts # Transaction handling
│   ├── server/
│   │   └── appwrite.ts          # Appwrite client config
│   ├── plaid.ts                 # Plaid API configuration
│   └── utils.ts                 # Utility functions
├── types/
│   └── index.d.ts               # TypeScript type definitions
└── constants/
    └── index.ts                 # App constants and config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

You can preview the sign-in and sign-up screens without configuring any services.
The authenticated banking features require Appwrite, Plaid, and Dwolla credentials.

### Environment Variables

Copy `.env.example` to `.env.local` in the project root. To use the banking
features, fill in the Appwrite, Plaid, and Dwolla values with development or
sandbox credentials:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
NEXT_APPWRITE_KEY=your_appwrite_secret_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_USER_COLLECTION_ID=your_user_collection_id
APPWRITE_BANK_COLLECTION_ID=your_bank_collection_id
APPWRITE_TRANSACTION_COLLECTION_ID=your_transaction_collection_id

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_key

# Dwolla Configuration
DWOLLA_ENV=sandbox
DWOLLA_KEY=your_dwolla_key
DWOLLA_SECRET=your_dwolla_secret

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_organization
SENTRY_PROJECT=your_sentry_project
```

Sentry is disabled unless `NEXT_PUBLIC_SENTRY_DSN` is set. Source map uploads
are enabled only when all four Sentry variables are configured.

### Installation

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Create local environment configuration**

   ```bash
   cp .env.example .env.local
   ```

   Service values can be left blank to preview the authentication screens. To
   use the banking dashboard, configure the required services below.

3. **Set up Appwrite**

   - Create an Appwrite project
   - Create an API key
   - Create a database and user, bank, and transaction collections
   - Add the collection attributes used by the app and configure permissions

4. **Configure Plaid and Dwolla sandbox credentials**

   - Create development credentials in the [Plaid Dashboard](https://dashboard.plaid.com/)
   - Create a [Dwolla Developer Account](https://www.dwolla.com/developers/) and use its sandbox credentials

5. **Start the preview server**

   ```bash
   npm run preview
   ```

6. **Open the preview**

   Navigate to [http://localhost:3000](http://localhost:3000). The server binds
   to all interfaces so forwarded workspace ports can reach it.

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run preview      # Start a preview server accessible through forwarded ports
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint for code quality
```

## 🏛️ Key Components

### Authentication Flow

- **Sign Up**: Complete user registration with personal details
- **Sign In**: Secure email/password authentication
- **Session Management**: Persistent sessions with secure cookies

### Banking Integration

- **Plaid Link**: Secure bank account connection interface
- **Account Sync**: Real-time account data synchronization
- **Transaction Monitoring**: Automatic transaction categorization and tracking

### Payment Processing

- **Dwolla Integration**: ACH transfers between connected accounts
- **Transfer Validation**: Comprehensive validation and error handling
- **Payment History**: Complete audit trail of all transactions

## 🎨 Design System

The application uses a custom design system built on:

- **Typography**: Inter and IBM Plex Serif fonts
- **Color Palette**: Blue-focused banking theme with gradients
- **Components**: Consistent spacing, shadows, and interactive states
- **Responsive Design**: Mobile-first approach with desktop enhancements

## 🔒 Security Features

- **Secure Authentication**: Appwrite-powered auth with session management
- **Data Encryption**: Sensitive user data protection
- **API Security**: Server-side validation and sanitization
- **Error Monitoring**: Sentry integration for production monitoring
- **HTTPS Only**: Secure cookie configuration for production

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Manual Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Configure reverse proxy (nginx) for production

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Plaid](https://plaid.com/) for banking data APIs
- [Dwolla](https://www.dwolla.com/) for payment processing
- [Appwrite](https://appwrite.io/) for backend services
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Vercel](https://vercel.com/) for hosting platform

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**DelanBank** - The future of digital banking is here. 🏦✨
