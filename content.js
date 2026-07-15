let activeTimerInterval = null;
let holdTimer = null;
let holdDuration = 0;
let secretCodeBuffer = "";
let audioGuardInterval = null;

// The secret escape sequence (15 random digits).
const EMERGENCY_SECRET_CODE = "937402615884712";
const TARGET_VERIFICATION_PHRASE = "I verify this is a strict educational or critical emergency.";

// Helper to check what type of YouTube page we are on
function getPageType() {
  const url = new URL(window.location.href);
  if (url.pathname === "/watch") return "video";
  if (url.pathname.startsWith("/shorts/")) return "shorts";
  if (url.pathname === "/" || url.pathname === "") return "home";
  return "other";
}

// Helper to get unique Video ID (handles both /watch?v=... and /shorts/<id>)
function getVideoId() {
  const url = new URL(window.location.href);
  if (url.pathname.startsWith("/shorts/")) {
    return url.pathname.split("/")[2] || null;
  }
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

// --- INITIALIZER ENGINE ---
function init() {
  const pageType = getPageType();

  // Clean up any old overlays or intervals from previous page movements
  removeOverlay();
  if (activeTimerInterval) clearInterval(activeTimerInterval);

  if (pageType === "video" || pageType === "shorts") {
    handleVideoDelay();
  } else if (pageType === "home") {
    handleHomeLock();
    blockInfiniteScroll();
  }
}

// --- VIDEO DELAY LOGIC (10 MINUTES ACTIVE) ---
function handleVideoDelay() {
  const videoId = getVideoId();
  if (!videoId) return;

  const storageKey = `vid_timer_${videoId}`;

  // First, check if there's a free pass token waiting to be used
  chrome.storage.local.get(["edu_free_pass", storageKey], (result) => {

    // Check if this video has already been fully unlocked before
    if (result[storageKey] !== undefined && result[storageKey] <= 0) {
      return;
    }

    // IF an educational emergency free pass exists, consume it and instantly unlock
    if (result["edu_free_pass"] === true) {
      chrome.storage.local.remove("edu_free_pass"); // Destroy the token immediately
      chrome.storage.local.set({ [storageKey]: 0 }); // Mark this video as permanently unlocked
      return;
    }

    let timeLeft = result[storageKey] !== undefined ? result[storageKey] : 10 * 60; // 10 minutes in seconds

    // Inject the clean, un-bypassable lock screen overlay
    createOverlay("video", timeLeft);

    // Make sure nothing plays (with audio) behind the shield
    startAudioGuard();

    // Set up interval to countdown ONLY when tab is actively viewed
    activeTimerInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        timeLeft--;
        updateOverlayText(timeLeft);

        // Save progress to local storage (throttled to every 5s to reduce writes)
        if (timeLeft % 5 === 0 || timeLeft <= 0) {
          chrome.storage.local.set({ [storageKey]: timeLeft });
        }

        if (timeLeft <= 0) {
          clearInterval(activeTimerInterval);
          removeOverlay();
        }
      }
    }, 1000);
  });
}

// --- HOME PAGE LOCK LOGIC (HOLD BUTTON, EVERY VISIT) ---
function handleHomeLock() {
  createOverlay("home");
  setupHoldButton();
}

