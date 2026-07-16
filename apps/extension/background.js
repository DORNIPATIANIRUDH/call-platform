// Background service worker — handles tab capture and WebSocket streaming

let ws = null
let mediaRecorder = null
let currentMeetingId = null
const APP_URL = 'https://app.callplatform.io'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_RECORDING') {
    startRecording(message.meetingId, message.token)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }
  if (message.type === 'STOP_RECORDING') {
    stopRecording()
    sendResponse({ ok: true })
    return true
  }
  if (message.type === 'GET_STATUS') {
    sendResponse({ recording: !!mediaRecorder, meetingId: currentMeetingId })
    return true
  }
})

async function startRecording(meetingId, token) {
  if (mediaRecorder) throw new Error('Already recording')

  currentMeetingId = meetingId

  // Capture audio from the current tab
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (!stream) reject(new Error('tabCapture failed'))
      else resolve(stream)
    })
  })

  const stream = streamId // tabCapture returns stream directly
  const wsUrl = `${APP_URL.replace('https', 'wss')}/api/realtime/stream?meetingId=${meetingId}&token=${token}`
  ws = new WebSocket(wsUrl)

  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
      ws.send(e.data)
    }
  }
  mediaRecorder.onstop = () => {
    ws?.close()
    ws = null
    stream.getTracks().forEach((t) => t.stop())
  }

  mediaRecorder.start(1000) // 1-second chunks

  // Notify popup
  chrome.runtime.sendMessage({ type: 'RECORDING_STARTED', meetingId })
}

function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop()
    mediaRecorder = null
  }
  currentMeetingId = null
  chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' })
}
