import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import firstpageBg from './prompt/firstpage background.gif'
import chatBg from './assets/prompt secondpage/chatboxbackground.gif'
import logo from './prompt/logo.jpg'
import playBtnImg from './prompt/playbutton.jpg'
import charOneImg from './assets/prompt secondpage/chat-1.jpg'
import charTwoImg from './assets/prompt secondpage/chat-2.gif'
import charThreeImg from './assets/prompt secondpage/chat-3.gif'
import userPfpImg from './assets/prompt secondpage/chat-user.webp'

const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3001/api/chat'
const SAVED_CHATS_KEY = 'cyberpunk-ai-saved-chats'
const PERSONAS = ['spicy', 'cool', 'funny', 'nonchalant']

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
  }
}

function getStarterLine(character) {
  const intros = {
    Neon: 'Neon here. I am online now. Tell me what happened today.',
    Echo: 'Echo connected. Talk to me like you mean it. What is on your mind?',
    Nova: 'Nova in the channel. Give me one thing you want help with right now.',
  }
  return intros[character] || intros.Neon
}

function App() {
  const [screen, setScreen] = useState('start') // 'start' | 'auth' | 'select' | 'history' | 'chat'
  const [selectedCharacter, setSelectedCharacter] = useState('Neon')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([makeMessage('assistant', getStarterLine('Neon'))])
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false)
  const [savedChats, setSavedChats] = useState([])
  const [infoPanel, setInfoPanel] = useState('') // '' | 'about' | 'contact'
  const [persona, setPersona] = useState('cool')
  const endRef = useRef(null)

  const characters = [
    { name: 'Neon', image: charOneImg },
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
    setSelectedCharacter(characterName)
    setMessages([makeMessage('assistant', getStarterLine(characterName))])
    setDraft('')
    setChatError('')
    setPersona('cool')
    setIsMobilePanelOpen(false)
    setInfoPanel('')
    setScreen('chat')
  }

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
      image: getCharacterImage(selectedCharacter),
      createdAt: Date.now(),
      messages,
    }
    setSavedChats((prev) => [snapshot, ...prev])
  }

  function openSavedChat(chat) {
    if (!chat || !Array.isArray(chat.messages)) return
    setSelectedCharacter(chat.character || 'Neon')
    setPersona(chat.persona || 'cool')
    setMessages(chat.messages)
    setScreen('chat')
    setIsMobilePanelOpen(false)
    setInfoPanel('')
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
          history: nextMessages.slice(-14).map((item) => ({
            role: item.role,
            text: item.text,
          })),
        }),
      })

      const delayPromise = new Promise((resolve) => setTimeout(resolve, typingDelay))
      const [response] = await Promise.all([responsePromise, delayPromise])
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reach the chat server.')
      }

      const replyText = typeof data?.reply === 'string' ? data.reply.trim() : ''
      if (!replyText) {
        throw new Error('The bot replied with an empty message.')
      }

      setMessages((prev) => [...prev, makeMessage('assistant', replyText)])
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'Chat failed. Try again.'
      setChatError(fallback)
      setMessages((prev) => [
        ...prev,
        makeMessage('assistant', 'Connection got noisy. Try sending that again.'),
      ])
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

  return (
    <div className="main-container">
      {screen !== 'chat' && (
        <div className="sidebar">
          <button
            className="sidebar-link"
            onClick={() => {
              setScreen('start')
              setInfoPanel('')
            }}
          >
            HOME
          </button>
          <button className="sidebar-link" onClick={() => setInfoPanel('about')}>ABOUT</button>
          <button className="sidebar-link" onClick={() => setInfoPanel('contact')}>CONTACT</button>
        </div>
      )}

      <div className={`content-overlay ${screen === 'chat' ? 'chat-mode' : ''}`}>
        {screen !== 'chat' && infoPanel && (
          <div className="info-panel">
            {infoPanel === 'about' && <p>This is for school purpose only.</p>}
            {infoPanel === 'contact' && (
              <div className="contact-content">
                <a href="https://www.facebook.com/profile.php?id=615597695866" target="_blank" rel="noreferrer">
                  Facebook: profile
                </a>
                <a href="mailto:sininoff@gmail.com">Gmail: sininoff@gmail.com</a>
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
            </div>
          </div>
        )}

        {/* AUTH SCREEN */}
        {screen === 'auth' && (
          <div className="auth-screen" style={{ backgroundImage: `url(${chatBg})` }}>
            <button className="ui-btn" onClick={() => setScreen('select')}>Create a New Chat</button>
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
            <button
              className={`mobile-panel-backdrop ${isMobilePanelOpen ? 'open' : ''}`}
              onClick={() => setIsMobilePanelOpen(false)}
              aria-label="Close menu"
            ></button>

            <aside className={`chat-side-panel ${isMobilePanelOpen ? 'open' : ''}`}>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('start'))}>Home</button>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('auth'))}>Go home?</button>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('select'))}>New chat</button>
              <button className="panel-btn" onClick={() => runAndClosePanel(() => setScreen('select'))}>Select a Character first</button>
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
                  <div className="top-note">{topNote}</div>
                  <div className="persona-row">
                    {PERSONAS.map((tone) => (
                      <button
                        key={tone}
                        className={`persona-btn ${persona === tone ? 'active' : ''}`}
                        onClick={() => setPersona(tone)}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

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
                  <button className="send-btn" onClick={sendMessage} disabled={isTyping || !draft.trim()}>
                    {isTyping ? '...' : 'Send'}
                  </button>
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
