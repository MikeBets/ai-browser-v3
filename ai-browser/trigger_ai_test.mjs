import { ipcRenderer } from 'electron';

// Since we can't directly access ipcRenderer from outside, let's simulate the query
console.log('Creating test for AI query...');

// Write a test that will be executed in the renderer context
const testCode = `
const testAI = async () => {
  if (window.api && window.api.sendQuery) {
    console.log('Sending test query...');
    try {
      const response = await window.api.sendQuery('打开 Google News 并总结今天的头条新闻');
      console.log('AI Response:', response);
      
      // Display in chat
      const messagesDiv = document.querySelector('.messages');
      if (messagesDiv) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant';
        msgDiv.innerHTML = '<div class="message-content"><strong>🤖 AI:</strong> ' + response.content + '</div>';
        messagesDiv.appendChild(msgDiv);
      }
      
      return response;
    } catch (error) {
      console.error('Error:', error);
      return { error: error.message };
    }
  } else {
    return 'API not available';
  }
};

testAI().then(r => console.log('Test completed:', r));
`;

console.log(testCode);
