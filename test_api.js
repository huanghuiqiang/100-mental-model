// import the Genkit and Google AI plugin libraries
import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// 设置全局 fetch (如果需要)
global.fetch = fetch;

// 获取 API 密钥
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("请设置 OPENROUTER_API_KEY 环境变量");
  process.exit(1);
}

console.log("API KEY 长度:", API_KEY.length);
console.log("API KEY 前几个字符:", API_KEY.substring(0, 5) + "...");

// 设置代理（如果需要）
const PROXY_URL = process.env.HTTPS_PROXY || 'http://127.0.0.1:7897'; // 使用您之前成功的代理端口
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

// 您的网站信息（可选）
const SITE_URL = 'https://yoursite.com'; // 替换为您的网站 URL
const SITE_NAME = 'Your Site Name'; // 替换为您的网站名称

// 测试代理连接
async function testProxy() {
  try {
    console.log("正在测试代理连接...");
    console.log("代理地址:", PROXY_URL);
    
    // 尝试通过代理访问 Google
    const response = await fetch('https://www.google.com', {
      agent: proxyAgent,
      timeout: 5000 // 5秒超时
    });
    
    if (response.ok) {
      console.log("代理连接测试成功！状态码:", response.status);
      return true;
    } else {
      console.error("代理连接测试失败！状态码:", response.status);
      return false;
    }
  } catch (error) {
    console.error("代理连接测试出错:", error.message);
    return false;
  }
}

// 使用 OpenRouter API 生成文本
async function generateWithOpenRouter(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku', // 使用 Anthropic 的模型，通常没有严格的区域限制
      // 或者尝试 'google/gemini-pro'
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
    }),
    agent: proxyAgent
  });
  
  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // 添加调试信息
  console.log("API 响应数据结构:", JSON.stringify(data, null, 2));
  
  // 检查响应格式并安全地提取内容
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  } else if (data.error) {
    throw new Error(`API 错误: ${data.error.message || JSON.stringify(data.error)}`);
  } else {
    console.log("完整响应:", data);
    throw new Error("无法从响应中提取内容，响应格式可能已更改");
  }
}

// 测试函数
async function testAPI() {
  // 先测试代理
  const proxyWorks = await testProxy();
  if (!proxyWorks) {
    console.log("代理测试失败，API 测试可能也会失败");
  }
  
  try {
    console.log("正在测试 OpenRouter API...");
    console.log("使用代理:", PROXY_URL);
    const text = await generateWithOpenRouter('你好，请用中文回答：今天天气怎么样？');
    console.log("API 响应成功:");
    console.log(text);
    return true;
  } catch (error) {
    console.error("API 测试失败:", error);
    return false;
  }
}

// 执行测试
testAPI().then(success => {
  if (success) {
    console.log("API 测试成功！");
  } else {
    console.log("API 测试失败！");
    console.log("请检查 OpenRouter API 密钥和代理设置是否正确。");
  }
});