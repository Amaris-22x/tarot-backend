const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ 核心变化看这里：不再直接写 sk-... 密钥了！
// 而是告诉代码：去 Render 云端的保险箱里找一个叫 DEEPSEEK_API_KEY 的东西
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com', 
    apiKey: process.env.DEEPSEEK_API_KEY 
});

// ================= 接口 1：单张牌解析 =================
app.post('/api/tarot', async (req, res) => {
    const { question, cardName, position, isReversed } = req.body;
    const state = isReversed ? "逆位" : "正位";

    const systemPrompt = `你现在是一位专业、真诚的塔罗牌占卜师。
用户的问题是：【${question}】。
用户在【${position}】位置抽到了【${cardName} (${state})】。
请给出约100字的单张牌解析。
要求：
1. 简单直接、用通俗易懂的大白话解释这张牌（包括正逆位）的核心含义，让普通人一眼就能看懂。
2. 结合用户的问题，给出最实在的说明。
3. 语气保持温和专业，绝对不要过度使用晦涩的诗意或魔幻词汇。直接开始解析。`;

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: systemPrompt }],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error(error);
        res.write(`data: ${JSON.stringify({ text: '\n(连接中断，请稍后再试...)' })}\n\n`);
        res.end();
    }
});

// ================= 接口 2：最终全局总结 =================
app.post('/api/tarot/summary', async (req, res) => {
    const { question, cards } = req.body;
    const cardsInfo = cards.map(c => `${c.position}：${c.name} (${c.state})`).join('，');

    const systemPrompt = `你是一位经验丰富的塔罗占卜师。
用户的问题是：【${question}】。
用户抽出的三张牌分别是：【${cardsInfo}】。
请根据这三张牌的逻辑发展（过去-现在-未来），为用户提供一份最终的综合占卜报告（约200-300字）。
要求：
1. 一针见血地点出这三张牌组合的核心脉络和最终走向。
2. 针对用户的问题，给出明确、实用的最终建议。
3. 直接开始正文，分段输出，无需客套。`;

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: systemPrompt }],
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error(error);
        res.write(`data: ${JSON.stringify({ text: '\n(连接中断，无法生成总结...)' })}\n\n`);
        res.end();
    }
});

// ⚠️ 核心变化 2：让云平台自动分配端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✨ 守护者服务器已启动在云端端口 ${PORT}...`);
});
