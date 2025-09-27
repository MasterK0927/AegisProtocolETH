export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  type: 'api' | 'mcp' | 'builtin';
  apiEndpoint?: string;
  requiredParams?: string[];
  documentation?: string;
  pricing?: string;
  rateLimit?: string;
}

export const realTools: ToolConfig[] = [
  // Web Scraping & Data Extraction
  {
    id: 'web-scraper',
    name: 'Web Scraper',
    description: 'Extract content from any website with advanced parsing',
    category: 'Data Extraction',
    icon: '🌐',
    type: 'api',
    apiEndpoint: 'https://api.scrapfly.io/scrape',
    requiredParams: ['url'],
    documentation: 'https://scrapfly.io/docs',
    pricing: 'Free tier: 1000 requests/month',
    rateLimit: '10 requests/second'
  },
  {
    id: 'pdf-extractor',
    name: 'PDF Text Extractor',
    description: 'Extract and parse text content from PDF documents',
    category: 'File Processing',
    icon: '📄',
    type: 'api',
    apiEndpoint: 'https://api.pdf.co/v1/pdf/convert/to/text',
    requiredParams: ['file_url'],
    documentation: 'https://apidocs.pdf.co',
    pricing: 'Free tier: 300 API calls/month'
  },
  {
    id: 'image-ocr',
    name: 'Image OCR',
    description: 'Extract text from images using optical character recognition',
    category: 'File Processing',
    icon: '🔍',
    type: 'api',
    apiEndpoint: 'https://api.ocr.space/parse/image',
    requiredParams: ['image_url'],
    documentation: 'https://ocr.space/ocrapi',
    pricing: 'Free tier: 25,000 requests/month'
  },

  // Search & Research
  {
    id: 'serp-api',
    name: 'Google Search API',
    description: 'Search Google and get structured results',
    category: 'Search',
    icon: '🔍',
    type: 'api',
    apiEndpoint: 'https://serpapi.com/search',
    requiredParams: ['q'],
    documentation: 'https://serpapi.com/search-api',
    pricing: 'Free tier: 100 searches/month'
  },
  {
    id: 'wikipedia-api',
    name: 'Wikipedia Search',
    description: 'Search and extract information from Wikipedia',
    category: 'Research',
    icon: '📚',
    type: 'api',
    apiEndpoint: 'https://en.wikipedia.org/api/rest_v1/page/summary',
    requiredParams: ['title'],
    documentation: 'https://www.mediawiki.org/wiki/API:REST_API',
    pricing: 'Free'
  },
  {
    id: 'news-api',
    name: 'News API',
    description: 'Get latest news articles from thousands of sources',
    category: 'Research',
    icon: '📰',
    type: 'api',
    apiEndpoint: 'https://newsapi.org/v2/everything',
    requiredParams: ['q'],
    documentation: 'https://newsapi.org/docs',
    pricing: 'Free tier: 1000 requests/month'
  },

  // Social Media & Communication
  {
    id: 'twitter-api',
    name: 'Twitter/X API',
    description: 'Post tweets, get user info, and analyze trends',
    category: 'Social Media',
    icon: '🐦',
    type: 'api',
    apiEndpoint: 'https://api.twitter.com/2',
    requiredParams: ['bearer_token'],
    documentation: 'https://developer.twitter.com/en/docs/twitter-api',
    pricing: 'Free tier: 1500 tweets/month'
  },
  {
    id: 'linkedin-api',
    name: 'LinkedIn API',
    description: 'Access LinkedIn profiles and company data',
    category: 'Professional Network',
    icon: '💼',
    type: 'api',
    apiEndpoint: 'https://api.linkedin.com/v2',
    requiredParams: ['access_token'],
    documentation: 'https://docs.microsoft.com/en-us/linkedin/',
    pricing: 'Free tier with limitations'
  },
  {
    id: 'discord-webhook',
    name: 'Discord Webhook',
    description: 'Send messages to Discord channels',
    category: 'Communication',
    icon: '💬',
    type: 'api',
    apiEndpoint: 'https://discord.com/api/webhooks',
    requiredParams: ['webhook_url'],
    documentation: 'https://discord.com/developers/docs/resources/webhook',
    pricing: 'Free'
  },
  {
    id: 'slack-api',
    name: 'Slack API',
    description: 'Send messages and interact with Slack workspaces',
    category: 'Communication',
    icon: '💬',
    type: 'api',
    apiEndpoint: 'https://slack.com/api',
    requiredParams: ['token'],
    documentation: 'https://api.slack.com/',
    pricing: 'Free tier available'
  },

  // Email & Marketing
  {
    id: 'sendgrid-api',
    name: 'SendGrid Email',
    description: 'Send transactional and marketing emails',
    category: 'Email',
    icon: '📧',
    type: 'api',
    apiEndpoint: 'https://api.sendgrid.com/v3/mail/send',
    requiredParams: ['api_key'],
    documentation: 'https://docs.sendgrid.com/api-reference',
    pricing: 'Free tier: 100 emails/day'
  },
  {
    id: 'mailchimp-api',
    name: 'Mailchimp API',
    description: 'Manage email campaigns and subscriber lists',
    category: 'Email Marketing',
    icon: '📮',
    type: 'api',
    apiEndpoint: 'https://us1.api.mailchimp.com/3.0',
    requiredParams: ['api_key'],
    documentation: 'https://mailchimp.com/developer/marketing/',
    pricing: 'Free tier: 2000 contacts'
  },

  // File Storage & Management
  {
    id: 'google-drive-api',
    name: 'Google Drive API',
    description: 'Upload, download, and manage files in Google Drive',
    category: 'File Storage',
    icon: '💾',
    type: 'api',
    apiEndpoint: 'https://www.googleapis.com/drive/v3',
    requiredParams: ['access_token'],
    documentation: 'https://developers.google.com/drive/api',
    pricing: 'Free tier: 15GB storage'
  },
  {
    id: 'dropbox-api',
    name: 'Dropbox API',
    description: 'Upload and manage files in Dropbox',
    category: 'File Storage',
    icon: '📦',
    type: 'api',
    apiEndpoint: 'https://api.dropboxapi.com/2',
    requiredParams: ['access_token'],
    documentation: 'https://www.dropbox.com/developers/documentation',
    pricing: 'Free tier: 2GB storage'
  },

  // Analytics & Tracking
  {
    id: 'google-analytics',
    name: 'Google Analytics API',
    description: 'Get website analytics and user behavior data',
    category: 'Analytics',
    icon: '📊',
    type: 'api',
    apiEndpoint: 'https://analyticsreporting.googleapis.com/v4',
    requiredParams: ['access_token'],
    documentation: 'https://developers.google.com/analytics/devguides/reporting',
    pricing: 'Free'
  },
  {
    id: 'mixpanel-api',
    name: 'Mixpanel API',
    description: 'Track events and analyze user behavior',
    category: 'Analytics',
    icon: '📈',
    type: 'api',
    apiEndpoint: 'https://api.mixpanel.com',
    requiredParams: ['token'],
    documentation: 'https://developer.mixpanel.com/reference',
    pricing: 'Free tier: 100K events/month'
  },

  // Payment & Finance
  {
    id: 'stripe-api',
    name: 'Stripe API',
    description: 'Process payments and manage subscriptions',
    category: 'Payments',
    icon: '💳',
    type: 'api',
    apiEndpoint: 'https://api.stripe.com/v1',
    requiredParams: ['api_key'],
    documentation: 'https://stripe.com/docs/api',
    pricing: '2.9% + 30¢ per transaction'
  },
  {
    id: 'coinbase-api',
    name: 'Coinbase API',
    description: 'Get cryptocurrency prices and market data',
    category: 'Finance',
    icon: '₿',
    type: 'api',
    apiEndpoint: 'https://api.coinbase.com/v2',
    requiredParams: [],
    documentation: 'https://developers.coinbase.com/api/v2',
    pricing: 'Free for market data'
  },

  // AI & Machine Learning
  {
    id: 'huggingface-api',
    name: 'Hugging Face API',
    description: 'Access thousands of AI models for various tasks',
    category: 'AI/ML',
    icon: '🤗',
    type: 'api',
    apiEndpoint: 'https://api-inference.huggingface.co',
    requiredParams: ['api_token'],
    documentation: 'https://huggingface.co/docs/api-inference',
    pricing: 'Free tier with rate limits'
  },
  {
    id: 'stability-ai',
    name: 'Stability AI',
    description: 'Generate images using Stable Diffusion models',
    category: 'AI/ML',
    icon: '🎨',
    type: 'api',
    apiEndpoint: 'https://api.stability.ai/v1',
    requiredParams: ['api_key'],
    documentation: 'https://platform.stability.ai/docs',
    pricing: 'Pay per generation'
  },

  // Weather & Location
  {
    id: 'openweather-api',
    name: 'OpenWeather API',
    description: 'Get current weather and forecasts',
    category: 'Weather',
    icon: '🌤️',
    type: 'api',
    apiEndpoint: 'https://api.openweathermap.org/data/2.5',
    requiredParams: ['api_key'],
    documentation: 'https://openweathermap.org/api',
    pricing: 'Free tier: 1000 calls/day'
  },
  {
    id: 'geocoding-api',
    name: 'Geocoding API',
    description: 'Convert addresses to coordinates and vice versa',
    category: 'Location',
    icon: '🗺️',
    type: 'api',
    apiEndpoint: 'https://api.opencagedata.com/geocode/v1',
    requiredParams: ['api_key'],
    documentation: 'https://opencagedata.com/api',
    pricing: 'Free tier: 2500 requests/day'
  },

  // Database & Storage
  {
    id: 'airtable-api',
    name: 'Airtable API',
    description: 'Read and write data to Airtable bases',
    category: 'Database',
    icon: '🗃️',
    type: 'api',
    apiEndpoint: 'https://api.airtable.com/v0',
    requiredParams: ['api_key'],
    documentation: 'https://airtable.com/developers/web/api/introduction',
    pricing: 'Free tier: 1200 records per base'
  },
  {
    id: 'notion-api',
    name: 'Notion API',
    description: 'Create and update pages in Notion databases',
    category: 'Productivity',
    icon: '📝',
    type: 'api',
    apiEndpoint: 'https://api.notion.com/v1',
    requiredParams: ['integration_token'],
    documentation: 'https://developers.notion.com/',
    pricing: 'Free'
  },

  // MCP Tools (Model Context Protocol)
  {
    id: 'mcp-filesystem',
    name: 'File System MCP',
    description: 'Read and write files on the local system',
    category: 'File Management',
    icon: '📁',
    type: 'mcp',
    documentation: 'Built-in MCP server for file operations',
    pricing: 'Free'
  },
  {
    id: 'mcp-git',
    name: 'Git MCP',
    description: 'Interact with Git repositories',
    category: 'Development',
    icon: '🔧',
    type: 'mcp',
    documentation: 'Built-in MCP server for Git operations',
    pricing: 'Free'
  },
  {
    id: 'mcp-database',
    name: 'Database MCP',
    description: 'Query and manage databases',
    category: 'Database',
    icon: '🗄️',
    type: 'mcp',
    documentation: 'Built-in MCP server for database operations',
    pricing: 'Free'
  },

  // Built-in Tools
  {
    id: 'builtin-calculator',
    name: 'Calculator',
    description: 'Perform mathematical calculations',
    category: 'Utilities',
    icon: '🧮',
    type: 'builtin',
    documentation: 'Built-in calculator functionality',
    pricing: 'Free'
  },
  {
    id: 'builtin-timer',
    name: 'Timer & Scheduler',
    description: 'Set timers and schedule tasks',
    category: 'Utilities',
    icon: '⏰',
    type: 'builtin',
    documentation: 'Built-in timer and scheduling functionality',
    pricing: 'Free'
  },
  {
    id: 'builtin-text-processor',
    name: 'Text Processor',
    description: 'Format, transform, and analyze text',
    category: 'Text Processing',
    icon: '📝',
    type: 'builtin',
    documentation: 'Built-in text processing functionality',
    pricing: 'Free'
  }
];

