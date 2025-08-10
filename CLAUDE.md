# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static medical clinic website for おく内科消化器クリニック (Oku Internal Medicine and Gastroenterology Clinic) in Obihiro, Hokkaido. The site features a sophisticated navy blue glass-morphism design theme with three main pages showcasing the clinic's services, facilities, and information.

## Architecture

### Core Files Structure
- `index.html` - Main homepage with hero section, service overview, clinic features, and doctor introduction
- `clinic-introduction.html` - Detailed clinic information including doctor profile, hours, facilities, and gallery
- `medical-services.html` - Comprehensive medical services breakdown (Internal Medicine, Gastroenterology, Endoscopy)
- `styles.css` - Unified CSS with glass-morphism design system using CSS custom properties
- `script.js` - Interactive JavaScript for navigation, animations, and UX enhancements
- `images/` - Medical equipment photos, clinic exterior/interior images, and icons

### Design System

The site uses a sophisticated design system built on CSS custom properties:

**Color Palette (Sophisticated Navy Theme):**
- Primary navy colors: `--primary-navy` (#0a0e1a), `--primary-deep` (#161b2e), `--primary-mid` (#242b42)
- Accent colors: `--accent-platinum` (#e2e8f0), `--accent-silver` (#cbd5e0), `--accent-blue` (#4299e1)
- Text hierarchy: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-subtle`

**Glass Morphism Effects:**
- Backdrop filters with blur(24px) and transparency
- Multi-layered shadows: `--shadow-glass`, `--shadow-hover`, `--shadow-deep`
- Glass borders and highlights for depth
- Smooth transitions using cubic-bezier easing

**Spacing System:**
- Consistent spacing scale: `--space-xs` (0.5rem) through `--space-3xl` (6rem)
- Grid layouts with responsive breakpoints
- Generous whitespace for sophisticated appearance

### Component Patterns

**Cards with Glass Effect:**
All content cards use the `.card.glass` pattern with:
- `backdrop-filter: blur(24px) saturate(1.1)`
- Subtle borders and multi-layered shadows
- Hover effects with transform and enhanced shadows
- Consistent border radius using `--radius-xl` (28px)

**Navigation Structure:**
- Fixed header with backdrop blur
- Dropdown menus with glass effects
- Mobile-responsive hamburger menu
- Smooth scroll navigation between sections

## Development Workflow

### Local Development
This is a static site - simply open `index.html` in a browser for local development. No build process required.

### Content Updates
When updating medical information or clinic details:
1. Update HTML content in the respective page files
2. Maintain consistent styling using existing CSS custom properties
3. Keep medical accuracy and professional tone
4. Update structured data (JSON-LD) in `index.html` if clinic information changes

### Design Modifications
The design system is centralized in `:root` CSS custom properties. To modify colors, spacing, or effects:
1. Update CSS custom properties at the top of `styles.css`
2. Changes will cascade throughout all components
3. Test all three pages to ensure consistency
4. Maintain accessibility contrast ratios

### Image Management
Medical equipment and facility images are stored in `images/` directory:
- Use descriptive file names for medical equipment
- Optimize images for web (recommended: 300-400px width for equipment photos)
- Include comprehensive alt text for accessibility
- Follow existing naming conventions (e.g., `fujifilm-endoscopy-processor-ep8000.jpg`)

## Deployment

### GitHub Pages
The site is deployed via GitHub Pages:
- Repository: `takatomioku/clinic-homepage`
- Live URL: https://takatomioku.github.io/clinic-homepage/
- Auto-deploys from `main` branch
- Uses root directory as source

### Git Workflow
Standard git workflow for updates:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```
Changes typically appear on GitHub Pages within 1-3 minutes.

## Key Features

### Medical Content Structure
- Three primary medical specialties: Internal Medicine, Gastroenterology, Endoscopy
- Detailed equipment descriptions with technical specifications
- Clinic facility showcase with professional photography
- Doctor credentials and qualifications prominently displayed

### SEO and Accessibility
- Structured data (JSON-LD) for medical organization
- Comprehensive meta tags and Open Graph data
- Semantic HTML structure
- Accessible navigation with proper ARIA labels
- Responsive design for mobile medical information access

### Interactive Elements
- Smooth scroll navigation between sections
- Parallax and mouse-tracking effects on cards
- Intersection Observer animations
- Mobile-optimized dropdown menus
- Scroll-to-top functionality

## Technical Constraints

- Pure HTML/CSS/JS - no build tools or frameworks
- IE11+ compatibility maintained
- Mobile-first responsive design
- Optimized for medical professional viewing (clean, sophisticated aesthetic)
- Fast loading times for patient information access