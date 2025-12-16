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
 * Breathing Patterns (Two formats supported):
 * 
 * FORMAT 1 - Simple (legacy, still works):
 *    - timing: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }
 *    - instructions: { inhale: "...", hold1: "...", exhale: "...", hold2: "..." }
 * 
 * FORMAT 2 - Flexible Phases (NEW - supports any sequence):
 *    - phases: Array of phase objects, executed in order:
 *      - type: "inhale" | "hold" | "exhale" (determines animation/color)
 *      - duration: number (seconds)
 *      - label: string (optional - custom text shown during phase, e.g., "Inhale Left")
 *      - instruction: string (optional - detailed instruction shown below)
 * 
 *    Example with multiple inhales/holds:
 *    phases: [
 *      { type: "inhale", duration: 4, label: "Inhale Left", instruction: "Close right nostril" },
 *      { type: "hold", duration: 4 },
 *      { type: "exhale", duration: 4, label: "Exhale Right" },
 *      { type: "inhale", duration: 4, label: "Inhale Right", instruction: "Close left nostril" },
 *      { type: "hold", duration: 4 },
 *      { type: "exhale", duration: 4, label: "Exhale Left" }
 *    ]
 * 
 * Common properties for both formats:
 *    - name: Display name for the pattern
 *    - value: Unique identifier
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
            description: "Foundation breath - fill lungs from bottom to top",
            phases: [
                { type: "inhale", duration: 8, label: "Inhale", instruction: "Fill lower belly, then mid-chest, then upper lungs" },
                { type: "hold", duration: 8, label: "Hold", instruction: "Hold comfortably - never strain" },
                { type: "exhale", duration: 8, label: "Exhale", instruction: "Contract lower abs, then mid-section, then upper lungs" }
            ]
        },
        {
            // EXAMPLE: Flexible phases format - full alternate nostril cycle in one pattern
            name: "Full Alternate Nostril Cycle",
            value: "full-alternate-nostril",
            description: "Complete Anuloma Viloma cycle - Balances Ida & Pingala nadis",
            phases: [
                { type: "inhale", duration: 4, label: "Inhale Left", instruction: "Thumb on RIGHT nostril (close right), inhale through LEFT for 4 count" },
                { type: "hold", duration: 6, label: "Hold", instruction: "Both nostrils closed - hold for 6 count" },
                { type: "exhale", duration: 4, label: "Exhale Right", instruction: "Thumb on LEFT nostril (close left), exhale through RIGHT for 4 count" },
                { type: "inhale", duration: 4, label: "Inhale Right", instruction: "Keep LEFT closed, inhale through RIGHT for 4 count" },
                { type: "hold", duration: 6, label: "Hold", instruction: "Both nostrils closed - hold for 6 count" },
                { type: "exhale", duration: 4, label: "Exhale Left", instruction: "Thumb on RIGHT nostril (close right), exhale through LEFT for 4 count" }
            ]
        },
        {
            name: "Breath of Fire (Kapalabhati)",
            value: "breath-of-fire",
            description: "Foundation of Kundalini Yoga - 20 rapid pumps, then hold",
            phases: [
                { type: "inhale", duration: 30, label: "20 Rapid Breaths", instruction: "Contract abdominal muscles FORCEFULLY - pump stomach in and out, hard and fast but CONTROLLED. Air enters top of lungs by itself. Do 20 rhythmic breaths within these 30 seconds using rapid abdominal contractions." },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "After 20th breath, exhale completely" },
                { type: "inhale", duration: 6, label: "Deep Inhale", instruction: "Fill your lungs completely - deep full breath" },
                { type: "hold", duration: 10, label: "Hold", instruction: "Contract your ANUS, lower chin to chest, hold breath as long as comfortable - DO NOT PUSH YOURSELF!" },
                { type: "exhale", duration: 6, label: "Slow Exhale", instruction: "Exhale slowly and completely. This completes 1 round." }
            ]
        },
        {
            name: "Yogic Humming Breath (Brahmari)",
            value: "brahmari",
            description: "Essential for mastering mantras - vibrate, don't speak",
            phases: [
                { type: "inhale", duration: 10, label: "Inhale", instruction: "Complete Yogic Breath - fill from bottom to top" },
                { type: "hold", duration: 10, label: "Hold", instruction: "Brief pause" },
                { type: "exhale", duration: 10, label: "Exhale", instruction: "Keep lips closed, HUM the breath out - HMMMMMM" }
            ]
        },
        {
            name: "Sithali (Curled Tongue Cooling)",
            value: "sithali",
            description: "Cooling breath - inhale through curled tongue",
            phases: [
                { type: "inhale", duration: 6, label: "Inhale", instruction: "Curl your tongue lengthwise. Inhale through your curled tongue, drawing cool air in." },
                { type: "hold", duration: 8, label: "Hold", instruction: "Close mouth, hold for 5-10 seconds (whatever is comfortable)" },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "Exhale slowly through your nose" }
            ]
        },
        {
            name: "Reverse Sithali (from Azazel)",
            value: "reverse-sithali",
            description: "Reversed cooling breath - exhale through curled tongue",
            phases: [
                { type: "inhale", duration: 6, label: "Inhale", instruction: "Inhale through your nose" },
                { type: "hold", duration: 8, label: "Hold", instruction: "With mouth closed, hold for 5-10 seconds (optional - whatever is comfortable)" },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "Curl your tongue. Exhale through your mouth with tongue curled." }
            ]
        },
        {
            name: "Serpent Hissing Breath (Sitkari)",
            value: "sitkari",
            description: "Tongue on roof of mouth, hissing inhale",
            phases: [
                { type: "inhale", duration: 8, label: "Hissing Inhale", instruction: "Press tongue lightly against roof of mouth, keep small space open. Inhale making a hissing sound. Fill lower lungs, then middle, then top - smooth and even like Complete Yogic Breath." },
                { type: "hold", duration: 8, label: "Hold", instruction: "Hold breath as long as comfortable" },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "Exhale slowly and evenly through your nose" }
            ]
        },
        {
            name: "Reversed Sitkari (from Azazel)",
            value: "reversed-sitkari",
            description: "Reversed serpent breath - hissing exhale, relaxed and not forced",
            phases: [
                { type: "inhale", duration: 6, label: "Inhale", instruction: "Slowly breathe in through your nose" },
                { type: "hold", duration: 6, label: "Hold", instruction: "Optional - hold for count of 6 or whatever is comfortable" },
                { type: "exhale", duration: 6, label: "Hissing Exhale", instruction: "Press tongue lightly against roof of mouth with small space open. Exhale making a hissing sound - RELAXED, not forced. Smooth exhale." }
            ]
        },
        {
            name: "Cat Breath (Ujjayi)",
            value: "ujjayi",
            description: "Glottis partially closed - faint hissing/snoring sound, even and controlled",
            phases: [
                { type: "inhale", duration: 5, label: "Inhale", instruction: "Partially close your glottis (as with snoring). Inhale through your nose making a faint hissing sound, like light snoring. Should be even and controlled." },
                { type: "hold", duration: 5, label: "Hold", instruction: "Hold your breath comfortably" },
                { type: "exhale", duration: 5, label: "Exhale", instruction: "Exhale through your nose, keeping glottis partially closed with faint hissing sound" }
            ]
        },
        {
            name: "Reversed Cat Breath (from Azazel)",
            value: "reversed-ujjayi",
            description: "Cat hiss on exhale - glottis partially closed. Useful for energy work.",
            phases: [
                { type: "inhale", duration: 5, label: "Inhale", instruction: "Breathe in through your nose normally" },
                { type: "hold", duration: 5, label: "Hold", instruction: "Optional hold - never force. Always be comfortable." },
                { type: "exhale", duration: 5, label: "Cat Hiss Exhale", instruction: "Exhale through the back of your throat, just like a cat's hiss, keeping glottis partially closed" }
            ]
        },
        {
            name: "Kumbhaka Lunar Breath - Set 1",
            value: "kumbhaka-1",
            description: "First set - do X rounds (3-6 for beginners), then MUST do same X rounds of Set 2",
            phases: [
                { type: "inhale", duration: 2, label: "Inhale", instruction: "Inhale through both nostrils for count of 2" },
                { type: "hold", duration: 4, label: "Hold", instruction: "Hold for count of 4" },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "Exhale for count of 6" },
                { type: "hold", duration: 4, label: "Hold at bottom", instruction: "Hold for count of 4 - this completes 1 round" }
            ]
        },
        {
            name: "Kumbhaka Lunar Breath - Set 2",
            value: "kumbhaka-2",
            description: "Second set - MUST match EXACT same number of rounds as Set 1. NO HOLD at bottom!",
            phases: [
                { type: "inhale", duration: 6, label: "Inhale", instruction: "Inhale for count of 6" },
                { type: "hold", duration: 6, label: "Hold", instruction: "Hold for count of 6" },
                { type: "exhale", duration: 4, label: "Exhale", instruction: "Exhale for count of 4 - Do NOT hold at bottom. This completes 1 round." }
            ]
        },
        {
            name: "666 Breath of Lucifer's Grail",
            value: "666-grail",
            description: "Advanced - connects male/female aspects of grail. Links pineal/6th chakra to 666 solar chakra for Magnum Opus",
            phases: [
                { type: "inhale", duration: 6, label: "Inhale", instruction: "Breathe in through your BASE chakra to your SOLAR [666] chakra. Visualize energy rising." },
                { type: "hold", duration: 16, label: "Hold & Focus", instruction: "Hold as long as comfortable and focus intensely on your 6th chakra/PINEAL GLAND. You should feel a bit of pressure on the 6th chakra. This connects the pineal (female) to solar 666 (male)." },
                { type: "exhale", duration: 6, label: "Exhale", instruction: "Exhale and relax. Repeat for as many rounds as comfortable. This builds the energy link needed for Magnum Opus." }
            ]
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
