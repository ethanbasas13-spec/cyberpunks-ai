import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import './App.css'
import firstpageBg from './prompt/firstpage background.gif'
import chatBg from './assets/prompt secondpage/chatboxbackground.gif'
import logo from './prompt/logo.jpg'
import playBtnImg from './prompt/playbutton.jpg'
import charOneImg from './assets/prompt secondpage/chat-1.jpg'
import charTwoImg from './assets/prompt secondpage/chat-2.gif'
import charThreeImg from './assets/prompt secondpage/chat-3.gif'
import userPfpImg from './assets/prompt secondpage/chat-user.webp'
import { personas } from './personas'

const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL ||
  (import.meta.env.PROD ? '/.netlify/functions/chat' : '/api/chat')
const GEMINI_CLIENT_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const SAVED_CHATS_KEY = 'cyberpunk-ai-saved-chats'
const PERSONAS = ['spicy', 'cool', 'funny', 'nonchalant']
const CHARACTER_ALIASES = {
  neo: 'Neo',
  neon: 'Neo',
  echo: 'Echo',
  nova: 'Nova',
}

function normalizeCharacterName(name) {
  if (typeof name !== 'string') return 'Neo'
  return CHARACTER_ALIASES[name.trim().toLowerCase()] || 'Neo'
}

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
  }
}

function getStarterLine(character) {
  const intros = {
    Neo: 'Neo here. I am online now. Tell me what happened today.',
    Echo: 'Echo connected. Talk to me like you mean it. What is on your mind?',
    Nova: 'Nova in the channel. Give me one thing you want help with right now.',
  }
  return intros[normalizeCharacterName(character)] || intros.Neo
}

function buildToneInstruction(persona) {
  const personaMap = {
    spicy: 'Use a bold, teasing, high-energy tone with sharp lines but do not be rude.',
    cool: 'Use a calm, confident, smooth tone. Keep it chill and clear.',
    funny: 'Use a playful, witty tone with light humor.',
    nonchalant: 'Use a detached, minimal, nonchalant tone with short responses.',
  }
  return personaMap[persona] || personaMap.cool
}

function buildSystemInstruction(character, persona) {
  const normalizedCharacter = normalizeCharacterName(character)
  const characterInstruction = personas[normalizedCharacter]?.systemInstruction ||
    `You are ${normalizedCharacter}. Stay in character and reply conversationally.`
  return `${characterInstruction} ${buildToneInstruction(persona)} Keep responses concise unless asked for detail.`
}

function buildSystemInstructionWithNsfw(character, persona, nsfw) {
  const base = buildSystemInstruction(character, persona)
  if (nsfw) {
    return `${base} The user has allowed adult or explicit content; when contextually appropriate, you may include mature material while remaining respectful and non-exploitative.`
  }
  return `${base} Avoid sexual or explicit content; keep responses safe for general audiences unless the user explicitly requests otherwise and it is legal.`
}

