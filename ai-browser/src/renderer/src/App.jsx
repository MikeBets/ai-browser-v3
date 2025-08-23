import { useState, useEffect, useRef } from 'react';
import './style.css';

function App() {
  const [url, setUrl] = useState('https://www.google.com');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('💬 准备好帮助您浏览网页了！');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { type: 'assistant', content: '💬 准备好帮助您浏览网页了！' }
  ]);
  const webviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);

  // 热门网站
  const newsSites = [
    { name: '谷歌', url: 'https://www.google.com' },
    { name: '百度', url: 'https://www.baidu.com' },
    { name: '知乎', url: 'https://www.zhihu.com' },
    { name: '微博', url: 'https://weibo.com' },
    { name: '腾讯新闻', url: 'https://news.qq.com' },
    { name: '网易新闻', url: 'https://news.163.com' },
    { name: '新浪新闻', url: 'https://news.sina.com.cn' },
    { name: '抖音', url: 'https://www.douyin.com' }
  ];

  // Initialize webview when component mounts
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleReady = () => {
      console.log('Webview 已准备就绪');
    };

    const handleStartLoading = () => {
      setResponse('⏳ 加载中...');
    };

    const handleStopLoading = () => {
      setResponse(`✅ 已加载: ${webview.getTitle()}`);
    };

    const handleFailLoad = (e) => {
      console.error('加载失败:', e);
      setResponse(`❌ 页面加载失败`);
    };

    const handleNewWindow = (e) => {
      e.preventDefault();
      loadSite(e.url);
    };

    // Set up webview event listeners
    webview.addEventListener('dom-ready', handleReady);
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('new-window', handleNewWindow);

    // Cleanup
    return () => {
      webview.removeEventListener('dom-ready', handleReady);
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('new-window', handleNewWindow);
    };
  }, []);

  // Navigate to a website
  const loadSite = (siteUrl) => {
    setUrl(siteUrl);
    const webview = webviewRef.current;
    if (webview) {
      webview.src = siteUrl;
    }
  };

  // Get page content from webview
  const getPageContent = async () => {
    const webview = webviewRef.current;
    if (!webview) return '';
    
    try {
      const content = await webview.executeJavaScript(`
        document.body ? document.body.innerText.substring(0, 2000) : ''
      `);
      return content;
    } catch (error) {
      console.error('Failed to get page content:', error);
      return '';
    }
  };

  // 自动滚动到聊天历史底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // 开始录音（使用Web Speech API）
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'zh-CN'; // 设置为中文
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setQuery('');
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setQuery(transcript);
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      setIsRecording(false);
      if (event.error === 'no-speech') {
        alert('未检测到语音，请重试');
      } else if (event.error === 'not-allowed') {
        alert('请允许使用麦克风');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      // 如果有识别结果，自动发送
      if (query.trim()) {
        sendQuery();
      }
    };

    mediaRecorderRef.current = recognition;
    recognition.start();
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 发送AI查询
  const sendQuery = async () => {
    if (!query.trim()) return;
    
    // 添加用户消息到历史
    const userMessage = { type: 'user', content: query };
    setChatHistory(prev => [...prev, userMessage]);
    
    setLoading(true);
    setResponse('🔄 处理中...');
    
    try {
      const pageContent = await getPageContent();
      const currentUrl = webviewRef.current?.src || url;
      const result = await window.api.sendQuery(query, pageContent, currentUrl);
      
      // Parse AI response
      let aiResponse;
      try {
        aiResponse = JSON.parse(result);
      } catch {
        aiResponse = { action: 'answer', content: result };
      }
      
      // 处理不同的AI动作
      let assistantResponse = '';
      switch (aiResponse.action) {
        case 'navigate':
          if (aiResponse.url) {
            assistantResponse = `📍 正在导航到 ${aiResponse.url}...`;
            setResponse(assistantResponse);
            loadSite(aiResponse.url);
          }
          break;
          
        case 'search':
          if (aiResponse.query) {
            const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(aiResponse.query)}`;
            assistantResponse = `🔍 正在搜索: ${aiResponse.query}...`;
            setResponse(assistantResponse);
            loadSite(searchUrl);
          }
          break;
          
        case 'summarize':
        case 'extract':
        case 'answer':
          assistantResponse = aiResponse.content || '暂无响应';
          setResponse(assistantResponse);
          break;
          
        default:
          assistantResponse = aiResponse.content || JSON.stringify(aiResponse);
          setResponse(assistantResponse);
      }
      
      // 添加助手响应到历史
      if (assistantResponse) {
        setChatHistory(prev => [...prev, { type: 'assistant', content: assistantResponse }]);
      }
      
      // Clear query after successful execution
      setQuery('');
      
    } catch (error) {
      setResponse('❌ 错误：命令处理失败');
      console.error('查询错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      sendQuery();
    }
  };

  const handleUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      loadSite(url);
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
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入网址..."
            onKeyDown={handleUrlKeyPress}
          />
          <button onClick={() => loadSite(url)}>
            前往
          </button>
        </div>
        <webview 
          ref={webviewRef}
          id="browser"
          className="webview"
          src={url}
          partition="persist:browser"
          webpreferences="contextIsolation=false, nodeIntegration=false"
          allowpopups="true"
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
              <span className="message-content">{msg.content}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="query-input">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入命令或问题..."
            onKeyDown={handleKeyPress}
            disabled={loading || isRecording}
          />
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