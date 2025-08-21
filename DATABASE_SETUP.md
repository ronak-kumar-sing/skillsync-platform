# Database Setup Guide

This guide will help you set up the PostgreSQL database for the SkillSync platform.

## Option 1: Using Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed on your system

### Quick Setup
```bash
# Start the database services
npm run db:start

# Wait for services to be ready, then set up the database
npm run db:setup
```

### Manual Docker Setup
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Check if services are running
docker-compose ps

# Push the database schema
npm run db:push

# Seed the database with initial data
npm run db:seed

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### Useful Docker Commands
```bash
# Stop the database services
npm run db:stop

# View database logs
npm run db:logs

# Reset the database (removes all data)
npm run db:reset
```

## Option 2: Local PostgreSQL Installation

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database and user
psql postgres
CREATE DATABASE skillsync_db;
CREATE USER username WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE skillsync_db TO username;
\q
```

### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE skillsync_db;
CREATE USER username WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE skillsync_db TO username;
\q
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install and follow the setup wizard
3. Use pgAdmin or psql to create the database and user as shown above

### After Local Installation
```bash
# Push the database schema
npm run db:push

# Seed the database
npm run db:seed
```

## Environment Configuration

Make sure your `.env` file has the correct database URL:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/skillsync_db?schema=public"
```

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running on port 5432
- Check if the database credentials match your `.env` file
- For Docker: `docker-compose ps` to verify containers are running

### Permission Issues
- Make sure the database user has proper permissions
- For local installations, you might need to configure `pg_hba.conf`

### Port Conflicts
- If port 5432 is already in use, modify the port in `docker-compose.yml`
- Update the `DATABASE_URL` in `.env` accordingly

## Database Management

### Viewing Data
```bash
# Open Prisma Studio (web interface)
npm run db:studio

# Connect with psql
psql "postgresql://username:password@localhost:5432/skillsync_db"
```

### Schema Changes
```bash
# After modifying schema.prisma
npm run db:push

# Or create a migration
npm run db:migrate
```

### Resetting Database
```bash
# Reset and reseed (removes all data)
npm run db:reset

# Or manually
npm run db:push --force-reset
npm run db:seed
```