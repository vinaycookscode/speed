# Speed - UI/UX & Brand Guidelines

This document outlines the strict aesthetic and design standards for the Speed application. All newly generated React components MUST adhere to these rules to maintain the premium, "wow" factor of the application.

## 1. Global Theme
- **Dark Mode Only:** The application operates strictly in dark mode. 
- **Base Backgrounds:** Main backgrounds should be `bg-black`. Panels/Cards should be `bg-zinc-900` or `bg-zinc-950`.

## 2. Glassmorphism & Depth
All major UI blocks, inputs, and cards must use premium glassmorphic effects:
- **Standard Card Recipe:** `bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl`
- **Subtle borders:** Use `ring-1 ring-white/5` and increase opacity on hover (`hover:ring-white/10`).

## 3. Colors & Gradients
- **Primary Gradients:** Use `bg-gradient-to-r from-blue-400 to-purple-500` for primary emphasis (buttons or hero text). 
- **Text Clipping:** Essential headings often use `bg-clip-text text-transparent` synced with the primary gradient.
- **Accents & Status:** 
  - Success/Active: `green-400` / `emerald-500` with `bg-green-500/10` backgrounds.
  - Architecture/Planning: `blue-400` or `purple-400`.
  - Do NOT use standard flat CSS colors. Always use Tailwind's vibrant palettes.

## 4. Typography
- **Primary Text:** `text-white`
- **Secondary Text (Descriptions, Labels):** `text-zinc-400` or `text-zinc-500`.
- **Sizing:** Use tracking constraints like `tracking-tight` on large headers and `uppercase tracking-wider text-[10px]` for small metadata labels.

## 5. Animation (Framer Motion)
No component should mount abruptly. Every view and significant element must animate.
- **Standard Entrance:**
  ```tsx
  <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
  >
  ```
- **Micro-interactions:** Always hook up `transition-all`, `group-hover` styles, and utilize `active:scale-95` on clickable elements.

## 6. Glow Effects
Use blurred absolute divs to create "ambient light" behind focus elements:
```tsx
<div className="absolute inset-0 bg-blue-500/20 blur-[40px] rounded-full animate-pulse" />
```
