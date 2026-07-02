const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
// 探测雷达暗号
app.get('/', (req, res) => {
    res.send('<h1>🔮 命运齿轮已转动！云端服务器更新成功！</h1>');
});

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
要求：简单直接、用通俗易懂的大白话解释核心含义。`;

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
用户的问题是：【${question}】。抽出的三张牌：【${cardsInfo}】。
请提供一份最终的综合占卜报告（约200-300字）。
要求：一针见血地点出核心脉络，给出实用的最终建议，分段输出。`;

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✨ 守护者服务器已启动在云端端口 ${PORT}...`);
});