// --- UI OVERLAY GENERATION ---
function createOverlay(type, timeLeft = 0) {
  if (document.getElementById("yt-focus-shield")) return;

  const shield = document.createElement("div");
  shield.id = "yt-focus-shield";
  shield.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: #0f0f0f; color: #fff; z-index: 9999999999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: Arial, sans-serif; user-select: none;
  `;

  if (type === "video") {
    shield.innerHTML = `
      <h1 style="font-size: 28px; margin-bottom: 10px;">⏳ Video Access Delayed</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 20px; text-align:center; max-width: 400px; line-height: 1.4;">
        This page is locked. The 10-minute timer will run <b>only while you actively look at this tab</b>.
      </p>
      <div id="yt-countdown-display" style="font-size: 48px; font-weight: bold; color: #ff4d4d; margin-bottom: 20px;">
        ${formatTime(timeLeft)}
      </div>
      <div id="yt-hidden-portal" style="display: none; flex-direction: column; align-items: center; border-top: 1px solid #222; padding-top: 20px;">
        <p style="font-size: 12px; color: #ff4d4d; font-weight: bold; margin-bottom: 5px;">🚨 EMERGENCY PORTAL ACTIVATED 🚨</p>
        <p style="font-size: 12px; color: #888; max-width: 450px; text-align: center; margin-bottom: 15px; user-select: none;">
          Type this exact phrase (No Pasting Allowed): <br><span style="color: #eee; font-weight: bold;">"${TARGET_VERIFICATION_PHRASE}"</span>
        </p>
        <div style="display: flex;">
          <input id="yt-emergency-input" type="text" placeholder="Type perfectly here..." autocomplete="off" style="
            width: 320px; padding: 10px; background: #1a1a1a; color: #fff; border: 1px solid #333; border-radius: 4px; font-size: 13px;
          ">
          <button id="yt-emergency-submit" style="
            padding: 10px 20px; margin-left: 10px; background: #cc0000; color: white; border: none; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: bold;
          ">Verify</button>
        </div>
      </div>
    `;
  } else if (type === "home") {
    shield.innerHTML = `
      <h1 style="font-size: 28px; margin-bottom: 20px;">🛡️ Intentional Browsing Lock</h1>
      <p style="font-size: 16px; color: #aaa; margin-bottom: 30px;">Hold down the button below for ${HOLD_DURATION_MS / 1000} seconds to unlock the home feed.</p>
      <button id="yt-hold-btn" style="
        padding: 15px 40px; font-size: 18px; font-weight: bold; background: #cc0000;
        color: white; border: none; border-radius: 25px; cursor: pointer; transition: transform 0.1s;
      ">HOLD TO UNLOCK (0%)</button>
    `;
  }

  document.documentElement.appendChild(shield);
}

function updateOverlayText(timeLeft) {
  const display = document.getElementById("yt-countdown-display");
  if (display) display.innerText = formatTime(timeLeft);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function removeOverlay() {
  const shield = document.getElementById("yt-focus-shield");
  if (shield) shield.remove();
  stopAudioGuard();
}

// --- AUDIO/VIDEO SUPPRESSION WHILE LOCKED ---
// The shield blocks input, but YouTube's player will happily keep
// playing (and making noise) underneath it unless we actively pause it.
// We poll instead of relying on a single pause() call because YouTube
// can auto-resume playback (ads, autoplay-next, etc.) while hidden.
function startAudioGuard() {
  if (audioGuardInterval) clearInterval(audioGuardInterval);
  pauseAllMedia();
  audioGuardInterval = setInterval(pauseAllMedia, 250);
}

function stopAudioGuard() {
  if (audioGuardInterval) {
    clearInterval(audioGuardInterval);
    audioGuardInterval = null;
  }
}

function pauseAllMedia() {
  document.querySelectorAll("video, audio").forEach((el) => {
    if (!el.paused) el.pause();
  });
}

// --- HOLD BUTTON ENGINE ---
const HOLD_DURATION_MS = 30 * 1000; // change this one value to adjust the hold length
const HOLD_TICK_MS = 100;           // how often we update the button (ms)

function setupHoldButton() {
  const btn = document.getElementById("yt-hold-btn");
  if (!btn) return;

  const startHold = (e) => {
    e.preventDefault();
    holdDuration = 0;
    btn.style.transform = "scale(0.95)";

    holdTimer = setInterval(() => {
      holdDuration += HOLD_TICK_MS; // increment matches the actual tick interval
      let percent = Math.min((holdDuration / HOLD_DURATION_MS) * 100, 100);
      btn.innerText = `HOLD TO UNLOCK (${Math.floor(percent)}%)`;
      btn.style.background = `linear-gradient(90deg, #28a745 ${percent}%, #cc0000 ${percent}%)`;

      if (holdDuration >= HOLD_DURATION_MS) {
        clearInterval(holdTimer);
        removeOverlay();
      }
    }, 100);
  };

  const endHold = () => {
    clearInterval(holdTimer);
    holdDuration = 0;
    btn.innerText = "HOLD TO UNLOCK (0%)";
    btn.style.background = "#cc0000";
    btn.style.transform = "scale(1)";
  };

  btn.addEventListener("mousedown", startHold);
  btn.addEventListener("mouseup", endHold);
  btn.addEventListener("mouseleave", endHold);
  btn.addEventListener("touchstart", startHold);
  btn.addEventListener("touchend", endHold);
}

