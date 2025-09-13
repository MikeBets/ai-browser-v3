// Test the AI backend directly
console.log('Testing AI backend with Google News query...');

// Create a test script that calls the AI query
const testQuery = async () => {
  try {
    const response = await fetch('http://localhost:5173/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '打开 https://news.google.com 并总结今天的头条新闻'
      })
    });
    
    const result = await response.text();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error calling API:', error.message);
  }
};

// Also test if the backend is exposing any endpoints
fetch('http://localhost:5173/')
  .then(r => r.text())
  .then(html => {
    console.log('Frontend loaded successfully');
    testQuery();
  })
  .catch(e => console.error('Frontend error:', e.message));
