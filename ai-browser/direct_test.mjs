import CDP from 'chrome-remote-interface';

async function directTest() {
  try {
    const targets = await CDP.List({ port: 9222 });
    const aiTarget = targets.find(t => t.title === 'AI Browser' && t.type === 'page');
    
    if (!aiTarget) {
      console.error('AI Browser page not found');
      return;
    }
    
    const client = await CDP({ target: aiTarget.id, port: 9222 });
    const { Runtime, Console } = client;
    
    await Runtime.enable();
    await Console.enable();
    
    // Listen for console messages
    Console.messageAdded((params) => {
      console.log('Console:', params.message.text);
    });
    
    // Test if window.api exists and call it
    const result = await Runtime.evaluate({
      expression: `
        (async () => {
          if (!window.api) return 'window.api not found';
          if (!window.api.sendQuery) return 'sendQuery not found';
          
          try {
            console.log('Calling sendQuery...');
            const response = await window.api.sendQuery('打开 Google News 并总结今天的头条新闻');
            console.log('Got response:', response);
            return response;
          } catch (error) {
            console.error('Query error:', error);
            return { error: error.message };
          }
        })()
      `,
      awaitPromise: true
    });
    
    console.log('Query result:', JSON.stringify(result.result.value, null, 2));
    
    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

directTest();