// --- ANTI-INFINITE SCROLL LOGIC ---
function blockInfiniteScroll() {
  const observer = new MutationObserver(() => {
    const continuations = document.querySelectorAll("ytd-continuation-item-renderer");
    for (let el of continuations) {
      el.remove();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// --- INVISIBLE EMERGENCY KEYBOARD LISTENER & ANTI-PASTE INJECTION ---
window.addEventListener("keydown", (e) => {
  if (getPageType() !== "video" || !document.getElementById("yt-focus-shield")) return;

  // Intercept normal text if the portal layout is already active
  const portal = document.getElementById("yt-hidden-portal");
  if (portal && portal.style.display === "flex") return;

  if (/^\d$/.test(e.key)) {
    secretCodeBuffer += e.key;

    if (secretCodeBuffer.length > EMERGENCY_SECRET_CODE.length) {
      secretCodeBuffer = secretCodeBuffer.substring(1);
    }

    if (secretCodeBuffer === EMERGENCY_SECRET_CODE) {
      secretCodeBuffer = ""; // Reset buffer
      revealEmergencyPortal(); // Display custom interface element
    }
  } else {
    secretCodeBuffer = "";
  }
});

// Build interface container dynamically to bypass clipboard copy injections
function revealEmergencyPortal() {
  const portal = document.getElementById("yt-hidden-portal");
  if (!portal) return;

  portal.style.display = "flex"; // Make it visible

  const input = document.getElementById("yt-emergency-input");
  const submitBtn = document.getElementById("yt-emergency-submit");

  if (!input || !submitBtn) return;
  input.focus();

  // HARD REJECTION FOR PASTE EVENTS
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    alert("🔒 Copy-pasting is strictly blocked. You must write every character by hand.");
  });

  const verifyAction = () => {
    if (input.value.trim() === TARGET_VERIFICATION_PHRASE) {
      const videoId = getVideoId();
      chrome.storage.local.set({
        [`vid_timer_${videoId}`]: 0,
        "edu_free_pass": true
      }, () => {
        removeOverlay();
        if (activeTimerInterval) clearInterval(activeTimerInterval);
      });
    } else {
      alert("Typo detected. You must type every character perfectly to prove intentionality.");
      input.value = "";
      input.focus();
    }
  };

  submitBtn.onclick = verifyAction;
  input.onkeydown = (e) => {
    if (e.key === "Enter") verifyAction();
  };
}

// --- SPA NAVIGATION TRACKING ---
// YouTube uses the History API for client-side navigation, so we hook
// pushState/replaceState directly rather than relying only on incidental
// <head> mutations (title/meta tag updates), which is a less direct signal.
(function hookHistoryForNavigation() {
  const wrap = (type) => {
    const original = history[type];
    return function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("yt-focus-locationchange"));
      return result;
    };
  };
  history.pushState = wrap("pushState");
  history.replaceState = wrap("replaceState");

  window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("yt-focus-locationchange"));
  });
})();

let lastUrl = window.location.href;
function handleLocationChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    init();
  }
}
window.addEventListener("yt-focus-locationchange", handleLocationChange);

// Fallback observer in case some navigations don't go through History API.
// document_start fires before <head> exists, so wait for it rather than
// assuming it's already there.
function attachHeadFallbackObserver() {
  if (document.head) {
    new MutationObserver(handleLocationChange).observe(document.head, {
      subtree: true,
      childList: true
    });
  } else {
    // <head> not created yet — check again on the next microtask/frame.
    requestAnimationFrame(attachHeadFallbackObserver);
  }
}
attachHeadFallbackObserver();

// Also defer init() itself until there's a real DOM to work with,
// since document_start means document.documentElement/body may not
// be ready for overlay injection yet either.
function safeInit() {
  if (document.documentElement) {
    init();
  } else {
    requestAnimationFrame(safeInit);
  }
}
safeInit();