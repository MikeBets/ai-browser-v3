const CDP = require('chrome-remote-interface');

async function testAIQuery() {
  try {
    const client = await CDP({ port: 9222 });
    const { Runtime } = client;
    
    await client.Runtime.enable();
    
    // Execute JavaScript in the AI Browser page
    const result = await Runtime.evaluate({
      expression: `
        // Type in the chat input
        const input = document.querySelector('textarea[placeholder="输入命令或问题..."]');
        if (input) {
          input.value = '打开 Google News 并总结今天的头条新闻';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Click send button
          setTimeout(() => {
            const sendBtn = document.querySelector('button[type="submit"]');
            if (sendBtn && !sendBtn.disabled) {
              sendBtn.click();
              console.log('Query sent');
            }
          }, 100);
          
          'Query typed';
        } else {
          'Input not found';
        }
      `
    });
    
    console.log('Result:', result.result.value);
    
    await client.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

testAIQuery();
