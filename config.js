/**
 * INCREDIBLE PRODUCTIVITY SETUP
 * Configuration File
 * 
 * Edit this file to customize levels, badges, and flow templates.
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
 */

const CONFIG = {
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

    // --- FLOW TEMPLATES ---
    // These appear in the "Templates" tab
    TEMPLATES: [
        {
            title: "Void Meditation",
            description: "Clear your mind and enter stillness.",
            image: "",
            steps: [
                { title: "Void Meditation", type: "timer", duration: 5, instructions: "Clear your mind of all thoughts. Focus on the void." }
            ]
        },
        {
            title: "Cleansing",
            description: "Full chakra cleansing ritual with SURYA mantra.",
            image: "",
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
