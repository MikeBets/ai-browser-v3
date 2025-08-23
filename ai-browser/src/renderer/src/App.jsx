import { useState, useEffect } from 'react';
import './style.css';

function App() {
  const [url, setUrl] = useState('https://www.cnn.com');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Popular US news sites
  const newsSites = [
    { name: 'CNN', url: 'https://www.cnn.com' },
    { name: 'Fox News', url: 'https://www.foxnews.com' },
    { name: 'BBC', url: 'https://www.bbc.com/news' },
    { name: 'Reuters', url: 'https://www.reuters.com' },
    { name: 'AP News', url: 'https://apnews.com' },
    { name: 'NPR', url: 'https://www.npr.org' },
    { name: 'NY Times', url: 'https://www.nytimes.com' },
    { name: 'WSJ', url: 'https://www.wsj.com' },
    { name: 'Bloomberg', url: 'https://www.bloomberg.com' },
    { name: 'USA Today', url: 'https://www.usatoday.com' }
  ];

  // Get webpage content
  useEffect(() => {
    const webview = document.getElementById('browser');
    if (webview) {
      webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript('document.body.innerText').then(text => {
          setPageContent(text);
        }).catch(err => console.error('Failed to get page content:', err));
      });
    }
  }, []);

  // Send AI query
  const sendQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const result = await window.api.sendQuery(query, pageContent);
      setResponse(result);
    } catch (error) {
      setResponse('Error: Failed to get AI response');
      console.error('Query error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendQuery();
    }
  };

  const loadSite = (siteUrl) => {
    setUrl(siteUrl);
    const webview = document.getElementById('browser');
    if (webview) webview.src = siteUrl;
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
            placeholder="输入网页 URL"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const webview = document.getElementById('browser');
                if (webview) webview.src = e.target.value;
              }
            }}
          />
          <button onClick={() => {
            const webview = document.getElementById('browser');
            if (webview) webview.src = url;
          }}>Go</button>
        </div>
        <webview id="browser" src={url} />
      </div>
      <div className="ai-panel">
        <h3>AI Assistant</h3>
        <div className="query-input">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="问 AI 问题..."
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button onClick={sendQuery} disabled={loading || !query.trim()}>
            {loading ? '处理中...' : '发送'}
          </button>
        </div>
        <div className="response">
          {response || 'AI 响应会显示在这里'}
        </div>
      </div>
    </div>
  );
}

export default App;