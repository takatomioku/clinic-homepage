# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

This is a Japanese appointment booking system for a clinic with Google Calendar integration. The system allows pharmaceutical company representatives to book appointments online with the following features:

- 2 regular slots + 1 reserve slot per day
- Available on Monday, Tuesday, Thursday, Friday only
- Admin panel for managing reservations
- Automatic Google Calendar synchronization
- Local storage with Firebase Firestore cloud backup
- Reserve slot warnings for authorized use only

## Architecture

### Core Components

**AppointmentSystem Class** (`appointment.js` - legacy local-only version)
- Main application logic with localStorage persistence
- Google Calendar API integration using OAuth 2.0
- Admin features for viewing/canceling reservations
- Reserve slot functionality with approval modals

**Firebase Integration** (`appointment-firestore.js` - current cloud version)
- Hybrid storage: Firebase Firestore primary, localStorage fallback
- Data migration between local and cloud storage
- Cross-device synchronization capabilities

**UI Structure** (`index.html`)
- Booking form with validation (name, company, phone required)
- Calendar grid showing availability status
- Admin panel with reservation management
- Multiple modals for confirmations and warnings

### Key Business Logic

- **Slot Management**: 2 regular slots + 1 reserve slot per day
- **Day Filtering**: Only Mon/Tue/Thu/Fri available for appointments
- **Reserve Slot Protocol**: Requires warning acknowledgment with "許可なく入力しないでください" message
- **Calendar Integration**: Bidirectional sync with Google Calendar (create/delete events)

## Deployment Configuration

**Production URL**: `https://www.oku-clinic.com/appointment-system/`

**Google API Configuration** (in setup-guide.md):
- Calendar API enabled in Google Cloud Console
- OAuth 2.0 client ID configured for production domain
- API key with appropriate restrictions
- Current API credentials configured for `oku-clinic.com` domain

**Firebase Setup**:
- Project: `appointment-system-e689c`
- Firestore database for cloud storage
- Configuration embedded in index.html

## File Structure

- `index.html` - Main application with Firebase configuration
- `appointment-firestore.js` - Current cloud-enabled version
- `appointment.js` - Legacy local-only version (can be removed)
- `styles.css` - Complete styling including admin panels and modals
- `setup-guide.md` - Google Cloud Console configuration instructions

## Development Notes

- System designed for Japanese language interface
- Phone number validation with Japanese formats
- Color-coded calendar cells for different availability states
- Responsive design for mobile devices
- Admin mode requires manual activation (no authentication system)

## Authentication & API Keys

- Google OAuth 2.0 for Calendar API access
- API keys stored in JavaScript (consider environment variables for security)
- Token persistence to avoid repeated authentication prompts
- Current credentials configured in appointment.js:
  - API_KEY: For Calendar API access
  - CLIENT_ID: For OAuth authentication

## Common Issues

- **OAuth Access Denied**: Requires Google Cloud Console OAuth consent screen configuration
- **Calendar Not Syncing**: Check API key domain restrictions and OAuth settings
- **Cross-Device Data Loss**: Ensure Firebase Firestore rules allow read/write access