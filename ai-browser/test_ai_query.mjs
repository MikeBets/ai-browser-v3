import CDP from 'chrome-remote-interface';

async function testAIQuery() {
  try {
    // Connect to the AI Browser page (not DevTools)
    const targets = await CDP.List({ port: 9222 });
    const aiTarget = targets.find(t => t.title === 'AI Browser' && t.type === 'page');
    
    if (!aiTarget) {
      console.error('AI Browser page not found');
      return;
    }
    
    const client = await CDP({ target: aiTarget.id, port: 9222 });
    const { Runtime } = client;
    
    await client.Runtime.enable();
    
    // Type and send query
    const result = await Runtime.evaluate({
      expression: `
        (async () => {
          const input = document.querySelector('textarea[placeholder="输入命令或问题..."]');
          if (!input) return 'Input not found';
          
          // Type the query
          input.value = '打开 https://news.google.com 并总结今天的头条新闻';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Wait a bit and click send
          await new Promise(r => setTimeout(r, 100));
          
          const sendBtn = document.querySelector('button[type="submit"]');
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
            return 'Query sent successfully';
          } else {
            return 'Send button not available';
          }
        })()
      `,
      awaitPromise: true
    });
    
    console.log('Result:', result.result.value);
    
    // Wait to see response
    await new Promise(r => setTimeout(r, 5000));
    
    // Check for AI response
    const response = await Runtime.evaluate({
      expression: `
        const messages = document.querySelectorAll('.message-content');
        messages.length > 1 ? messages[messages.length - 1].textContent : 'No response yet'
      `
    });
    
    console.log('AI Response:', response.result.value);
    
    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

testAIQuery();
