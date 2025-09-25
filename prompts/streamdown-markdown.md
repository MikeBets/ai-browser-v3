你好，我们想对于渲染的messages使用streamdown来渲染markdown，麻烦您看一看能不能帮我做到。
Vercel
/
Streamdown
npx ai-elements@latest add response

Streamdown
A drop-in replacement for react-markdown, designed for AI-powered streaming.

npx ai-elements@latest add response

or install it directly with npm i streamdown

Overview
Formatting Markdown is easy, but when you tokenize and stream it, new challenges arise.

With AI Elements, we wanted a way to stream safe and perfectly formatted Markdown without having to worry about the details.

So we built Streamdown, a drop-in replacement for react-markdown, designed for AI-powered streaming.

It powers the AI Elements Response component, but you can install it as a standalone package if you want.

AI Elements
Streamdown
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Response } from '@/components/ai-elements/response';

export default function Page() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState('');

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.parts.filter(part => part.type === 'text').map((part, index) => (
            <Response key={index}>{part.text}</Response>
          ))}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== 'ready'}>
          Submit
        </button>
      </form>
    </>
  );
}

/*
 * Update your Tailwind globals.css to include the 
 * following code. This will ensure that the
 * Streamdown styles are applied to your project.
 * 
 * Make sure the path matches the location of the
 * node_modules folder in your project i.e.
 * @source "<path-to-node_modules>/node_modules/streamdown/dist/index.js";
 */

@source "../node_modules/streamdown/dist/index.js";

Built-in typography styles
Streamdown comes with built-in Tailwind classes for common Markdown components — headings, lists, code blocks, and more.

With react-markdown
AI Models Overview
Modern AI models have revolutionized how we interact with technology. From language models to computer vision, these systems demonstrate remarkable capabilities.

Key Features
Benefits
Natural language understanding
Multi-modal processing
Real-time inference
Requirements
GPU acceleration
Model weights
API access
Architecture
Model Architecture

Insights
"The development of full artificial intelligence could spell the end of the human race." — Stephen Hawking

Learn more about AI safety and transformer architectures.

With Streamdown
AI Models Overview
Modern AI models have revolutionized how we interact with technology. From language models to computer vision, these systems demonstrate remarkable capabilities.

Key Features
Benefits
Natural language understanding
Multi-modal processing
Real-time inference
Requirements
GPU acceleration
Model weights
API access
Architecture
Model Architecture

Insights
"The development of full artificial intelligence could spell the end of the human race." — Stephen Hawking

Learn more about AI safety and transformer architectures.

Reset
GitHub Flavored Markdown
Streamdown supports GitHub Flavored Markdown (GFM) out of the box, so you get things like task lists, tables, and more.

With react-markdown
GitHub Flavored Markdown Features
GFM extends standard Markdown with powerful features. Here's a comprehensive demo:

Tables
| Feature | Standard MD | GFM | |---------|------------|-----| | Tables | ❌ | ✅ | | Task Lists | ❌ | ✅ | | Strikethrough | ❌ | ✅ |

Task Lists
[x] Implement authentication
[x] Add database models
[ ] Write unit tests
[ ] Deploy to production
Strikethrough
~~Old approach~~ → New approach with AI models

With Streamdown
GitHub Flavored Markdown Features
GFM extends standard Markdown with powerful features. Here's a comprehensive demo:

Tables


Feature	Standard MD	GFM
Tables	❌	✅
Task Lists	❌	✅
Strikethrough	❌	✅
Task Lists
 Implement authentication
 Add database models
 Write unit tests
 Deploy to production
Strikethrough
Old approach → New approach with AI models

Reset
Beautiful, interactive code blocks
Streamdown uses Shiki to highlight code blocks, and comes with a copy button so you can easily copy the code. Hover to reveal the copy button!

With react-markdown
import React from "react";

type ButtonProps = {
  label: string;
  onClick: () => void;
};

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button
    type="button"
    className="button"
    onClick={onClick}
    aria-label={label}
  >
    {label}
  </button>
);
With Streamdown
tsx


import React from "react";

type ButtonProps = {
  label: string;
  onClick: () => void;
};

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
  <button
    type="button"
    className="button"
    onClick={onClick}
    aria-label={label}
  >
    {label}
  </button>
);
Reset
Mathematical Expressions
Streamdown supports LaTeX math expressions through remark-math and KaTeX, enabling beautiful mathematical notation in your markdown.

With react-markdown
Inline Math
The quadratic formula is $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$ for solving $$ax^2 + bx + c = 0$$.

Euler's identity: $$e^{i\pi} + 1 = 0$$ combines five fundamental mathematical constants.

Block Math
The normal distribution probability density function:

$$ f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2} $$

Summations and Integrals
The sum of the first $$n$$ natural numbers: $$\sum_{i=1}^{n} i

With Streamdown
Inline Math
The quadratic formula is 
x
=
−
b
±
b
2
−
4
a
c
2
a
x= 
2a
−b± 
b 
2
 −4ac
​
 
​
  for solving 
a
x
2
+
b
x
+
c
=
0
ax 
2
 +bx+c=0.

