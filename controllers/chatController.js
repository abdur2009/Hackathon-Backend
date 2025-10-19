import Chat from '../models/Chat.js';
import OpenAI from 'openai';
import HealthReport from '../models/HealthReport.js';

const generateOpenAIResponse = async (messages) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Convert messages to OpenAI format
  const openaiMessages = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are HealthMate AI, a helpful health assistant. Provide accurate, helpful, and professional health advice. Always remind users to consult with healthcare professionals for serious medical concerns. Be friendly, informative, and supportive."
      },
      ...openaiMessages
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
};

const createChat = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.userId;

    const chat = new Chat({
      userId,
      title: title || 'New Chat',
      messages: []
    });

    await chat.save();

    res.status(201).json({
      message: 'Chat created successfully',
      chat: {
        id: chat._id,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    console.log('Get chats request:', { userId, page, limit });

    // For debugging: show all chats (including inactive ones)
    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('title messages createdAt updatedAt isActive')
      .lean();

    const total = await Chat.countDocuments({ userId, isActive: true });

    console.log('Found chats:', chats.length, 'Total:', total);

    res.json({
      chats,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findOne({ _id: chatId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    // Find the chat
    const chat = await Chat.findOne({ _id: chatId, userId, isActive: true });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    chat.messages.push(userMessage);

    // Generate AI response
    let aiResponse = '';
    try {
      aiResponse = await generateOpenAIResponse(chat.messages);
    } catch (error) {
      console.error('OpenAI API error:', error);
      aiResponse = 'I apologize, but I cannot process your request at the moment. Please try again later.';
    }

    // Add AI response
    const aiMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    };
    chat.messages.push(aiMessage);

    await chat.save();

    res.json({
      message: 'Message sent successfully',
      userMessage,
      aiMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;
    const { title } = req.body;

    console.log('Update chat request:', { chatId, userId, title });

    // Validate chatId
    if (!chatId || chatId === 'undefined') {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    // Validate ObjectId format
    if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid chat ID format:', chatId);
      return res.status(400).json({ error: 'Invalid chat ID format' });
    }

    // Validate title
    if (!title || title.trim().length === 0) {
      console.log('Empty title provided');
      return res.status(400).json({ error: 'Chat title is required' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId, isActive: true },
      { title: title.trim() },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    console.log('Chat updated successfully:', chatId);
    res.json({ message: 'Chat updated successfully', chat });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    console.log('Delete chat request:', { chatId, userId });

    // Validate chatId
    if (!chatId || chatId === 'undefined') {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    // Validate ObjectId format
    if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid chat ID format' });
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { isActive: false },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    console.log('Chat deleted successfully:', chatId);
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const analyzeReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.userId;

    // Get the report
    const report = await HealthReport.findOne({ _id: reportId, userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Generate analysis using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
    Please analyze this medical report and provide:
    1. A comprehensive summary in English
    2. A summary in Urdu (اردو میں)
    3. Key findings and important values
    4. Any concerns or recommendations
    
    Report Type: ${report.reportType}
    Report Date: ${report.reportDate}
    Extracted Text: ${report.extractedText || 'No text extracted'}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant. Analyze medical reports professionally and provide clear, helpful summaries. Always remind users to consult healthcare professionals for medical decisions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const analysis = completion.choices[0].message.content;

    // Parse the response (this is a simplified version)
    const summary = analysis.split('Summary:')[1]?.split('Key Findings:')[0]?.trim() || analysis;
    const keyFindings = analysis.split('Key Findings:')[1]?.split('Recommendations:')[0]?.trim() || {};

    // Update the report with analysis
    report.aiSummary = summary;
    report.keyFindings = { analysis, keyFindings };

    await report.save();

    res.json({
      message: 'Report analyzed successfully',
      analysis: {
        summary,
        keyFindings
      }
    });
  } catch (error) {
    console.error('Analyze report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  createChat,
  getChats,
  getChat,
  sendMessage,
  updateChat,
  deleteChat,
  analyzeReport
};
