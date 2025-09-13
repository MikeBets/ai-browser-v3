import CDP from 'chrome-remote-interface';

async function testAI() {
  try {
    await new Promise(r => setTimeout(r, 3000)); // Wait for app to stabilize
    
    const targets = await CDP.List({ port: 9222 });
    const aiTarget = targets.find(t => t.title === 'AI Browser' && t.type === 'page');
    
    if (!aiTarget) {
      console.error('AI Browser page not found');
      return;
    }
    
    const client = await CDP({ target: aiTarget.id, port: 9222 });
    const { Runtime } = client;
    
    await Runtime.enable();
    
    const result = await Runtime.evaluate({
      expression: `
        (async () => {
          if (!window.api || !window.api.sendQuery) {
            return 'API not available';
          }
          
          try {
            const response = await window.api.sendQuery('打开 Google News 并总结今天的头条新闻');
            return response;
          } catch (error) {
            return { error: error.message };
          }
        })()
      `,
      awaitPromise: true
    });
    
    console.log('AI Response:', JSON.stringify(result.result.value, null, 2));
    
    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAI();
