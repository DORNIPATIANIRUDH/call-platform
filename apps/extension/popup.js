const APP_URL = 'https://app.callplatform.io'

const startBtn = document.getElementById('startBtn')
const stopBtn = document.getElementById('stopBtn')
const form = document.getElementById('form')
const stopSection = document.getElementById('stopSection')
const dot = document.getElementById('dot')
const statusText = document.getElementById('statusText')
const errorBox = document.getElementById('errorBox')
const meetingTitleInput = document.getElementById('meetingTitle')

function showError(msg) {
  errorBox.textContent = msg
  errorBox.style.display = 'block'
}
function clearError() {
  errorBox.style.display = 'none'
}

function setRecording(recording, meetingId) {
  form.style.display = recording ? 'none' : 'block'
  stopSection.style.display = recording ? 'block' : 'none'
  dot.className = 'dot' + (recording ? ' recording' : '')
  statusText.textContent = recording ? `Recording meeting…` : 'Not recording'
}

// Check current status
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (res?.recording) setRecording(true, res.meetingId)
})

// Listen for background updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RECORDING_STARTED') setRecording(true, msg.meetingId)
  if (msg.type === 'RECORDING_STOPPED') setRecording(false, null)
})

startBtn.addEventListener('click', async () => {
  clearError()
  startBtn.disabled = true
  try {
    const title = meetingTitleInput.value.trim() || 'Browser Recording'

    // Create meeting via API
    const res = await fetch(`${APP_URL}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error('Not signed in to CallPlatform. Open the dashboard first.')
    const { data } = await res.json()

    // Get a short-lived token for the WebSocket
    const tokenRes = await fetch(`${APP_URL}/api/realtime/token?meetingId=${data.id}`, { credentials: 'include' })
    if (!tokenRes.ok) throw new Error('Could not get realtime token')
    const { token } = await tokenRes.json()

    chrome.runtime.sendMessage({ type: 'START_RECORDING', meetingId: data.id, token }, (r) => {
      if (!r?.ok) showError(r?.error ?? 'Failed to start recording')
    })
  } catch (err) {
    showError(err.message)
    startBtn.disabled = false
  }
})

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
})
