# ytbuffer

YouTube Focus Buffer — Project Blueprint & Overview
🎯 Core Purpose
This extension serves as an architectural friction gate designed to counter the psychological triggers of mindless web surfing, infinite video discovery, and instant gratification loops on YouTube. Rather than completely blocking access, it uses time-delayed friction to force your analytical brain to override impulsive clicks.

🛠️ System Architectures & Mechanics
1. The Active-Viewing 10-Minute Video Delay Gate
When any video link (/watch?v=...) is opened, the entire tab layout is instantly hijacked by a fullscreen, high-priority dark shield.
The Smart Engine: The 10-minute countdown loop relies on the browser's document.visibilityState API.
Active Enforcement: The clock freezes if you click into a different application window, scroll away, or check another browser tab. It only counts down when your eyes are actively on that specific tab.
Embedded Videos Bypass: This constraint targets the central domain page framework. Videos embedded across educational external management boards (Canvas, Notion, Coursera) run fluidly without delay blocks.
2. The 10-Second Home Feed Lockout
Navigating directly to the generic YouTube homepage deploys a system lock.
Friction Mechanism: The feed is blanked out until you click and continuously hold down a primary trigger button for 10 uninterrupted seconds.
Impulse Breaking: If you release the mouse button even a split second early, the verification process resets back to 0%. This forces you to make a conscious, prolonged commitment before accessing recommendations.
3. Anti-Infinite Scroll Block
Once the home feed is intentionally unlocked, an internal MutationObserver engine actively sweeps the page layout. It continuously intercepts and targets incoming data streams, systematically destroying lazy-loader elements (ytd-continuation-item-renderer). You can view the first grid of video choices, but scrolling down to search for more is physically impossible.
4. The Hidden Emergency Backdoor
For educational exceptions or true emergencies where waiting 10 minutes is impossible, an invisible, unprompted keyboard listener watches for a strict numeric sequence:
The Secret Sequence: 937402615884712
Mechanics: There are no buttons or visual cues on screen. If you type the string perfectly while looking at a video shield, a confirmation box appears.
The Double-Pass Reward: Clearing the phrase validation unlocks your active video tab and sets a temporary edu_free_pass key in storage. Your next newly opened video tab skips the 10-minute shield entirely. Once that tab fires, the key is burned, re-arming the security gates for all future videos.
 

