// Proof - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key-input');
  const saveBtn = document.getElementById('save-btn');
  const feedbackEl = document.getElementById('feedback');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const currentKeyDisplay = document.getElementById('current-key-display');
  const keyMask = document.getElementById('key-mask');
  const removeKeyBtn = document.getElementById('remove-key-btn');

  // ─── Load current state ───────────────────────────────────────────────────

  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      showStoredKey(result.apiKey);
    }
  });

  // Check if we're on a supported site
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab && tab.url || '';
    if (url.includes('facebook.com')) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active on Facebook';
    } else if (url.includes('instagram.com')) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active on Instagram';
    } else {
      statusDot.classList.add('inactive');
      statusText.textContent = 'Navigate to Facebook or Instagram to use';
    }
  });

  // ─── Save API Key ─────────────────────────────────────────────────────────

  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();

    if (!key) {
      showFeedback('Please enter your API key.', 'error');
      return;
    }

    if (!key.startsWith('sk-')) {
      showFeedback('API key should start with "sk-ant-..."', 'error');
      return;
    }

    chrome.storage.local.set({ apiKey: key }, () => {
      showFeedback('API key saved successfully!', 'success');
      showStoredKey(key);
      apiKeyInput.value = '';
    });
  });

  // Allow pressing Enter to save
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });

  // ─── Remove API Key ───────────────────────────────────────────────────────

  removeKeyBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['apiKey'], () => {
      currentKeyDisplay.classList.remove('visible');
      keyMask.textContent = '';
      apiKeyInput.value = '';
      showFeedback('API key removed.', 'success');
    });
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function showStoredKey(key) {
    const masked = key.substring(0, 10) + '••••••••' + key.slice(-4);
    keyMask.textContent = masked;
    currentKeyDisplay.classList.add('visible');
  }

  function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = `pp-feedback ${type}`;
    setTimeout(() => {
      feedbackEl.className = 'pp-feedback';
    }, 3000);
  }
});
