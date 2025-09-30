# Miniway Admin Dashboard

A comprehensive web-based admin dashboard for the Miniway transportation app, built with Next.js, TypeScript, and Ant Design.

## Features

- **Real-time Dashboard**: Live monitoring of buses, trips, and passengers
- **Fleet Management**: Manage buses, assign drivers, and monitor capacity
- **Trip Monitoring**: Track active trips and view trip history
- **Route Management**: Create and manage transportation routes
- **User Management**: Manage drivers, conductors, commuters, and admins
- **Analytics & Reports**: Comprehensive insights and performance metrics
- **Session Persistence**: Automatic session management and recovery

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **UI Framework**: Ant Design
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Language**: TypeScript

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in the admin-dashboard directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nbbtnqdvizaxajvaijbv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps API Key (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm start
```

## Database Schema

The dashboard connects to the same Supabase database as the mobile app with the following key tables:

- `users` - User accounts with roles (admin, driver, conductor, commuter)
- `buses` - Bus fleet information
- `routes` - Transportation routes
- `trips` - Trip records and status
- `trip_passengers` - Passenger boarding information
- `pickup_requests` - On-demand pickup requests
- `travel_history_commuter` - Commuter travel history

## Authentication

- Only users with `role = 'admin'` can access the dashboard
- Session persistence is handled automatically
- Automatic session refresh and recovery
- Secure logout functionality

## Real-time Features

The dashboard includes real-time updates for:

- Trip status changes
- Bus location updates
- Pickup request status changes
- User management updates
- Live metrics and statistics

## Pages Overview

### Dashboard (`/`)

- Real-time metrics overview
- Quick action buttons
- System status monitoring

### Fleet Management (`/fleet`)

- View all buses and their status
- Assign drivers to buses
- Monitor capacity and utilization

### Trip Management (`/trips`)

- Monitor active trips
- View trip history
- Update trip status
- Cancel trips with reasons

### Route Management (`/routes`)

- Create new transportation routes
- Edit existing routes
- View all routes with start and end addresses
- Delete routes when no longer needed

### User Management (`/users`)

- View all users by role
- Search and filter users
- Monitor license expiration
- View user details

### Analytics (`/analytics`)

- Trip performance metrics
- Route utilization statistics
- Completion and cancellation rates
- Historical data analysis

## Session Persistence Fixes

The dashboard includes several improvements for session persistence:

1. **Custom Storage Adapter**: Web-compatible localStorage implementation
2. **Session Recovery**: Automatic session refresh on page reload
3. **Error Handling**: Robust error handling for auth failures
4. **Loading States**: Proper loading states during authentication
5. **Mount Safety**: Prevents state updates on unmounted components

## Troubleshooting

### Session Not Persisting

1. Check that environment variables are properly set
2. Ensure Supabase project is accessible
3. Verify user has admin role in database
4. Check browser console for authentication errors

### Real-time Updates Not Working

1. Verify Supabase Realtime is enabled
2. Check network connectivity
3. Ensure proper subscription setup in components

### Build Errors

1. Run `npm install` to ensure all dependencies are installed
2. Check TypeScript errors with `npm run build`
3. Verify all environment variables are set

## Development

### Project Structure

```
admin-dashboard/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── providers/         # React context providers
│   ├── fleet/            # Fleet management
│   ├── trips/            # Trip management
│   ├── pickup-requests/  # Pickup request management
│   ├── users/            # User management
│   ├── analytics/        # Analytics and reports
│   └── layout.tsx        # Root layout
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client
│   ├── queries.ts        # Database queries
│   └── realtime.ts       # Real-time subscriptions
└── middleware.ts         # Next.js middleware
```

### Adding New Features

1. Create new page in `app/` directory
2. Add database queries in `lib/queries.ts`
3. Update real-time subscriptions in `lib/realtime.ts`
4. Add navigation links in existing pages

## Security

- Admin-only access enforced at component level
- Secure session management
- Environment variable protection
- CSRF protection via Supabase
- Input validation and sanitization

## Performance

- Optimized database queries
- Efficient real-time subscriptions
- Lazy loading of components
- Responsive design for all screen sizes
- Caching of frequently accessed data
