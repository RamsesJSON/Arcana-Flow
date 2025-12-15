/**
 * INCREDIBLE PRODUCTIVITY SETUP
 * Configuration File
 * 
 * Edit this file to customize levels, badges, flow templates, and breathing patterns.
 * 
 * --- DOCUMENTATION ---
 * 
 * Flow Step Types:
 * 1. "timer"
 *    - Description: A countdown timer.
 *    - Properties: 
 *      - duration: number (minutes)
 *      - instructions: string (optional text to display)
 *      - image: string (optional URL or Base64)
 * 
 * 2. "reps"
 *    - Description: A manual counter for repetitions (tap to count).
 *    - Properties:
 *      - targetReps: number (goal count)
 *      - instructions: string (optional)
 *      - image: string (optional)
 * 
 * 3. "affirmation" (or any other custom type)
 *    - Description: Displays text/image. Can have a timer or be static.
 *    - Properties:
 *      - duration: number (minutes, optional. If 0, it waits for user to click Next)
 *      - instructions: string (text to read/affirm)
 *      - image: string (optional)
 * 
 * Breathing Patterns:
 *    - name: Display name for the pattern
 *    - value: Unique identifier
 *    - timing: Object with inhale, hold1, exhale, hold2 in seconds
 *    - description: Brief explanation of the pattern
 * 
 * Image Presets:
 *    - name: Display name for the image
 *    - file: Path to image file in assets/images/ folder OR data URI
 *    - category: Category for organization (meditation, energy, nature, etc.)
 */

