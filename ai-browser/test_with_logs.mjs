import CDP from 'chrome-remote-interface';

async function testWithLogs() {
  try {
    const targets = await CDP.List({ port: 9222 });
    const aiTarget = targets.find(t => t.title === 'AI Browser' && t.type === 'page');
    
    if (!aiTarget) {
      console.error('AI Browser not found');
      return;
    }
    
    console.log('Connecting to AI Browser...');
    const client = await CDP({ target: aiTarget.id, port: 9222 });
    const { Runtime } = client;
    
    await Runtime.enable();
    
    console.log('Sending AI query...');
    const result = await Runtime.evaluate({
      expression: `
        (async () => {
          if (!window.api || !window.api.sendQuery) {
            return 'API not available';
          }
          
          const query = '打开 https://news.google.com 并总结今天的头条新闻';
          console.log('Sending query:', query);
          
          try {
            const response = await window.api.sendQuery(query);
            console.log('Response received:', response);
            return response;
          } catch (error) {
            console.error('Error:', error);
            return { error: error.message };
          }
        })()
      `,
      awaitPromise: true
    });
    
    console.log('\n=== AI Response ===');
    console.log(JSON.stringify(result.result.value, null, 2));
    
    await client.close();
  } catch (err) {
    console.error('Test error:', err);
  }
}

testWithLogs();
