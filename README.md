# Naninha

A baby sleep tracking application built with React Native and Expo.

## Overview

Naninha helps caregivers track their baby's naps with an intuitive and calming interface. The app provides a simple way to start and stop nap timers, add notes about each sleep session, and view sleep history.

## Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.31 | Development platform and tooling |
| Expo Router | 6.0.21 | File-based navigation |
| React Native Reanimated | 4.1.1 | Smooth animations |
| TypeScript | 5.9.2 | Type-safe JavaScript |
| FontAwesome | via @expo/vector-icons | Icon library |

## Project Structure

```
naninha/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── _layout.tsx    # Tab navigator configuration
│   │   ├── index.tsx      # Nap Tracker screen (main UI)
│   │   └── two.tsx        # History screen (placeholder)
│   ├── _layout.tsx        # Root layout with providers
│   ├── +html.tsx          # Web HTML template
│   └── +not-found.tsx     # 404 screen
├── components/            # Reusable UI components
│   ├── NapTimer.tsx       # Circular timer display with animations
│   ├── NapButton.tsx      # Start/Stop nap button
│   ├── NapNotes.tsx       # Notes text input
│   ├── Themed.tsx         # Theme-aware base components
│   ├── useColorScheme.ts  # Color scheme hook
│   └── useClientOnlyValue.ts
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

### Implemented (Phase 1: Main UI)

- **Nap Timer**: Large circular display showing elapsed time in HH:MM:SS format
- **Start/Stop Button**: Toggle button to control nap sessions
- **Notes Input**: Text field for adding observations about the nap (only enabled during active nap)
- **Animations**: Gentle pulse effect on timer when nap is active
- **Theming**: Light and dark mode support with a calming color palette
- **Auto-scroll**: Input field scrolls into view when focused

### Planned Features

- **Cadastro (Registration)**
  - Login screen
  - Guardian registration
  - Baby profile creation
  - Unique IDs for babies and caregivers

- **Backend**
  - Database structure definition
  - Data persistence
  - Multi-caregiver sync

- **Dashboard**
  - Total sleep chart for period
  - Daytime sleep analytics
  - Nighttime sleep analytics

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

### Multi-Caregiver Support (Future)

The app is designed with multi-caregiver support in mind:

- Multiple caregivers can be linked to a single baby profile
- Real-time sync to prevent conflicts (e.g., two people starting a nap simultaneously)
- Each nap record tracks who started and stopped the session
- Notifications for caregivers when nap status changes

### Data Model (Planned)

```
caregivers
├── id
├── name
├── email
└── created_at

babies
├── id
├── name
├── birth_date
└── created_at

baby_caregivers (junction)
├── baby_id
├── caregiver_id
└── role (parent, guardian, babysitter)

naps
├── id
├── baby_id
├── started_by (caregiver_id)
├── stopped_by (caregiver_id)
├── start_time
├── end_time
├── duration
├── notes
└── status (active, completed)
```


