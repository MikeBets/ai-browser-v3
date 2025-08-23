import { useState, useEffect } from 'react';
import './style.css';

function App() {
  const [url, setUrl] = useState('https://www.cnn.com');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [browserState, setBrowserState] = useState({
    url: '',
    title: '',
    content: '',
    screenshot: null
  });

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

  // Load initial page
  useEffect(() => {
    loadSite(url);
  }, []);

  // Navigate to a website
  const loadSite = async (siteUrl) => {
    setUrl(siteUrl);
    setLoading(true);
    try {
      const result = await window.api.navigateBrowser(siteUrl);
      if (result.success) {
        setBrowserState({
          url: result.url,
          title: result.title,
          content: result.content,
          screenshot: result.screenshot
        });
        setResponse(`✅ Loaded: ${result.title}`);
      } else {
        setResponse(`❌ Failed to load: ${result.error}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      setResponse(`❌ Error loading page`);
    } finally {
      setLoading(false);
    }
  };

  // Send AI query and handle agent commands
  const sendQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResponse('🔄 Processing...');
    
    try {
      const result = await window.api.sendQuery(query, browserState.content, browserState.url);
      
      // Parse AI response
      let aiResponse;
      try {
        aiResponse = JSON.parse(result);
      } catch {
        aiResponse = { action: 'answer', content: result };
      }
      
      // Handle different agent actions
      switch (aiResponse.action) {
        case 'navigate':
          if (aiResponse.url) {
            setResponse(`📍 Navigating to ${aiResponse.url}...`);
            await loadSite(aiResponse.url);
          }
          break;
          
        case 'search':
          if (aiResponse.query) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(aiResponse.query)}`;
            setResponse(`🔍 Searching for: ${aiResponse.query}...`);
            await loadSite(searchUrl);
          }
          break;
          
        case 'summarize':
        case 'extract':
        case 'answer':
          setResponse(aiResponse.content || 'No response available');
          break;
          
        default:
          setResponse(aiResponse.content || JSON.stringify(aiResponse));
      }
      
      // Clear query after successful execution
      setQuery('');
      
    } catch (error) {
      setResponse('❌ Error: Failed to process command');
      console.error('Query error:', error);
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
    if (e.key === 'Enter' && !loading) {
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
              disabled={loading}
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
            placeholder="Enter URL..."
            onKeyPress={handleUrlKeyPress}
            disabled={loading}
          />
          <button onClick={() => loadSite(url)} disabled={loading}>
            {loading ? '⏳' : '▶️'} Go
          </button>
        </div>
        <div className="browser-view">
          {browserState.screenshot ? (
            <img 
              src={browserState.screenshot} 
              alt="Browser view"
              style={{ width: '100%', height: 'auto' }}
            />
          ) : (
            <div className="browser-placeholder">
              <h2>{browserState.title || 'No page loaded'}</h2>
              <p>{browserState.url || 'Enter a URL above or use AI commands'}</p>
              {browserState.content && (
                <div className="page-preview">
                  {browserState.content.substring(0, 500)}...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="ai-panel">
        <h3>🤖 AI Browser Agent</h3>
        <div className="ai-tips">
          <p>Try these commands:</p>
          <ul>
            <li>📍 "Go to CNN" - Navigate to websites</li>
            <li>🔍 "Search for AI news" - Search Google</li>
            <li>📝 "Summarize this page" - Get page summary</li>
            <li>❓ "What's on this page?" - Analyze content</li>
          </ul>
        </div>
        <div className="query-input">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or question..."
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button onClick={sendQuery} disabled={loading || !query.trim()}>
            {loading ? '🔄 Processing...' : '▶️ Send'}
          </button>
        </div>
        <div className="response">
          {response || '💬 Ready to help you browse the web!'}
        </div>
        {browserState.url && (
          <div className="browser-info">
            <small>📄 Current: {browserState.title || browserState.url}</small>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;