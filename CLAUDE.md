# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static medical clinic website for おく内科消化器クリニック (Oku Internal Medicine and Gastroenterology Clinic) in Obihiro, Hokkaido. The site features a sophisticated navy blue glass-morphism design theme with 16 specialized pages covering comprehensive medical services, facilities, and patient information.

## Architecture

### Site Architecture Overview
The website uses a **hierarchical medical practice structure** with 16 HTML pages organized into distinct content categories:

**Primary Navigation Pages:**
- `index.html` - Homepage with hero section, services overview, and clinic introduction
- `clinic-introduction.html` - Detailed clinic information, doctor profile, facilities, and gallery
- `medical-services.html` - Medical services breakdown (Internal Medicine, Gastroenterology, Endoscopy)
- `faq.html` - Frequently asked questions page with patient inquiries

**Specialized Medical Condition Pages:**
- `gastric-endoscopy.html`, `colonoscopy.html` - Endoscopy procedures
- `liver.html` - Liver disease specialization
- `sleep-apnea-syndrome.html` - Sleep apnea treatment
- `metabolic-syndrome.html` - Metabolic syndrome care
- `norovirus.html` - Norovirus information
- `pyroli.html` - H. pylori treatment

**Preventive Services:**
- `vaccination.html`, `health-check.html` - Individual service pages
- `vaccination-health-check.html` - Combined legacy page
- `vaccine.html` - Detailed vaccine information page

**Core Assets:**
- `styles.css` - 61KB comprehensive design system with CSS custom properties
- `script.js` - 10KB interactive JavaScript with advanced animation system
- `images/` - 66 organized medical equipment, facility photos, and specialty icons

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
- Fixed header with backdrop blur across all pages
- Consistent dropdown menu structure with medical specialties
- Mobile-responsive hamburger menu with JavaScript animations
- Smooth scroll navigation with header offset compensation

**JavaScript Architecture:**
- **Intersection Observer API** for scroll-triggered animations with staggered timing
- **3D parallax effects** using transform3d and mouse tracking on card elements
- **RequestAnimationFrame throttling** for performance optimization
- **Event delegation patterns** for efficient DOM interaction
- **Progressive enhancement** with accessibility considerations (reduced motion support)

## Development Workflow

### Local Development Commands
This is a static site with no build process required:
```bash
# Open homepage for development
start index.html
# or
open index.html

# For live development, use any simple HTTP server
python -m http.server 8000
# or
npx serve .
```

### Common Development Tasks
**Testing Changes Across Site:**
- Always test modifications on all 16 pages, especially navigation and styling changes
- Pay special attention to mobile responsiveness across medical specialty pages
- Verify glass-morphism effects render properly on different devices
- Check navigation consistency - some pages have different navigation structures that need alignment

**Adding New Medical Content:**
1. Follow existing HTML structure patterns from similar pages
2. Use consistent CSS classes: `.card.glass`, `.container`, `.section`
3. Maintain professional medical terminology and accuracy
4. Include proper meta tags and structured data if needed
5. For symptom cards with background images, use the `.symptoms-card` pattern with appropriate background image elements

**Navigation Structure Maintenance:**
- Maintain consistent dropdown menu structure across all pages
- Ensure mobile navigation menus have identical items
- Use the standard dropdown pattern: "予防接種・健診" → "予防接種", "健康診断" submenus
- Always include `clinical-result.html` in the medical services dropdown

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
3. Test all 16 pages to ensure consistency across specialized medical pages
4. Maintain accessibility contrast ratios and professional medical appearance

**Background Image System for Medical Cards:**
- Use `.symptoms-background-image` and `.gastro-symptoms-background-image` for medical symptom cards
- Images should be grayscale with 15% opacity and gradient mask effects
- Mobile versions automatically hide background images via CSS media queries
- Image files: `internal-medicine-symptoms.jpg` and `gastroenterology-symptoms.jpg`

### Image Management
Medical equipment and facility images are stored in `images/` directory with **66 organized assets**:

