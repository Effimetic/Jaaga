# UI Guidelines & Design System

Use this file to provide the AI with rules and guidelines you want it to follow when working on the React Native app. This template outlines the design principles, component usage, and development practices to maintain consistency.

## General Guidelines

* Only use absolute positioning when necessary. Opt for responsive and well-structured layouts that use flexbox by default
* Refactor code as you go to keep code clean and maintainable
* Keep file sizes small and put helper functions and components in their own files
* Use TypeScript interfaces for all component props and data structures
* Follow React Native best practices for performance and accessibility
* Use consistent naming conventions: camelCase for variables/functions, PascalCase for components

## Design System Guidelines

### Color Palette
* **Primary**: #007AFF (iOS Blue) - Used for main actions, links, and highlights
* **Secondary**: #6B7280 (Gray) - Used for secondary text and borders
* **Success**: #10B981 (Green) - Used for success states and confirmations
* **Warning**: #F59E0B (Amber) - Used for warnings and alerts
* **Error**: #EF4444 (Red) - Used for errors and destructive actions
* **Background**: #FFFFFF (White) - Primary background color
* **Surface**: #F9FAFB (Light Gray) - Secondary background for cards and sections

### Typography
* **Base Font Size**: 14px (default React Native)
* **Heading Sizes**: 
  - H1: 24px, Bold
  - H2: 20px, Bold  
  - H3: 18px, Semi-bold
  - H4: 16px, Semi-bold
* **Body Text**: 14px, Regular
* **Caption**: 12px, Regular
* **Font Family**: System default (San Francisco on iOS, Roboto on Android)

### Spacing System
* **Base Unit**: 8px
* **Spacing Scale**: 8px, 16px, 24px, 32px, 40px, 48px
* **Container Padding**: 16px (standard screen padding)
* **Component Spacing**: 8px between related elements, 16px between sections

### Layout Principles
* Use SafeAreaView for all main screens to respect device notches and system bars
* Implement consistent card-based layouts with 8px border radius
* Use ScrollView for content that may exceed screen height
* Implement proper loading states and error handling for all async operations
* Use consistent margins and padding throughout the app

## Component Guidelines

### Button Component
The Button component is a fundamental interactive element designed to trigger actions or navigate users through the application.

#### Usage
* Use for important actions that users need to take
* Communicate interactivity with clear, action-oriented labels
* Provide visual feedback and clear affordances

#### Variants
* **Primary Button**
  * Purpose: Main action in a section or page
  * Visual Style: Bold, filled with primary color (#007AFF)
  * Usage: One primary button per section to guide users toward the most important action
* **Secondary Button**
  * Purpose: Alternative or supporting actions
  * Visual Style: Outlined with primary color, transparent background
  * Usage: Can appear alongside a primary button for less important actions
* **Tertiary Button**
  * Purpose: Least important actions
  * Visual Style: Text-only with no border, using primary color
  * Usage: For actions that should be available but not emphasized

### Form Components
* **Input Fields**: Use consistent styling with clear labels and validation states
* **Date Pickers**: Always use the format "Jun 10" for display
* **Dropdowns**: Don't use if there are 2 or fewer options - use radio buttons instead
* **Validation**: Show inline validation messages below form fields

### Navigation Guidelines
* **Bottom Toolbar**: Maximum of 4 items only
* **Floating Action Button**: Never use with bottom toolbar
* **Back Navigation**: Always provide clear back buttons for nested screens
* **Tab Navigation**: Use consistent tab styling with icons and labels

### Card Components
* **Border Radius**: 8px for all cards
* **Shadow**: Subtle elevation with consistent shadow values
* **Padding**: 16px internal padding for card content
* **Spacing**: 16px between cards in lists

### List Components
* **Item Height**: Minimum 56px for touch targets
* **Dividers**: Use subtle borders between list items
* **Loading States**: Implement skeleton loading for better UX
* **Empty States**: Provide helpful messages when lists are empty

## Screen Layout Guidelines

### Header Design
* **Height**: 56px minimum for touch targets
* **Back Button**: Left-aligned with consistent styling
* **Title**: Center-aligned, using H2 typography
* **Actions**: Right-aligned, using appropriate button variants

### Content Areas
* **Primary Content**: Use full width with 16px padding
* **Secondary Content**: Can use cards or sections with 8px spacing
* **Action Areas**: Place primary actions at the bottom of screens
* **Loading States**: Show loading indicators for all async operations

### Error Handling
* **Error Messages**: Use consistent error styling and messaging
* **Retry Options**: Provide clear retry mechanisms for failed operations
* **Fallback UI**: Implement graceful degradation for error states

## Accessibility Guidelines

* **Touch Targets**: Minimum 44px for all interactive elements
* **Color Contrast**: Ensure sufficient contrast ratios for text readability
* **Screen Reader**: Implement proper accessibility labels and hints
* **Focus States**: Provide clear visual feedback for focused elements

## Performance Guidelines

* **Image Optimization**: Use appropriate image sizes and formats
* **Lazy Loading**: Implement lazy loading for lists and images
* **Memory Management**: Properly clean up event listeners and subscriptions
* **Bundle Size**: Keep dependencies minimal and tree-shakeable

## Code Organization

* **Component Structure**: One component per file with clear naming
* **Helper Functions**: Extract reusable logic into separate utility files
* **Constants**: Define design tokens and constants in dedicated files
* **Types**: Use TypeScript interfaces for all data structures
* **Testing**: Write tests for critical user flows and components

## Responsive Design

* **Screen Sizes**: Design for both iOS and Android screen variations
* **Orientation**: Support both portrait and landscape orientations
* **Device Features**: Adapt to different device capabilities and screen densities
* **Platform Differences**: Respect platform-specific design patterns while maintaining consistency

---

*This document should be updated as the design system evolves and new patterns emerge.*
