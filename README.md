# VOFC Engine

A secure, enterprise-grade application for managing Vulnerabilities and Options for Consideration (VOFC) records.

## 🚀 Features

- **🔐 Secure Authentication**: JWT tokens with HTTP-only cookies, no localStorage
- **🛡️ Security First**: XSS protection, CSRF protection, rate limiting, account lockout
- **📊 Database Management**: User management, staging system, backup system
- **🎯 Role-Based Access**: Admin, SPSA, PSA, and Analyst roles
- **📁 Document Processing**: Bulk upload and staging for VOFC records
- **💾 Automated Backups**: Encrypted database backups with scheduling

## 🏗️ Architecture

### Security Features
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **XSS Protection**: DOMPurify sanitization
- **Rate Limiting**: Login attempt limiting
- **Input Validation**: Comprehensive sanitization

### Database Schema
- **User Management**: `vofc_users`, `user_sessions`
- **Staging System**: `staging_vofc_records`, `source_documents`
- **Backup System**: `backup_metadata`, `backup_verification_logs`
- **Main Data**: `questions`, `vulnerabilities`, `ofcs`

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT tokens, bcrypt
- **Security**: DOMPurify, CSRF protection
- **Styling**: CISA Design System, Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/frosty865/VOFC-Engine.git
cd VOFC-Engine
```

### 2. Install Dependencies
```bash
cd vofc-viewer
npm install
```

### 3. Environment Setup
Create `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### 4. Database Setup
```bash
# Run the secure authentication setup
node scripts/setup-secure-simple.js
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and login with:
- **Username**: `admin`
- **Password**: `AdminSecure2024!`

## 📚 Documentation

- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete database documentation
- [Security Architecture](docs/SECURITY_ARCHITECTURE.md) - Security implementation details
- [API Documentation](docs/API_DOCUMENTATION.md) - API endpoint documentation
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment instructions

## 🔐 Security Features

### Authentication
- JWT tokens with HTTP-only cookies
- bcrypt password hashing (12 salt rounds)
- Session management with expiration
- Account lockout after failed attempts

### Protection
- XSS protection with DOMPurify
- CSRF protection
- Input sanitization and validation
- Rate limiting on authentication endpoints

### Database Security
- Row Level Security (RLS) policies
- Encrypted backups with AES-256-GCM
- Secure session storage
- Audit logging

## 🏢 User Roles

- **Admin**: Full system access, user management, backups
- **SPSA**: Supervisory PSA with user management
- **PSA**: Protective Security Advisor
- **Analyst**: Read-only access with submission capabilities

## 📁 Project Structure

```
vofc-viewer/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── lib/              # Utility libraries
├── docs/                 # Documentation
├── scripts/              # Setup and utility scripts
├── sql/                  # Database schema files
└── public/               # Static assets
```

## 🚀 Deployment

### Production Deployment
1. Set up production environment variables
2. Run database migrations
3. Build the application: `npm run build`
4. Deploy to your hosting platform

### Docker Deployment
```bash
docker build -t vofc-engine .
docker run -p 3000:3000 vofc-engine
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `docs/` folder
- Review the security guide for implementation details

## 🔄 Changelog

### v1.0.0 - Initial Release
- Secure authentication system
- Database schema implementation
- XSS and CSRF protection
- Role-based access control
- Automated backup system
- Comprehensive documentation

---

**Built with ❤️ for CISA and the cybersecurity community**