const CONFIG = {
    // --- IMAGE PRESETS ---
    // Add your preset images here. Put actual image files in assets/images/ folder
    // See assets/images/README.md for setup instructions
    // Built-in SVGs at bottom always work - others need actual files
    IMAGE_PRESETS: [
        { name: "Image 1", file: "assets/images/img%20(1).jpg", category: "custom" },
        { name: "Image 2", file: "assets/images/img%20(2).jpg", category: "custom" },
        { name: "Image 3", file: "assets/images/img%20(3).jpg", category: "custom" },
        { name: "Image 4", file: "assets/images/img%20(4).jpg", category: "custom" },
        { name: "Image 5", file: "assets/images/img%20(5).jpg", category: "custom" },
        { name: "Image 6", file: "assets/images/img%20(6).jpg", category: "custom" },
        { name: "Image 7", file: "assets/images/img%20(7).jpg", category: "custom" },
        { name: "Image 8", file: "assets/images/img%20(8).jpg", category: "custom" },
        { name: "Image 9", file: "assets/images/img%20(9).jpg", category: "custom" },
        { name: "Image 10", file: "assets/images/img%20(10).jpg", category: "custom" },
        { name: "Image 11", file: "assets/images/img%20(11).jpg", category: "custom" },
        { name: "Image 12", file: "assets/images/img%20(12).jpg", category: "custom" },
        { name: "Image 13", file: "assets/images/img%20(13).jpg", category: "custom" },
        { name: "Image 14", file: "assets/images/img%20(14).jpg", category: "custom" },
        { name: "Image 15", file: "assets/images/img%20(15).jpg", category: "custom" },
        // Embedded SVG placeholders (these always work)
        { 
            name: "Void (Built-in)", 
            file: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Cdefs%3E%3CradialGradient id='void'%3E%3Cstop offset='0%25' style='stop-color:%23000'/%3E%3Cstop offset='100%25' style='stop-color:%23000080'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='300' height='200' fill='url(%23void)'/%3E%3Ccircle cx='150' cy='100' r='30' fill='none' stroke='%23d4af37' stroke-width='2'/%3E%3C/svg%3E", 
            category: "built-in" 
        },
        { 
            name: "Energy (Built-in)", 
            file: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Cdefs%3E%3CradialGradient id='energy'%3E%3Cstop offset='0%25' style='stop-color:%23ffd700'/%3E%3Cstop offset='100%25' style='stop-color:%23ff4500'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='300' height='200' fill='%23111'/%3E%3Ccircle cx='150' cy='100' r='50' fill='url(%23energy)' opacity='0.8'/%3E%3C/svg%3E", 
            category: "built-in" 
        },
        { 
            name: "Spirit (Built-in)", 
            file: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Cdefs%3E%3ClinearGradient id='spirit' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2300ffff'/%3E%3Cstop offset='100%25' style='stop-color:%239400d3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='200' fill='%23080808'/%3E%3Ccircle cx='150' cy='100' r='40' fill='none' stroke='url(%23spirit)' stroke-width='3'/%3E%3C/svg%3E", 
            category: "built-in" 
        }
    ],
    
    // --- LEVELING SYSTEM ---
    LEVEL_SYSTEM: {
        BASE_XP: 100,      // XP needed for level 2
        MULTIPLIER: 1.05,  // XP multiplier (lower for long-term leveling)
        RANK_INTERVAL: 50, // Levels required to gain a new rank title
        TITLES: [          // Custom titles for each rank (every 50 levels)
            "Newbie",           // Level 1-49
            "Initiate",           // Level 50-99
            "Adept",              // Level 100-149
            "Magus",              // Level 150-199
            "High Magus",         // Level 200-249
            "Grand Master",       // Level 250-299
            "Ascended",           // Level 300-349
            "Divine",             // Level 350-399
            "Eternal",            // Level 400-449
            "Omniscient"          // Level 450+
        ]
    },

    // --- BREATHING PATTERNS ---
    // Yogic breathing exercises - customize timing as needed
    // Add optional instructions for each phase (inhale, hold1, exhale, hold2)
    BREATHING_PATTERNS: [
        {
            name: "Complete Yogic Breath",
            value: "yogic-complete",
            timing: { inhale: 8, hold1: 8, exhale: 8, hold2: 0 },
            description: "Foundation breath - fill lungs from bottom to top",
            instructions: {
                inhale: "Fill lower belly, then mid-chest, then upper lungs",
                hold1: "Hold comfortably - never strain",
                exhale: "Contract lower abs, then mid-section, then upper lungs"
            }
        },
        {
            name: "Alternate Nostril (Anuloma Viloma)",
            value: "alternate-nostril",
            timing: { inhale: 4, hold1: 6, exhale: 4, hold2: 0 },
            description: "Balances Ida & Pingala, purifies nadis for Kundalini. Each round: Left in → Right out → Right in → Left out",
            instructions: {
                inhale: "Close RIGHT nostril with thumb, inhale LEFT. Next breath: close LEFT, inhale RIGHT",
                hold1: "Hold - focus on pineal gland or chosen chakra",
                exhale: "Switch: close LEFT nostril, exhale RIGHT. Next breath: close RIGHT, exhale LEFT"
            }
        },
        {
            name: "Breath of Fire (Kapalabhati)",
            value: "breath-of-fire",
            timing: { inhale: 1, hold1: 0, exhale: 1, hold2: 0 },
            description: "Foundation of Kundalini Yoga - do 20+ rapid pumps per round",
            instructions: {
                inhale: "Air enters PASSIVELY through top of lungs - don't force inhale",
                exhale: "FORCEFUL pump with lower abs - snap inward. Repeat rapidly 20+ times per round"
            }
        },
        {
            name: "Yogic Humming Breath (Brahmari)",
            value: "brahmari",
            timing: { inhale: 6, hold1: 2, exhale: 12, hold2: 0 },
            description: "Essential for mastering mantras - vibrate, don't speak",
            instructions: {
                inhale: "Complete Yogic Breath - fill from bottom to top",
                hold1: "Brief pause",
                exhale: "Keep lips closed, HUM the breath out - HMMMMMM"
            }
        },
        {
            name: "Serpent Hissing Breath (Sitkari)",
            value: "sitkari",
            timing: { inhale: 6, hold1: 6, exhale: 6, hold2: 0 },
            description: "Tongue on roof of mouth, hissing inhale",
            instructions: {
                inhale: "Tongue lightly on roof, hiss as you fill lungs in 3 parts",
                hold1: "Hold comfortably",
                exhale: "Slow, even exhale through nose"
            }
        },
        {
            name: "Reversed Sitkari (from Azazel)",
            value: "reversed-sitkari",
            timing: { inhale: 6, hold1: 6, exhale: 6, hold2: 0 },
            description: "Hissing exhale - relaxed, not forced",
            instructions: {
                inhale: "Slow breath in through nose",
                hold1: "Optional comfortable hold",
                exhale: "Tongue on roof, relaxed hissing exhale"
            }
        },
        {
            name: "Cat Breath (Ujjayi)",
            value: "ujjayi",
            timing: { inhale: 4, hold1: 4, exhale: 4, hold2: 0 },
            description: "Glottis partially closed - faint hissing/snoring sound",
            instructions: {
                inhale: "Partially close glottis, inhale through nose with soft hiss",
                hold1: "Hold breath",
                exhale: "Exhale through nose, keeping glottis partially closed"
            }
        },
        {
            name: "Reversed Cat Breath (from Azazel)",
            value: "reversed-ujjayi",
            timing: { inhale: 4, hold1: 4, exhale: 4, hold2: 0 },
            description: "Cat hiss on exhale - useful for energy work",
            instructions: {
                inhale: "Breathe in through nose normally",
                hold1: "Optional hold - never force",
                exhale: "Exhale through back of throat like a cat's hiss"
            }
        },
        {
            name: "Kumbhaka Lunar Breath - Set 1",
            value: "kumbhaka-1",
            timing: { inhale: 2, hold1: 4, exhale: 6, hold2: 4 },
            description: "First set - do X rounds, then MUST do X rounds of Set 2",
            instructions: {
                inhale: "Inhale through both nostrils (2 count)",
                hold1: "Hold at top (4 count)",
                exhale: "Extended exhale (6 count)",
                hold2: "Hold at bottom (4 count) - this completes 1 round"
            }
        },
        {
            name: "Kumbhaka Lunar Breath - Set 2",
            value: "kumbhaka-2",
            timing: { inhale: 6, hold1: 6, exhale: 4, hold2: 0 },
            description: "Second set - MUST match same number of rounds as Set 1",
            instructions: {
                inhale: "Extended inhale (6 count)",
                hold1: "Extended hold (6 count)",
                exhale: "Shorter exhale (4 count) - no hold. This completes 1 round"
            }
        },
        {
            name: "666 Breath of Lucifer's Grail",
            value: "666-grail",
            timing: { inhale: 6, hold1: 12, exhale: 6, hold2: 0 },
            description: "Advanced - connects base to solar (666) to 6th chakra for Magnum Opus",
            instructions: {
                inhale: "Visualize energy rising from BASE chakra up to SOLAR (666) chakra",
                hold1: "Hold as long as comfortable - focus intensely on PINEAL/6th chakra. Feel the pressure build",
                exhale: "Release and relax. This completes 1 round"
            }
        }
    ],

    // --- FLOW TEMPLATES ---
    // These appear in the "Templates" tab
    // You can add image URLs or use data URIs for embedded images
    TEMPLATES: [
        {
            title: "Void Meditation",
            description: "Clear your mind and enter stillness.",
            image: "assets/images/img%20(13).jpg",
            steps: [
                { title: "Void Meditation", type: "timer", duration: 5, instructions: "Clear your mind of all thoughts. Focus on the void." }
            ]
        },
        {
            title: "Cleansing",
            description: "Full chakra cleansing ritual with SURYA mantra.",
            image: "assets/images/img%20(4).jpg",
            steps: [
                { title: "Cleanse the Soul", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the soul" },
                { title: "Cleanse Base Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the base chakra" },
                { title: "Cleanse Sacral Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the sacral chakra" },
                { title: "Cleanse Solar Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the solar plexus chakra" },
                { title: "Cleanse Heart Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the heart chakra" },
                { title: "Cleanse Throat Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the throat chakra" },
                { title: "Cleanse Sixth Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the sixth chakra" },
                { title: "Cleanse Crown Chakra", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the crown chakra" },
                { title: "Cleanse the Soul", type: "reps", targetReps: 7, instructions: "Vibrate SURYA - Cleanse the soul" },
                { title: "Affirmation", type: "reps", targetReps: 3, instructions: "This energy and light cleanses and removes all malefic and harmful energies, negative thought forms, curses, from my aura, mind and soul, in beneficial and healthy ways and manifestations, both spiritually and materially." },
                { title: "Focus on Cleansing", type: "timer", duration: 3, instructions: "Focus on the cleansing intention and feeling. Visualize all negativity being removed." }
            ]
        }
    ]
};