export const toolCategories = [
  'All Tools',
  'AI/ML',
  'Analytics',
  'Communication',
  'Database',
  'Data Extraction',
  'Development',
  'Email',
  'Email Marketing',
  'File Management',
  'File Processing',
  'File Storage',
  'Finance',
  'Location',
  'Payments',
  'Productivity',
  'Professional Network',
  'Research',
  'Search',
  'Social Media',
  'Text Processing',
  'Utilities',
  'Weather'
];

export function getToolsByCategory(category: string): ToolConfig[] {
  if (category === 'All Tools') {
    return realTools;
  }
  return realTools.filter(tool => tool.category === category);
}

export function getToolById(id: string): ToolConfig | undefined {
  return realTools.find(tool => tool.id === id);
}

export function getRequiredApiKeys(selectedTools: string[]): { provider: string; url: string; tools: string[] }[] {
  const apiKeyRequirements: { [key: string]: { url: string; tools: string[] } } = {};
  
  selectedTools.forEach(toolId => {
    const tool = getToolById(toolId);
    if (tool && tool.type === 'api' && tool.documentation) {
      const provider = tool.name.split(' ')[0]; // Simple provider extraction
      if (!apiKeyRequirements[provider]) {
        apiKeyRequirements[provider] = { url: tool.documentation, tools: [] };
      }
      apiKeyRequirements[provider].tools.push(tool.name);
    }
  });

  return Object.entries(apiKeyRequirements).map(([provider, data]) => ({
    provider,
    url: data.url,
    tools: data.tools
  }));
}