function App() {
  const [screen, setScreen] = useState('start') // 'start' | 'auth' | 'select' | 'history' | 'chat'
  const [selectedCharacter, setSelectedCharacter] = useState('Neo')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([makeMessage('assistant', getStarterLine('Neo'))])
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [savedChats, setSavedChats] = useState([])
  const [infoPanel, setInfoPanel] = useState('') // '' | 'about' | 'contact'
  const [persona, setPersona] = useState('cool')
  const [isNsfw, setIsNsfw] = useState(false)
  const [showNsfwControls, setShowNsfwControls] = useState(false)
  const [showNsfwConfirm, setShowNsfwConfirm] = useState(false)
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false)
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false)
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false)
  const endRef = useRef(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsClickCount, setSettingsClickCount] = useState(0)
  const [showSecretNsfw, setShowSecretNsfw] = useState(false)
  const [isFirstPageMusicPlaying, setIsFirstPageMusicPlaying] = useState(false)
  const [isChatMusicPlaying, setIsChatMusicPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [chatMusicTrack, setChatMusicTrack] = useState('phonklastpage')
  const firstPageAudioRef = useRef(null)
  const chatAudioRef = useRef(null)
  const cyberpunkChatAudioRef = useRef(null)

  const characters = [
    { name: 'Neo', image: charOneImg },
    { name: 'Echo', image: charTwoImg },
    { name: 'Nova', image: charThreeImg },
  ]

  const selectedCharacterImage =
    characters.find((character) => character.name === selectedCharacter)?.image || charOneImg

  const topNote = useMemo(() => `You are chatting with ${selectedCharacter}`, [selectedCharacter])

  function getCharacterImage(characterName) {
    return characters.find((character) => character.name === characterName)?.image || charOneImg
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_CHATS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        setSavedChats(parsed)
      }
    } catch {
      setSavedChats([])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(savedChats))
  }, [savedChats])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  function startChat(characterName) {
    const normalizedCharacter = normalizeCharacterName(characterName)
    setSelectedCharacter(normalizedCharacter)
    setMessages([makeMessage('assistant', getStarterLine(normalizedCharacter))])
    setDraft('')
    setChatError('')
    setPersona('cool')
    setIsPersonaMenuOpen(false)
    setIsMobilePanelOpen(false)
    setInfoPanel('')
    setIsTopMenuOpen(false)
    setIsNsfw(false)
    setScreen('chat')
  }

  function handleSecretClick() {
    const next = settingsClickCount + 1
    setSettingsClickCount(next)
    if (next >= 10) {
      setShowSecretNsfw(true)
    }
  }

  function toggleFirstPageMusic() {
    if (firstPageAudioRef.current) {
      if (isFirstPageMusicPlaying) {
        firstPageAudioRef.current.pause()
        setIsFirstPageMusicPlaying(false)
      } else {
        firstPageAudioRef.current.play()
        setIsFirstPageMusicPlaying(true)
      }
    }
  }

  function toggleChatMusic() {
    const activeRef = chatMusicTrack === 'phonklastpage' ? chatAudioRef.current : cyberpunkChatAudioRef.current
    if (activeRef) {
      if (isChatMusicPlaying) {
        activeRef.pause()
        setIsChatMusicPlaying(false)
      } else {
        // Stop all chat music tracks
        if (chatAudioRef.current) chatAudioRef.current.pause()
        if (cyberpunkChatAudioRef.current) cyberpunkChatAudioRef.current.pause()
        // Play selected track
        activeRef.play()
        setIsChatMusicPlaying(true)
      }
    }
  }

  function changeChatMusicTrack(newTrack) {
    setChatMusicTrack(newTrack)
    // Stop current track
    if (chatAudioRef.current) chatAudioRef.current.pause()
    if (cyberpunkChatAudioRef.current) cyberpunkChatAudioRef.current.pause()
    setIsChatMusicPlaying(false)
  }

  useEffect(() => {
    if (firstPageAudioRef.current) {
      firstPageAudioRef.current.volume = volume / 100
    }
    if (chatAudioRef.current) {
      chatAudioRef.current.volume = volume / 100
    }
    if (cyberpunkChatAudioRef.current) {
      cyberpunkChatAudioRef.current.volume = volume / 100
    }
  }, [volume])

  function runAndClosePanel(action) {
    action()
    setIsMobilePanelOpen(false)
  }

  function saveCurrentChat() {
    if (!messages.length) return
    const firstUserMessage = messages.find((message) => message.role === 'user')?.text || ''
    const titleBase = firstUserMessage || `${selectedCharacter} chat`
    const title = titleBase.length > 24 ? `${titleBase.slice(0, 24)}...` : titleBase
    const snapshot = {
      id: `saved-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      character: selectedCharacter,
      persona,
      nsfw: isNsfw,
      image: getCharacterImage(selectedCharacter),
      createdAt: Date.now(),
      messages,
    }
    setSavedChats((prev) => [snapshot, ...prev])
  }

  function openSavedChat(chat) {
    if (!chat || !Array.isArray(chat.messages)) return
    const normalizedCharacter = normalizeCharacterName(chat.character)
    setSelectedCharacter(normalizedCharacter)
    setPersona(chat.persona || 'cool')
    setIsNsfw(Boolean(chat.nsfw))
    setMessages(chat.messages)
    setScreen('chat')
    setIsPersonaMenuOpen(false)
    setIsMobilePanelOpen(false)
    setInfoPanel('')
    setIsTopMenuOpen(false)
  }

  function deleteSavedChat(chatId) {
    setSavedChats((prev) => prev.filter((chat) => chat.id !== chatId))
  }

  function clearSavedHistory() {
    setSavedChats([])
  }

  function clearCurrentMessages() {
    setMessages([makeMessage('assistant', getStarterLine(selectedCharacter))])
  }

  function deleteMessage(messageId) {
    setMessages((prev) => {
      const next = prev.filter((message) => message.id !== messageId)
      return next.length ? next : [makeMessage('assistant', getStarterLine(selectedCharacter))]
    })
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!text || isTyping) return

    const userMessage = makeMessage('user', text)
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft('')
    setChatError('')
    setIsTyping(true)

    const typingDelay = Math.min(1900, Math.max(500, text.length * 28 + Math.floor(Math.random() * 450)))

    try {
      const responsePromise = fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          character: selectedCharacter,
          persona,
          nsfw: isNsfw,
          history: messages.slice(-14).map((item) => ({
            role: item.role,
            text: item.text,
          })),
        }),
      })

      const delayPromise = new Promise((resolve) => setTimeout(resolve, typingDelay))
      const [response] = await Promise.all([responsePromise, delayPromise])
      const data = await response.json()

      if (response.ok) {
        const replyText = typeof data?.reply === 'string' ? data.reply.trim() : ''
        if (!replyText) {
          throw new Error('The bot replied with an empty message.')
        }
        setMessages((prev) => [...prev, makeMessage('assistant', replyText)])
        return
      }

      throw new Error(data?.error || 'Unable to reach the chat server.')
    } catch (backendError) {
      try {
        const delayPromise = new Promise((resolve) => setTimeout(resolve, typingDelay))
        const [clientReply] = await Promise.all([
          sendWithGeminiClient({ text, history: messages.slice(-14), nsfw: isNsfw }),
          delayPromise,
        ])
        setMessages((prev) => [...prev, makeMessage('assistant', clientReply)])
      } catch (clientError) {
        const fallback =
          clientError instanceof Error
            ? clientError.message
            : backendError instanceof Error
              ? backendError.message
              : 'Chat failed. Try again.'
        setChatError(fallback)
      }
    } finally {
      setIsTyping(false)
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  async function sendWithGeminiClient({ text, history, nsfw = false }) {
    if (!GEMINI_CLIENT_KEY) {
      throw new Error(
        'Chat server is unavailable and VITE_GEMINI_API_KEY is missing. Add GEMINI_API_KEY in .env for backend or VITE_GEMINI_API_KEY for frontend fallback.',
      )
    }

    const genAI = new GoogleGenerativeAI(GEMINI_CLIENT_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: buildSystemInstructionWithNsfw(selectedCharacter, persona, nsfw),
    })

    const mappedHistory = history.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.text }],
    }))
    const firstUserIndex = mappedHistory.findIndex((item) => item.role === 'user')
    const geminiHistory = firstUserIndex >= 0 ? mappedHistory.slice(firstUserIndex) : []

    const chat = model.startChat({ history: geminiHistory })
    const result = await chat.sendMessage(text)
    const replyText = result?.response?.text?.().trim()
    if (!replyText) {
      throw new Error('Gemini returned an empty response.')
    }
    return replyText
  }

  return (
    <div className="main-container">
      <audio ref={firstPageAudioRef} src="/phonkfirstpage.mp3" />
      <audio ref={chatAudioRef} src="/phonklastpage.mp3" />
      <audio ref={cyberpunkChatAudioRef} src="/cyberpunkchatpage.mp3" />
      {screen !== 'chat' && (
        <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
      )}
      {screen !== 'chat' && (
        <div className="top-menu-wrap">
          <button className="top-menu-btn" onClick={() => setIsTopMenuOpen((prev) => !prev)}>
            Menu
          </button>
          <div className={`top-menu-list ${isTopMenuOpen ? 'open' : ''}`}>
            <button
              className="top-menu-item"
              onClick={() => {
                setScreen('start')
                setInfoPanel('')
                setIsTopMenuOpen(false)
              }}
            >
              Home
            </button>
            <button
              className="top-menu-item"
              onClick={() => {
                setInfoPanel('about')
                setIsTopMenuOpen(false)
              }}
            >
              About
            </button>
            <button
              className="top-menu-item"
              onClick={() => {
                setInfoPanel('contact')
                setIsTopMenuOpen(false)
              }}
            >
              Contact
            </button>
          </div>
        </div>
      )}

      <div className={`content-overlay ${screen === 'chat' ? 'chat-mode' : ''}`}>
        {screen !== 'chat' && infoPanel && (
          <div className="info-panel">
            {infoPanel === 'about' && (
              <div>
                <h3 style={{marginTop:0}}>About</h3>
                <p style={{margin: '8px 0', fontSize: 12}}>Cyberpunk AI — a small school project that lets you chat with stylized characters (Neo, Echo, Nova). Choose a persona to change tone: spicy, cool, funny, nonchalant. The UI is mobile-friendly; open Menu on small screens.</p>
              </div>
            )}
            {infoPanel === 'contact' && (
              <div className="contact-content">
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <a href="https://www.facebook.com/profile.php?id=615597695866" target="_blank" rel="noreferrer">Facebook profile</a>
                  <a href="mailto:sininoff@gmail.com">Email: sininoff@gmail.com</a>
                </div>
              </div>
            )}
            <button className="info-close-btn" onClick={() => setInfoPanel('')}>Close</button>
          </div>
        )}

        {/* START SCREEN */}
        {screen === 'start' && (
          <div className="start-screen">
            <img src={logo} alt="Logo" className="logo first-screen-logo" />
            <div className="play-screen" style={{ backgroundImage: `url(${firstpageBg})` }}>
              <img src={playBtnImg} alt="Play" className="play-button" onClick={() => setScreen('auth')} />
              
              {/* Volume Display and Music Controls */}
              <div className="first-page-controls">
                <div className="volume-display-panel">
                  <span className="volume-label">🔊 {volume}%</span>
                </div>
                <div className="homepage-music-controls">
                  <select 
                    className="music-select-dropdown"
                    value={chatMusicTrack}
                    onChange={(e) => changeChatMusicTrack(e.target.value)}
                    title="Select music"
                  >
                    <option value="phonklastpage">🎵 Phonk</option>
                    <option value="cyberpunkchatpage">🎵 Cyber</option>
                  </select>
                  <button className="music-toggle-btn" onClick={toggleFirstPageMusic} title={isFirstPageMusicPlaying ? 'Stop Music' : 'Play Music'}>
                    {isFirstPageMusicPlaying ? '⏸️ Stop' : '▶️ Play'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AUTH SCREEN */}
        {screen === 'auth' && (
          <div className="auth-screen">
            <button className="ui-btn" onClick={() => setScreen('select')}>Create a New Character</button>
            <button className="ui-btn" onClick={() => setScreen('history')}>Chat History</button>
          </div>
        )}

        {/* CHARACTER SELECTION */}
        {screen === 'select' && (
          <div className="select-screen">
            <h3 className="select-title">Choose a character</h3>
            <div className="character-grid">
              {characters.map((character) => (
                <div
                  key={character.name}
                  className="char-card"
                  onClick={() => startChat(character.name)}
                >
                  <img src={character.image} alt={character.name} />
                  <div className="char-name">{character.name}</div>
                </div>
              ))}
            </div>
            <button className="ui-btn" onClick={() => setScreen('auth')}>Back</button>
          </div>
        )}

        {/* HISTORY SCREEN */}
        {screen === 'history' && (
          <div className="history-screen">
            <h3>Chat History</h3>
            <div className="history-actions">
              <button className="ui-btn history-btn" onClick={clearSavedHistory}>Clear Saved History</button>
            </div>
            {savedChats.length === 0 && <div className="history-empty">No saved chats yet.</div>}
            <ul className="history-list">
              {savedChats.map((chat) => (
                <li key={chat.id}>
                  <button className="history-item-main" onClick={() => openSavedChat(chat)}>
                    <img src={chat.image} alt={chat.character} />
                    <div className="history-item-text">
                      <div>{chat.title}</div>
                      <div>{chat.character}</div>
                    </div>
                  </button>
                  <button className="history-delete-btn" onClick={() => deleteSavedChat(chat.id)}>Delete</button>
                </li>
              ))}
            </ul>
            <button className="ui-btn" onClick={() => setScreen('auth')}>Back</button>
          </div>
        )}

        {/* CHAT SCREEN */}
        {screen === 'chat' && (
          <div className="chat-shell">
            <button className="mobile-panel-toggle" onClick={() => setIsMobilePanelOpen((prev) => !prev)}>
              Menu
            </button>
            <div className="chat-top-controls">
              <button className="right-menu-btn" onClick={() => setIsRightMenuOpen((prev) => !prev)} title="Controls">
                ⚙️
              </button>
              {isRightMenuOpen && (
                <div className="right-menu-box">
                  <div className="chat-music-controls">
                    <select 
                      className="music-select-dropdown"
                      value={chatMusicTrack}
                      onChange={(e) => changeChatMusicTrack(e.target.value)}
                      title="Select chat music"
                    >
                      <option value="phonklastpage">🎵 Phonk</option>
                      <option value="cyberpunkchatpage">🎵 Cyber</option>
                    </select>
                    <button className="music-toggle-btn" onClick={toggleChatMusic} title={isChatMusicPlaying ? 'Stop Music' : 'Play Music'}>
                      {isChatMusicPlaying ? '⏸️ Stop' : '▶️ Play'}
                    </button>
                  </div>
                  <button className="settings-inline-btn chat" onClick={() => setShowSettings(true)} aria-label="Settings">Settings</button>
                </div>
              )}
            </div>
            <button
              className={`mobile-panel-backdrop ${isMobilePanelOpen ? 'open' : ''}`}
              onClick={() => setIsMobilePanelOpen(false)}
              aria-label="Close menu"
            ></button>

            <aside className={`chat-side-panel ${isMobilePanelOpen ? 'open' : ''}`}>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('start'))}>Home</button>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('auth'))}>Main Menu</button>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('select'))}>New Character</button>
              <button className="panel-btn" onClick={saveCurrentChat}>Save this chat</button>
              <button className="panel-btn" onClick={clearCurrentMessages}>Delete messages</button>

              <div className="panel-character-list">
                {characters.map((character) => (
                  <button
                    key={character.name}
                    className={`panel-character ${selectedCharacter === character.name ? 'active' : ''}`}
                    onClick={() => runAndClosePanel(() => startChat(character.name))}
                  >
                    <img src={character.image} alt={character.name} />
                    <span>{character.name}</span>
                  </button>
                ))}
              </div>

              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('history'))}>See old chats</button>

              <div className="saved-chat-list">
                {savedChats.length === 0 && <div>No saved chats</div>}
                {savedChats.slice(0, 4).map((chat) => (
                  <button key={chat.id} className="saved-chat-item" onClick={() => openSavedChat(chat)}>
                    <img src={chat.image} alt={chat.character} />
                    <span>{chat.character}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="chat-main">
              <div className="chat-stage-frame">
                <div className="chat-window" style={{ backgroundImage: `url(${chatBg})` }}>
                  <div className="top-note-container">
                    <div className="top-note">{topNote}</div>
                  </div>
                  <div className="persona-picker">
                    <button
                      className={`persona-toggle-btn ${isPersonaMenuOpen ? 'open' : ''}`}
                      onClick={() => setIsPersonaMenuOpen((prev) => !prev)}
                    >
                      Persona: {persona}
                    </button>
                    <div className={`persona-row ${isPersonaMenuOpen ? 'open' : ''}`}>
                      {PERSONAS.map((tone) => (
                        <button
                          key={tone}
                          className={`persona-btn ${persona === tone ? 'active' : ''}`}
                          onClick={() => {
                            setPersona(tone)
                            setIsPersonaMenuOpen(false)
                          }}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Settings modal */}
                  {showSettings && (
                    <div className="settings-modal" onClick={() => setShowSettings(false)}>
                      <div className="settings-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(188,0,255,0.2)'}}>
                          <h4 style={{margin: 0, fontSize: '14px'}}>⚙️ Settings</h4>
                          <button 
                            className="settings-close-btn"
                            onClick={() => setShowSettings(false)}
                            aria-label="Close settings"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div style={{marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(188,0,255,0.2)'}}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <span style={{fontSize: '12px', minWidth: '70px'}}>🔊 Volume:</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={volume} 
                              onChange={(e) => setVolume(Number(e.target.value))}
                              style={{flex: 1, cursor: 'pointer'}}
                            />
                            <span style={{fontSize: '12px', minWidth: '35px', textAlign: 'right'}}>{volume}%</span>
                          </label>
                        </div>

                        {showSecretNsfw && (
                          <div style={{marginBottom: '16px', paddingTop: '12px'}}>
                            {!isNsfw ? (
                              <button className="ui-btn" onClick={() => { setShowNsfwConfirm(true); }}>Enable NSFW</button>
                            ) : (
                              <button className="ui-btn" onClick={() => setIsNsfw(false)}>Disable NSFW</button>
                            )}
                            {showNsfwConfirm && (
                              <div className="nsfw-confirm-modal">
                                <div className="nsfw-confirm-content">
                                  <p>You must be 18+ to enable mature content. Do you confirm you are 18 or older and accept responsibility for viewing mature material?</p>
                                  <div style={{display: 'flex', gap: '8px'}}>
                                    <button className="ui-btn" onClick={() => { setIsNsfw(true); setShowNsfwConfirm(false); setShowSettings(false); }}>Confirm</button>
                                    <button className="ui-btn" onClick={() => setShowNsfwConfirm(false)}>Cancel</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Decorative circles always visible */}
                        <div className="decoration-circle decoration-circle-tl" />
                        <div className="decoration-circle decoration-circle-tr" />
                        <div className="decoration-circle decoration-circle-bl" />
                        <div className="decoration-circle decoration-circle-br" />
                        
                        <button className="nsfw-secret-btn" onClick={handleSecretClick} title="Unlock secret features" />
                        
                        {/* Secret circles appear after unlock */}
                        {showSecretNsfw && (
                          <>
                            <div className="secret-circle secret-circle-1" />
                            <div className="secret-circle secret-circle-2" />
                            <div className="secret-circle secret-circle-3" />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="chat-scroll">
                    {messages.map((message) => {
                      const isUser = message.role === 'user'
                      return (
                        <div key={message.id} className={`msg-row ${isUser ? 'user' : 'ai'}`}>
                          {!isUser && <div className="pfp" style={{ backgroundImage: `url(${selectedCharacterImage})` }}></div>}
                          <div className="bubble-group">
                            <div className="bubble">{message.text}</div>
                            <button className="message-delete-btn" onClick={() => deleteMessage(message.id)}>
                              Delete
                            </button>
                          </div>
                          {isUser && <div className="pfp" style={{ backgroundImage: `url(${userPfpImg})` }}></div>}
                        </div>
                      )
                    })}

                    {isTyping && (
                      <div className="msg-row ai">
                        <div className="pfp" style={{ backgroundImage: `url(${selectedCharacterImage})` }}></div>
                        <div className="bubble-group">
                          <div className="bubble typing-bubble">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={endRef} />
                  </div>
                </div>
              </div>

              <div className="input-container">
                <div className="input-left">
                  <button className="icon-btn">Mic</button>
                  <button className="icon-btn">Share</button>
                </div>
                <input
                  type="text"
                  placeholder={isTyping ? `${selectedCharacter} is typing...` : `Message ${selectedCharacter}...`}
                  className="chat-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={isTyping}
                />
                <div className="input-right">
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <button className="send-btn" onClick={sendMessage} disabled={isTyping || !draft.trim()}>
                      {isTyping ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
              {chatError && <div className="chat-error">{chatError}</div>}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