Euler's identity: 
e
i
π
+
1
=
0
e 
iπ
 +1=0 combines five fundamental mathematical constants.

Block Math
The normal distribution probability density function:

f
(
x
)
=
1
σ
2
π
e
−
1
2
(
x
−
μ
σ
)
2
f(x)= 
σ 
2π
​
 
1
​
 e 
− 
2
1
​
 ( 
σ
x−μ
​
 ) 
2
 
 
Summations and Integrals
The sum of the first 
n
n natural numbers: 
∑
i
=
1
n
i
∑ 
i=1
n
​
 i

Interactive Mermaid Diagrams
Streamdown supports Mermaid diagrams with customizable themes. Current theme is "base".

With react-markdown
Interactive diagram rendering with manual control. Click the copy icon next to any Mermaid diagram to copy the code to your clipboard.

Simple Flowchart
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Success]
    B -->|No| D[Try Again]
    D --> B
    C --> E[End]
Process Flow
flowchart LR
    A[User Input] --> B[Validate]
    B --> C{Valid?}
    C -->|Yes| D[Process]
    C -->|No| E[Show Error]
    D --> F[Save 
With Streamdown
Interactive diagram rendering with manual control. Click the copy icon next to any Mermaid diagram to copy the code to your clipboard.

Simple Flowchart


Yes

No

Start

Decision

Success

Try Again

End

Process Flow


Yes

No

User Input

Validate

Valid?

Process

Show Error

Style unterminated Markdown blocks
Streamdown comes with built-in support for parsing unterminated Markdown blocks (# headings, `inline code`, **bold**, _italic_, [links]() and more), which makes streaming Markdown content much prettier.

With react-markdown
This is a very long bold text that keeps going and going without a clear end, so you can see how unterminated bold blocks are handled by the renderer.

*Here is an equally lengthy italicized sentence that stretches on and on, never quite reaching a conclusion, so you can observe how unterminated italic blocks

With Streamdown
This is a very long bold text that keeps going and going without a clear end, so you can see how unterminated bold blocks are handled by the renderer.

Here is an equally lengthy italicized sentence that stretches on and on, never quite reaching a conclusion, so you can observe how unterminated italic blocks

Built-in security hardening
Streamdown ensures that untrusted markdown does not contain images from and links to unexpected origins which might have been subject to prompt injection.

With react-markdown
Here are some links to potentially malicious sites (please don't actually click them):

Click here for a free iPhone
Get rich quick!
Download suspicious file
Fake login page
With Streamdown
Here are some links to potentially malicious sites (please don't actually click them):

Click here for a free iPhone [blocked]
Get rich quick! [blocked]
Download suspicious file [blocked]
Fake login [blocked]
Reset
Props
StreamdownProps extends the react-markdown component props with additional properties for streaming and security features.

All props are optional and have sensible defaults for typical use cases.

children
string
The markdown content to render. Can be a string of markdown or React nodes.

parseIncompleteMarkdown
boolean
Whether to parse and fix incomplete markdown syntax (e.g., unclosed code blocks or lists).

Default: true

className
string
CSS class names to apply to the wrapper div element.

components
object
Custom React components to use for rendering markdown elements (e.g., custom heading, paragraph, code block components).

allowedImagePrefixes
string[]
Array of allowed URL prefixes for images. Use ["*"] to allow all images.

Default: ["*"]

allowedLinkPrefixes
string[]
Array of allowed URL prefixes for links. Use ["*"] to allow all links.

Default: ["*"]

defaultOrigin
string
Default origin to use for relative URLs in links and images.

rehypePlugins
array
Array of rehype plugins to use for processing HTML. Includes KaTeX for math rendering by default.

Default: [rehypeKatex]

remarkPlugins
array
Array of remark plugins to use for processing markdown. Includes GitHub Flavored Markdown and math support by default.

Default: [remarkGfm, remarkMath]

shikiTheme
[BundledTheme, BundledTheme] (from Shiki)
The themes to use for code blocks. Defaults to ["github-light", "github-dark"].

Default: ["github-light", "github-dark"]

mermaidConfig
MermaidConfig (from Mermaid)
Custom configuration for Mermaid diagrams including theme, colors, fonts, and other rendering options. See Mermaid documentation for all available options.

controls
boolean | { table?: boolean, code?: boolean, mermaid?: boolean }
Control the visibility of copy and download buttons. Can be a boolean to show/hide all controls, or an object to selectively control buttons for tables, code blocks, and Mermaid diagrams.

Default: true

Upgrade your AI-powered streaming
Try Streamdown today and take your AI-powered streaming to the next level.

npx ai-elements@latest add response

FAQ
Common questions about Streamdown and how it works with AI-powered streaming applications.

What makes Streamdown different from react-markdown?
Can I use custom components with Streamdown?
How does the incomplete markdown parsing work?
Is Streamdown compatible with all react-markdown plugins?

Why do I get a Package shiki can't be external warning?
Why do I get a CSS loading error when using Streamdown with Vite SSR?
How do I configure Tailwind CSS to work with Streamdown?
Made with 🖤 and 🤖 by Vercel. View the source code.

