import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WebviewTag } from 'electron';
import { Streamdown } from 'streamdown';
import './style.css';

// --- Type Definitions ---

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
}

interface Site {
  name: string;
  url: string;
}

interface AiResponse {
  action: 'navigate' | 'search' | 'summarize' | 'extract' | 'answer' | string;
  content?: string;
  url?: string;
  query?: string;
}

// Define types for the API exposed by the preload script
declare global {
  interface Window {
    api: {
      sendQuery: (query: string, pageContent: string, currentUrl: string, requestId: string) => Promise<string>;
      onAiStreamChunk: (callback: (payload: { requestId: string; delta: string }) => void) => () => void;
      onAiStreamEnd: (callback: (payload: { requestId: string; response: AiResponse }) => void) => () => void;
      onAiStreamError: (callback: (payload: { requestId: string; message: string }) => void) => () => void;
      navigateBrowser: (url: string) => Promise<any>;
      getBrowserState: () => Promise<any>;
      // File system operations
      selectDirectory: () => Promise<any>;
      getWorkingDirectory: () => Promise<any>;
      listDirectory: (relativePath?: string) => Promise<any>;
      readFile: (relativePath: string) => Promise<any>;
      writeFile: (relativePath: string, content: string) => Promise<any>;
    };
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- Component ---

function App() {
  const [url, setUrl] = useState<string>('https://www.google.com');
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);
  const [isSelectingFolder, setIsSelectingFolder] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { type: 'assistant', content: '💬 准备好帮助您浏览网页和管理系统文件了！' }
  ]);

  const webviewRef = useRef<WebviewTag | null>(null);
  const mediaRecorderRef = useRef<any | null>(null); // SpeechRecognition type can be complex
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const assistantIndexRef = useRef<number | null>(null);

  const newsSites: Site[] = [
    { name: '谷歌', url: 'https://www.google.com' },
    { name: '百度', url: 'https://www.baidu.com' },
    { name: '知乎', url: 'https://www.zhihu.com' },
    { name: '微博', url: 'https://weibo.com' },
    { name: '腾讯新闻', url: 'https://news.qq.com' },
    { name: '网易新闻', url: 'https://news.163.com' },
    { name: '新浪新闻', url: 'https://news.sina.com.cn' },
    { name: '抖音', url: 'https://www.douyin.com' }
  ];

  const loadSite = useCallback((siteUrl: string): void => {
    setUrl(siteUrl);
    const webview = webviewRef.current;
    if (webview) {
      webview.src = siteUrl;
    }
  }, []);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleReady = () => console.log('Webview 已准备就绪');
    const handleStartLoading = () => {};
    const handleStopLoading = () => {};
    const handleFailLoad = (e: any) => {
      console.error('加载失败:', e);
      setChatHistory(prev => [...prev, { type: 'assistant', content: `❌ 页面加载失败` }]);
    };
    const handleNewWindow = (e: any) => {
      e.preventDefault();
      loadSite(e.url);
    };

    webview.addEventListener('dom-ready', handleReady);
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('new-window', handleNewWindow);

    return () => {
      webview.removeEventListener('dom-ready', handleReady);
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, [loadSite]);

  const appendAssistantContent = useCallback((delta: string) => {
    if (!delta) return;

    if (assistantIndexRef.current === null) {
      setChatHistory(prev => {
        const updated = [...prev, { type: 'assistant', content: delta }];
        assistantIndexRef.current = updated.length - 1;
        return updated;
      });
      return;
    }

    setChatHistory(prev => {
      const updated = [...prev];
      const index = assistantIndexRef.current!;
      const message = updated[index];

      if (!message || message.type !== 'assistant') {
        updated.push({ type: 'assistant', content: delta });
        assistantIndexRef.current = updated.length - 1;
        return updated;
      }

      updated[index] = { ...message, content: `${message.content}${delta}` };
      return updated;
    });
  }, []);

  const handleStreamChunk = useCallback(({ requestId, delta }: { requestId: string; delta: string }) => {
    if (requestId !== activeRequestIdRef.current) return;
    appendAssistantContent(delta);
  }, [appendAssistantContent]);

  const handleStreamEnd = useCallback(({ requestId, response }: { requestId: string; response: AiResponse }) => {
    if (requestId !== activeRequestIdRef.current) return;

    setLoading(false);
    setQuery('');

    if (assistantIndexRef.current !== null) {
      setChatHistory(prev => {
        const updated = [...prev];
        const index = assistantIndexRef.current!;
        const message = updated[index];

        if (message && message.type === 'assistant' && (!message.content || !message.content.trim())) {
          updated[index] = { ...message, content: response.content || '暂无响应' };
        }

        return updated;
      });
    }

    if (response.url && response.url !== (webviewRef.current?.src || '')) {
      loadSite(response.url);
    }

    activeRequestIdRef.current = null;
    assistantIndexRef.current = null;
  }, [loadSite]);

  const handleStreamError = useCallback(({ requestId, message }: { requestId: string; message: string }) => {
    if (requestId !== activeRequestIdRef.current) return;

    setLoading(false);
    setQuery('');

    setChatHistory(prev => {
      if (assistantIndexRef.current === null) {
        return [...prev, { type: 'assistant', content: message }];
      }

      const updated = [...prev];
      const index = assistantIndexRef.current!;
      const existing = updated[index];

      if (!existing || existing.type !== 'assistant') {
        updated.push({ type: 'assistant', content: message });
      } else {
        updated[index] = { ...existing, content: message };
      }

      return updated;
    });

    activeRequestIdRef.current = null;
    assistantIndexRef.current = null;
  }, []);

  useEffect(() => {
    const offChunk = window.api.onAiStreamChunk(handleStreamChunk);
    const offEnd = window.api.onAiStreamEnd(handleStreamEnd);
    const offError = window.api.onAiStreamError(handleStreamError);

    return () => {
      offChunk();
      offEnd();
      offError();
    };
  }, [handleStreamChunk, handleStreamEnd, handleStreamError]);

  const getPageContent = async (): Promise<string> => {
    const webview = webviewRef.current;
    if (!webview) return '';
    try {
      return await webview.executeJavaScript(`document.body ? document.body.innerText.substring(0, 2000) : ''`);
    } catch (error) {
      console.error('Failed to get page content:', error);
      return '';
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const startRecording = (): void => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setQuery('');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setQuery(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      setIsRecording(false);
      if (event.error === 'no-speech') alert('未检测到语音，请重试');
      else if (event.error === 'not-allowed') alert('请允许使用麦克风');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (query.trim()) {
        sendQuery();
      }
    };

    mediaRecorderRef.current = recognition;
    recognition.start();
  };

  const stopRecording = (): void => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendQuery = async (): Promise<void> => {
    if (loading) return;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const requestId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}`;
    const userMessage: ChatMessage = { type: 'user', content: trimmedQuery };

    let assistantIndex = -1;
    setChatHistory(prev => {
      const updated = [...prev, userMessage, { type: 'assistant', content: '' }];
      assistantIndex = updated.length - 1;
      return updated;
    });

    assistantIndexRef.current = assistantIndex;
    activeRequestIdRef.current = requestId;

    setQuery('');
    setLoading(true);

    try {
      const pageContent = await getPageContent();
      const currentUrl = webviewRef.current?.src || url;
      await window.api.sendQuery(trimmedQuery, pageContent, currentUrl, requestId);
    } catch (error: any) {
      console.error('查询错误:', error);
      setChatHistory(prev => {
        if (assistantIndexRef.current === null) {
          return [...prev, { type: 'assistant', content: '❌ 错误：命令处理失败' }];
        }

        const updated = [...prev];
        const index = assistantIndexRef.current!;
        updated[index] = { type: 'assistant', content: '❌ 错误：命令处理失败' };
        return updated;
      });

      setLoading(false);
      activeRequestIdRef.current = null;
      assistantIndexRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) sendQuery();
  };

  const handleUrlKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') loadSite(url);
  };

  const selectFolder = async (): Promise<void> => {
    if (isSelectingFolder) return;

    setIsSelectingFolder(true);
    try {
      const result = await window.api.selectDirectory();
      if (result.success && result.path) {
        setWorkingDirectory(result.path);
        setChatHistory(prev => [...prev, {
          type: 'assistant',
          content: `📁 已选择工作目录：${result.path}\n\n现在您可以在此目录中进行文件操作了！`
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          type: 'assistant',
          content: '❌ 未选择目录'
        }]);
      }
    } catch (error: any) {
      console.error('选择目录错误:', error);
      setChatHistory(prev => [...prev, {
        type: 'assistant',
        content: '❌ 选择目录失败'
      }]);
    } finally {
      setIsSelectingFolder(false);
    }
  };

  return (
    <div className="container">
      <div className="browser">
        <div className="quick-links">
          {newsSites.map((site) => (
            <button
              key={site.name}
              className="quick-link-btn"
              onClick={() => loadSite(site.url)}
              title={site.url}
            >
              {site.name}
            </button>
          ))}
        </div>
        <div className="url-bar">
          <input
            type="text"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            placeholder="输入网址..."
            onKeyDown={handleUrlKeyPress}
          />
          <button onClick={() => loadSite(url)}>前往</button>
        </div>
        <webview 
          ref={webviewRef}
          id="browser"
          className="webview"
          src={url}
          partition="persist:browser"
          webpreferences="contextIsolation=false, nodeIntegration=false"
          allowpopups
        />
      </div>
      <div className="ai-panel">
        <h3>🤖 AI 浏览器助手</h3>
        <div className="chat-history">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.type}`}>
              <span className="message-label">
                {msg.type === 'user' ? '👤 您：' : '🤖 助手：'}
              </span>
              {msg.type === 'assistant' ? (
                <Streamdown className="message-content streamdown-content">
                  {msg.content || ''}
                </Streamdown>
              ) : (
                <span className="message-content">{msg.content}</span>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="query-input">
          <input
            type="text"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="输入命令或问题..."
            onKeyDown={handleKeyPress}
            disabled={loading || isRecording}
          />
          <button
            onClick={selectFolder}
            className={`folder-btn ${workingDirectory ? 'selected' : ''}`}
            disabled={isSelectingFolder}
            title={workingDirectory ? `工作目录: ${workingDirectory}` : '选择工作目录'}
          >
            {isSelectingFolder ? '⏳' : workingDirectory ? '📁 ✓' : '📁'}
          </button>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            disabled={loading}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          <button onClick={sendQuery} disabled={loading || !query.trim()}>
            {loading ? '🔄 处理中...' : '▶️ 发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
