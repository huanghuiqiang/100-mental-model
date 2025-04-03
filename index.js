// 导入必要的库
import dotenv from 'dotenv';
dotenv.config(); // 加载 .env 文件中的环境变量

import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs/promises';
// 假设 data.js 导出了一个名为 data 的数组
import { data } from './data.js'; 

// 获取 API 密钥
const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("请设置 OPENROUTER_API_KEY 环境变量");
  process.exit(1);
}

// 调试 - 检查 API 密钥是否正确加载
console.log("API KEY 长度:", API_KEY ? API_KEY.length : 0);
console.log("API KEY 前几个字符:", API_KEY ? API_KEY.substring(0, 5) + "..." : "未设置");

// 设置代理
const PROXY_URL = process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

// 您的网站信息（可选）
const SITE_URL = 'https://yoursite.com'; // 替换为您的网站 URL
const SITE_NAME = 'Your Site Name'; // 替换为您的网站名称

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
      model: 'anthropic/claude-3-haiku', // 使用 Anthropic 的模型
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
  
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  } else if (data.error) {
    throw new Error(`API 错误: ${data.error.message || JSON.stringify(data.error)}`);
  } else {
    console.log("完整响应:", data);
    throw new Error("无法从响应中提取内容，响应格式可能已更改");
  }
}

// 判断文章是否与原则、定律相关
async function isAboutPrinciplesOrLaws(article) {
  try {
    const prompt = `
    请判断以下文章是否与原则、定律、法则、理论相关。
    只回答"是"或"否"。
    
    文章标题: ${article.title || '无标题'}
    文章内容: ${(article.content || '').substring(0, 1000)}...
    `;
    
    const result = await generateWithOpenRouter(prompt);
    const text = result.trim().toLowerCase();
    return text.includes('是');
  } catch (error) {
    console.error(`判断文章时出错: ${error.message}`);
    return false; // 出错时默认不包含
  }
}

// 将文章总结为中文
async function summarizeArticleInChinese(article) {
  try {
    const prompt = `
    请将以下文章总结为中文，保留关键信息和核心观点。
    总结应该清晰、简洁，约300-500字。
    
    文章标题: ${article.title || '无标题'}
    文章内容: ${article.content || ''}
    `;
    
    const result = await generateWithOpenRouter(prompt);
    
    return {
      title: article.title || '无标题',
      summary: result
    };
  } catch (error) {
    console.error(`总结文章时出错: ${error.message}`);
    return {
      title: article.title || '无标题',
      summary: '总结失败'
    };
  }
}

// 主函数
async function processArticles() {
  try {
    console.log(`开始处理 ${data.length} 篇文章...`);
    
    // 1. 过滤出与原则、定律相关的文章
    const relevantArticles = [];
    for (let i = 0; i < data.length; i++) {
      console.log(`正在判断第 ${i+1}/${data.length} 篇文章...`);
      const isRelevant = await isAboutPrinciplesOrLaws(data[i]);
      if (isRelevant) {
        relevantArticles.push(data[i]);
      }
    }
    
    console.log(`找到 ${relevantArticles.length} 篇相关文章`);
    
    // 2. 总结每篇相关文章
    const summaries = [];
    for (let i = 0; i < relevantArticles.length; i++) {
      console.log(`正在总结第 ${i+1}/${relevantArticles.length} 篇文章...`);
      const summary = await summarizeArticleInChinese(relevantArticles[i]);
      summaries.push(summary);
    }
    
    // 3. 拼接所有总结
    let finalArticle = "# 原则与定律汇总\n\n";
    summaries.forEach(summary => {
      finalArticle += `## ${summary.title}\n\n${summary.summary}\n\n---\n\n`;
    });
    
    // 4. 保存结果
    await fs.writeFile('principles_and_laws_summary.md', finalArticle, 'utf8');
    console.log('处理完成，结果已保存到 principles_and_laws_summary.md');
    
  } catch (error) {
    console.error(`处理文章时出错: ${error.message}`);
  }
}

// 执行主函数
processArticles();