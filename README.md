# Chair The FED: Economic Command Center

A modernized, highly interactive web simulation that puts you in the seat of the Chairman of the Federal Reserve. Balance the dual mandate of price stability and maximum employment while navigating a volatile, ever-changing global economy

## Why I Built This

For years, the Federal Reserve Bank of San Francisco hosted a popular educational game called *Chair the Fed*. It was a great tool for learning basic economics, but on June 1, 2021, the government took it offline. Their reasoning? The Fed's approach to monetary policy had evolved, and the old game's mechanics—which relied almost entirely on a single tool (the Federal Funds Rate)—no longer accurately represented reality

I built this project to bring the game back to life, fully modernized. Instead of just one lever to pull, players now have access to a **Tri-Tool Monetary Policy** system, reflecting how the modern Fed actually operates

## Key Features & Mechanics

This simulation isn't just a clicker game; it runs on a custom-built economic algorithm (`gameLogic.ts`) inspired by real-world macroeconomic principles like the Taylor Rule and Phillips Curve dynamics

* **The Dual Mandate Simulation:** Your sole objective is to keep Inflation as close to **2.0%** and Unemployment as close to **4.0%** as possible
* **Tri-Tool Monetary Policy:**
    * **Federal Funds Rate (FFR):** Adjust the benchmark overnight lending rate to cool down an overheating market or stimulate a stagnant one
    * **Interest on Reserves (IOR):** Tweak the rate paid to commercial banks to incentivize them to either hold funds or lend them out
    * **Open Market Operations (OMO):** Manage the Fed's balance sheet through Quantitative Easing (injecting cash) or Quantitative Tightening (removing cash)
* **Dynamic Economic Shocks:** The economy is unpredictable. Every Q1, the system may throw one of 8 multi-quarter events at you (e.g., *Global Pandemics, Oil Supply Shocks, Tech Breakthroughs*). These events have cascading, decaying impacts over time, forcing you to adapt your strategy
* **16-Quarter Term Re-elections:** You serve a 4-year term. At the end of 16 quarters, your "Stability Score" is calculated. Keep the economy steady, and the Senate re-appoints you. Let inflation skyrocket or unemployment spike, and you are fired
* **Smart FOMC Advisor & Autopilot:** An integrated advisor analyzes the macroeconomic climate (Stagflation, Overheating, Recession, Goldilocks) and suggests policy directions. An Autopilot feature can even calculate and execute the mathematical "Ideal Policy"
* **Procedural Audio Engine:** A custom-built Web Audio API synthesizer (`audioEngine.ts`) generates a dynamic, suspenseful "waiting-room" soundscape—complete with kicks, hi-hats, and synth bass—perfectly timed to the simulation's tempo

## What the User Sees (The UI Interface)

The dashboard is designed to look like a sleek, modern economic command center, utilizing smooth animations and real-time data visualization

* **Top Dashboard (Metrics & News):**
    * Live, color-coded tickers for Unemployment and Inflation that shift from green to red based on your proximity to target goals
    * A dedicated **"News Broadcast" TV** that flashes alerts when economic shocks hit, tracking the exact quarter of the event's lifecycle and its decaying mathematical impact
    * An expanding **Advisor Card** that provides contextual rationale and risk warnings based on your current economic state
* **Left Control Panel (The Instruments):**
    * Three distinct sliders and fine-tuning buttons for your FFR, IOR, and OMO tools
    * Visual indicators warning you if your current stance is Expansionary, Contractionary, or Neutral
* **Right Display (Economic History Chart):**
    * An interactive, highly customized `Recharts` graph plotting the trajectory of Unemployment and Inflation over a 15-month rolling window
    * The chart includes labeled vertical gridlines for fiscal quarters and smart "Period Bubbles" that actively label the overarching economic era (e.g., "OVERHEATING" or "STAGFLATION")
* **Immersive Overlays:** A step-by-step interactive tour for first-time players, and dramatic modal pop-ups when processing quarters or facing Senate re-election

## Skills & Tech Stack Used

This project was built from the ground up using modern web development tools and practices

* **Frontend Framework:** React 19 + Vite + TypeScript for strict type safety and fast rendering
* **Styling & UI:** Tailwind CSS (v4) utilizing custom utility classes and conditional formatting via `clsx` and `tailwind-merge`
* **Animations:** `Motion` (Framer Motion) for fluid layout transitions, modal entrances, and staggered list animations
* **Data Visualization:** `Recharts`, heavily customized with custom SVG ticks, dynamic reference lines, and responsive containers
* **Audio Engineering:** Native Web Audio API programming. No external MP3s are used; the music is generated procedurally using math, custom oscillators, delays, and biquad filters
* **Game Design & Economics:** Translating complex macroeconomic theory into balanced, engaging JavaScript state logic