**Naming Conventions:**
- **Medical Equipment:** Descriptive technical names (e.g., `fujifilm-endoscopy-processor-ep8000.jpg`, `hitachi-digital-xray-machine.jpg`)
- **Facility Photography:** Room-based naming (`endoscopy-room-new.jpg`, `consultation-room.jpg`, `waiting-room-1.jpg`)
- **Clinic Exterior:** Numbered sequence (`clinic-exterior-1.jpg` through `clinic-exterior-4.jpg`)
- **Specialty Icons:** Service-based naming (`internal-medicine-icon.png`, `gastroenterology-icon.png`)

**Technical Requirements:**
- **Responsive Logo System:** `logo-desktop.png` and `logo-mobile.png` for different screen sizes
- **Multiple Format Support:** PNG for icons/logos, JPG for photography, SVG for scalable graphics
- **Icon Sizing:** Medical specialty icons displayed as 100x100px circular images with `border-radius: 50%`
- **Optimization:** Recommended 300-400px width for equipment photos, comprehensive alt text for accessibility

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

### Medical Content Architecture
- **Three Primary Medical Specialties:** Internal Medicine, Gastroenterology, Endoscopy with dedicated pages
- **Specialized Disease Pages:** Individual pages for conditions like sleep apnea, metabolic syndrome, liver disease
- **Technical Equipment Documentation:** Detailed specifications with professional photography
- **Facility Showcase:** Multi-room photography with professional lighting
- **Doctor Credentials:** Comprehensive qualifications and professional background
- **Patient Resources:** FAQ system and preventive care information

### HTML Structure Patterns
- **Consistent Header Navigation:** Identical dropdown structure across all 16 pages (with noted inconsistencies to fix)
- **Uniform Meta Tag Implementation:** Page-specific descriptions with medical keywords
- **Semantic Section Organization:** Proper landmark roles and heading hierarchy
- **Professional Medical Content:** Accurate terminology and structured information presentation
- **Mobile Navigation:** All pages include `mobile-top-header` and `mobile-fullscreen-menu` components

### SEO and Accessibility
- Structured data (JSON-LD) for medical organization
- Comprehensive meta tags and Open Graph data
- Semantic HTML structure
- Accessible navigation with proper ARIA labels
- Responsive design for mobile medical information access

### Advanced Interactive Features
- **Smooth Scroll Navigation:** Header offset compensation for accurate section targeting
- **3D Parallax Effects:** Mouse-following card transforms with perspective calculations
- **Intersection Observer Animations:** Staggered timing for professional content reveal
- **Mobile-Optimized Interactions:** Touch-friendly dropdown menus with JavaScript animations
- **Performance Optimizations:** RequestAnimationFrame throttling and efficient event delegation
- **Accessibility Support:** Reduced motion detection and proper ARIA implementation

## Technical Constraints

- Pure HTML/CSS/JS - no build tools or frameworks
- IE11+ compatibility maintained
- Mobile-first responsive design
- Optimized for medical professional viewing (clean, sophisticated aesthetic)
- Fast loading times for patient information access

## Known Issues and Maintenance Notes

### Navigation Inconsistencies (High Priority)
- `vaccine.html` uses flat navigation structure instead of dropdown
- Mobile menu items vary between pages
- Some pages may have missing `script.js` includes (check `norovirus.html` and `pyroli.html`)

### File Management
- Multiple vaccination-related files exist (`vaccination.html`, `vaccine.html`, `vaccination-health-check.html`)
- Consider consolidating or clearly documenting the purpose of each

### CSS Architecture
- 20 media queries across the codebase with efficient responsive breakpoints
- Background image system for medical symptom cards with mobile-friendly fallbacks
- Schedule table containers with horizontal scrolling for mobile devices

### Mobile Optimizations
- All tables should use `.schedule-table-container` wrapper for horizontal scrolling
- Background images automatically hidden on mobile devices
- Touch-optimized navigation and interactions implemented