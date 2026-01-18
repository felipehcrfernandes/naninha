# Naninha

A baby sleep tracking application built with React Native and Expo.

## Overview

Naninha helps caregivers track their baby's naps with an intuitive and calming interface. The app provides a simple way to start and stop nap timers, add notes about each sleep session, and view sleep history. It supports multiple babies and multiple caregivers per baby.

## Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.31 | Development platform and tooling |
| Expo Router | 6.0.21 | File-based navigation |
| React Native Reanimated | 4.1.1 | Smooth animations |
| React Native Pager View | - | Swipeable baby views |
| TypeScript | 5.9.2 | Type-safe JavaScript |
| FontAwesome | via @expo/vector-icons | Icon library |
| Supabase | - | Authentication and database |
| AsyncStorage | - | Local session persistence |
| React Native Chart Kit | - | Charts and data visualization |

## Project Structure

```
naninha/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── _layout.tsx    # Auth navigator configuration
│   │   ├── login.tsx      # Login screen
│   │   └── register.tsx   # Registration screen
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── _layout.tsx    # Tab navigator configuration
│   │   ├── index.tsx      # Nap Tracker screen (main UI)
│   │   ├── history.tsx    # Nap history with records
│   │   ├── dashboard.tsx  # Dashboard with sleep analytics
│   │   ├── profile.tsx    # User profile screen
│   │   └── add-baby.tsx   # Add baby form
│   ├── _layout.tsx        # Root layout with providers
│   ├── +html.tsx          # Web HTML template
│   └── +not-found.tsx     # 404 screen
├── components/            # Reusable UI components
│   ├── NapTimer.tsx       # Circular timer display with animations
│   ├── NapButton.tsx      # Start/Stop nap button
│   ├── NapNotes.tsx       # Notes text input
│   ├── PageDots.tsx       # Pagination dots for baby swiper
│   ├── Themed.tsx         # Theme-aware base components
│   ├── useColorScheme.ts  # Color scheme hook
│   └── useClientOnlyValue.ts
├── contexts/
│   └── AuthContext.tsx    # Authentication state and functions
├── lib/
│   └── supabase.ts        # Supabase client configuration
├── constants/
│   └── Colors.ts          # App color palette
├── assets/
│   ├── fonts/             # Custom fonts
│   └── images/            # App icons and splash
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Features

### Implemented

#### Authentication
- Email/password login
- User registration with name, email, password
- Session persistence with AsyncStorage
- Sign out functionality
- Delete account option

#### Profile Management
- Display user name and email
- Edit user name
- Add new babies

#### Baby Management
- Add baby with name, birth date, and gender
- Support for multiple babies per caregiver
- Swipeable interface to switch between babies
- Visual pagination dots indicator

#### Nap Tracking
- Large circular timer display (HH:MM:SS format)
- Start/Stop nap button with animations
- Notes input (enabled only during active nap)
- Gentle pulse animation when nap is active
- Independent timer state per baby
- Automatic save to database on nap end

#### History
- View nap records grouped by date
- Filter by baby
- Display start time, end time, duration, and notes
- Visual empty state when no records exist

#### Dashboard
- Custom date range filter (start and end date)
- Line chart showing total sleep hours per day
- Average statistics: daily average, daytime average, nighttime average
- Baby selector for multi-baby households
- Daytime (6h-18h) and nighttime (18h-6h) sleep separation

#### Theming
- Light and dark mode support
- Calming color palette designed for baby apps

### Planned Features

- **Multi-Caregiver Sync**
  - Real-time sync between caregivers
  - Conflict prevention for simultaneous nap starts
  - Notifications for nap status changes

- **Additional Authentication**
  - Google sign-in
  - Apple/iCloud sign-in

- **Payments**
  - Payment gateway integration

- **App Store Launch**
  - iOS and Android store submissions

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Supabase account

### Environment Setup

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Babies table
CREATE TABLE babies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Baby caregivers junction table
CREATE TABLE baby_caregivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID REFERENCES babies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'caregiver' CHECK (role IN ('parent', 'guardian', 'caregiver', 'babysitter')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(baby_id, user_id)
);

-- Nap records table
CREATE TABLE nap_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_id UUID REFERENCES babies(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE baby_caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE nap_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see Supabase dashboard for complete setup)
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd naninha

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## Color Palette

The app uses a soft, calming color scheme designed for a baby-related application:

| Color | Hex | Usage |
|-------|-----|-------|
| Lavender | #B8A9C9 | Primary accent, inactive states |
| Coral | #F4A896 | Active nap button |
| Soft Blue | #7C9CBF | Sleeping state indicator |
| Mint | #A8D5BA | Success states |
| Cream | #FDF8F5 | Light mode background |
| Dark Navy | #1A1A2E | Dark mode background |

## Architecture Notes

### Data Model

```
profiles
├── id (UUID, references auth.users)
├── name
├── email
├── created_at
└── updated_at

babies
├── id (UUID)
├── name
├── birth_date
├── gender
├── created_by
├── created_at
└── updated_at

baby_caregivers (junction)
├── id (UUID)
├── baby_id
├── user_id
├── role (parent, guardian, caregiver, babysitter)
└── created_at

nap_records
├── id (UUID)
├── baby_id
├── started_by
├── start_time
├── end_time
├── notes
└── created_at
```

### Multi-Caregiver Support

The app is designed with multi-caregiver support in mind:

- Multiple caregivers can be linked to a single baby profile via the `baby_caregivers` table
- Each caregiver can manage multiple babies
- Nap records track who started the session
- Row Level Security ensures users only see babies they are caregivers for