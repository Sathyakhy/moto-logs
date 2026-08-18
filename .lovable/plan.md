# Plan: Visual Enhancements for Bike Display

Enhance the bike visual presentation by increasing its size on mobile and adding a premium background gradient.

## Proposed Changes

### Styles
- Add a new utility `.bike-bg-premium` in `src/styles.css` that provides a radial gradient (e.g., a subtle primary/amber glow) to make the bike pop, especially if it's black.

### Components
- **View360**: 
    - Wrap the images in a container that applies the new premium background.
    - Ensure the images fill the container effectively while maintaining `object-contain`.

### Routes
- **Overview**: 
    - Increase the size of the bike container on mobile.
    - Change `max-w-md` to `max-w-xl` (or similar) on smaller screens to make the bike look larger.
    - Ensure the aspect ratio and layout remain balanced.
- **Garage (Bikes Index)**:
    - Apply the premium background to the bike image containers in the garage list for a consistent look.

## Technical Details
- Use Tailwind utility classes for responsiveness (e.g., `max-w-full sm:max-w-md`).
- Implement the background using `radial-gradient` in OKLCH tokens to respect theme switching.
- Use `filter drop-shadow` to give the bike depth against the new background.
