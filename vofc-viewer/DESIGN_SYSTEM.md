# VOFC Design System

## Overview

The VOFC Engine uses a standardized design system to ensure consistency across all tabs and components. This system provides a cohesive, professional appearance that follows government design standards.

## Color Palette

### Primary Colors
- **Primary Blue**: `#004B87` - Main brand color for buttons and accents
- **Primary Light**: `#205493` - Hover states and secondary actions
- **Primary Dark**: `#112e51` - Text and borders
- **Accent Gold**: `#C9B037` - Highlights and special elements

### Neutral Colors
- **Background**: `#F5F7FA` - Page background
- **Surface**: `#FFFFFF` - Card and component backgrounds
- **Border**: `#E5E8EB` - Borders and dividers
- **Text**: `#1E1E1E` - Primary text
- **Text Secondary**: `#4B5563` - Secondary text and labels

### Status Colors
- **Success**: `#118A3C` - Approved, completed states
- **Warning**: `#B45309` - Pending, attention needed
- **Error**: `#DC2626` - Rejected, error states

## Typography

### Font Family
- **Primary**: `'Inter', 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Font Sizes
- **XS**: `13px` - Small labels and captions
- **SM**: `15px` - Body text and form inputs
- **Base**: `16px` - Default text size
- **LG**: `20px` - Card titles and headings
- **XL**: `24px` - Page titles
- **2XL**: `28px` - Large headings

## Spacing System

### Spacing Scale
- **XS**: `4px` - Tight spacing
- **SM**: `8px` - Small gaps
- **MD**: `16px` - Standard spacing
- **LG**: `24px` - Large spacing
- **XL**: `32px` - Extra large spacing

## Border Radius

### Radius Scale
- **SM**: `6px` - Small elements (buttons, inputs)
- **MD**: `10px` - Cards and containers
- **LG**: `16px` - Large cards
- **XL**: `24px` - Special containers

## Component System

### Layout Components

#### Page Container
```css
.page-container {
  min-height: 100vh;
  background-color: var(--color-background);
  padding: var(--spacing-lg);
}
```

#### Content Wrapper
```css
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}
```

### Card System

#### Basic Card
```css
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}
```

#### Card Header
```css
.card-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
```

#### Card Title
```css
.card-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}
```

#### Card Subtitle
```css
.card-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0 0;
}
```

### Button System

#### Base Button
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: var(--spacing-xs);
}
```

#### Button Variants
- **Primary**: `btn btn-primary` - Main actions
- **Secondary**: `btn btn-secondary` - Secondary actions
- **Success**: `btn btn-success` - Approve actions
- **Warning**: `btn btn-warning` - Caution actions
- **Error**: `btn btn-error` - Reject actions

#### Button Sizes
- **Small**: `btn btn-sm` - Compact buttons
- **Large**: `btn btn-lg` - Prominent buttons

### Form System

#### Form Group
```css
.form-group {
  margin-bottom: var(--spacing-md);
}
```

#### Form Label
```css
.form-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}
```

#### Form Input
```css
.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
```

#### Form Input Focus
```css
.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 75, 135, 0.1);
}
```

### Status Indicators

#### Status Badge
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

#### Status Variants
- **Pending**: `status-badge status-pending` - Yellow background
- **Approved**: `status-badge status-approved` - Green background
- **Rejected**: `status-badge status-rejected` - Red background
- **Processing**: `status-badge status-processing` - Blue background

### Grid System

#### Grid Container
```css
.grid {
  display: grid;
  gap: var(--spacing-md);
}
```

#### Grid Columns
- **1 Column**: `grid-cols-1`
- **2 Columns**: `grid-cols-2`
- **3 Columns**: `grid-cols-3`
- **4 Columns**: `grid-cols-4`

#### Responsive Grid
```css
@media (max-width: 768px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
```

### Utility Classes

#### Text Alignment
- `text-center` - Center aligned text
- `text-left` - Left aligned text
- `text-right` - Right aligned text

#### Font Weight
- `font-bold` - Bold text (700)
- `font-semibold` - Semi-bold text (600)
- `font-medium` - Medium text (500)

#### Text Colors
- `text-primary` - Primary color text
- `text-secondary` - Secondary color text
- `text-success` - Success color text
- `text-warning` - Warning color text
- `text-error` - Error color text

#### Spacing
- `mb-0`, `mb-1`, `mb-2`, `mb-3`, `mb-4` - Margin bottom
- `mt-0`, `mt-1`, `mt-2`, `mt-3`, `mt-4` - Margin top
- `p-0`, `p-1`, `p-2`, `p-3`, `p-4` - Padding

### Loading States

#### Loading Spinner
```css
.loading {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  border-top-color: var(--color-primary);
  animation: spin 1s ease-in-out infinite;
}
```

### Error States

#### Error Message
```css
.error-message {
  background-color: #FEE2E2;
  border: 1px solid #FECACA;
  color: var(--color-error);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}
```

#### Success Message
```css
.success-message {
  background-color: #D1FAE5;
  border: 1px solid #A7F3D0;
  color: var(--color-success);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-md);
}
```

## Usage Guidelines

### Page Structure
1. Use `page-container` for the main page wrapper
2. Use `content-wrapper` for content areas
3. Use `card` for content sections
4. Use `card-header` for section headers

### Button Usage
- **Primary**: Main actions (Submit, Approve, Save)
- **Secondary**: Secondary actions (Cancel, Back, Edit)
- **Success**: Positive actions (Approve, Complete)
- **Error**: Destructive actions (Reject, Delete)

### Form Usage
- Always use `form-group` for form field containers
- Use `form-label` for field labels
- Use appropriate input classes (`form-input`, `form-select`, `form-textarea`)

### Status Usage
- Use `status-badge` for status indicators
- Use appropriate status variants for different states
- Use color-coded text classes for inline status

## Responsive Design

The design system includes responsive breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Grid layouts automatically adjust to single columns on mobile devices.

## Accessibility

The design system follows accessibility best practices:
- Sufficient color contrast ratios
- Focus indicators for keyboard navigation
- Semantic HTML structure
- Screen reader friendly labels

## Implementation

All styles are defined in `app/globals.css` using CSS custom properties (variables) for easy theming and maintenance. The system is built on top of Tailwind CSS for utility classes while providing a comprehensive component system.
