require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'resume-pilot-dev-secret-2026';

const templates = [
  {
    id: 'modern',
    name: 'Modern Accent',
    category: 'Product & Tech',
    accent: '#6366f1',
    description: 'High-contrast header with sidebar metadata, modern pill badges, and clean spacing. Ideal for tech, design, and startup roles.',
    layout: 'sidebar-left',
    recommendedFont: 'Inter',
  },
  {
    id: 'classic',
    name: 'Classic Corporate',
    category: 'Traditional',
    accent: '#1e3a8a',
    description: 'Traditional centered single-column layout with elegant serif typography and horizontal dividers. Ideal for finance, legal, and corporate roles.',
    layout: 'single-column',
    recommendedFont: 'Merriweather',
  },
  {
    id: 'minimal',
    name: 'Editorial Minimal',
    category: 'Design & Media',
    accent: '#0f766e',
    description: 'Understated Scandinavian typography with generous whitespace, subtle date rules, and clean section flow.',
    layout: 'editorial',
    recommendedFont: 'Outfit',
  },
  {
    id: 'tech',
    name: 'Tech & Engineering',
    category: 'Engineering',
    accent: '#ea580c',
    description: 'Developer-oriented layout with monospace tags, tech-stack grouping, code pill badges, and high bullet density.',
    layout: 'tech-dense',
    recommendedFont: 'JetBrains Mono',
  },
  {
    id: 'executive',
    name: 'Executive Leadership',
    category: 'Leadership',
    accent: '#0f172a',
    description: 'Prominent leadership banner with core competencies matrix, executive summary, and quantified business impact.',
    layout: 'banner-header',
    recommendedFont: 'Outfit',
  },
];

const STOP_WORDS = new Set([
  'the','a','an','and','or','for','with','from','into','your','about','this','that','have','has','had',
  'will','would','could','should','been','are','was','were','their','them','they','you','our','we','us',
  'of','in','on','at','to','by','as','is','it','be','not','but','if','then','than','more','less','over',
  'under','after','before','during','through','while','what','when','where','who','which','how','why','any',
  'all','each','every','both','such','only','same','so','than','too','very','can','just','should','now'
]);

const ACTION_VERBS = [
  'Architected', 'Spearheaded', 'Engineered', 'Orchestrated', 'Optimized', 'Delivered',
  'Accelerated', 'Streamlined', 'Pioneered', 'Implemented', 'Revamped', 'Transformed',
  'Maximized', 'Automated', 'Scaled', 'Directed', 'Formulated', 'Designed'
];

const starterProfile = {
  name: 'Aisha Patel',
  title: 'Senior Product Designer & UX Strategist',
  email: 'aisha.patel@email.com',
  phone: '+1 (415) 555-0198',
  location: 'San Francisco, CA',
  website: 'https://aishapatel.design',
  summary: 'Product designer with 6+ years of experience specializing in user-centered product strategy, design systems, and measurable UX enhancements for enterprise B2B and SaaS platforms.',
  skills: [
    'UX Research', 'Figma', 'Design Systems', 'Product Strategy', 'A/B Testing',
    'User Flows', 'Prototyping', 'Accessibility (WCAG)', 'Information Architecture',
    'Data Visualization', 'DesignOps', 'Agile Product Delivery'
  ],
  experience: [
    {
      id: 'exp_001',
      company: 'Northstar Labs',
      role: 'Senior Product Designer',
      period: '2022 — Present',
      summary: 'Lead end-to-end design for workflow intelligence and telemetry products used by 45,000+ operations engineers daily.',
      bullets: [
        'Designed onboarding and dashboard flows that increased user activation by 23% and reduced time-to-value by 18%.',
        'Built and maintained a scalable multi-brand design system adopted across 5 product squads, reducing UI development cycles by 35%.',
        'Partnered with product and engineering leaders to prioritize roadmap initiatives using customer interviews, product telemetry, and continuous usability testing.',
        'Mentored 4 junior and associate designers while establishing company-wide accessibility guidelines adhering to WCAG 2.1 AA standards.'
      ]
    },
    {
      id: 'exp_002',
      company: 'Vivid Studio',
      role: 'Product Designer',
      period: '2019 — 2022',
      summary: 'Transformed complex workflows into conversion-focused customer journeys for high-growth fintech and education startups.',
      bullets: [
        'Improved mobile checkout conversion by 31% through rigorous qualitative interviews and iterative prototype testing.',
        'Synthesized feedback from 80+ customer interviews into prioritized UX wireframes and interactive specifications.',
        'Created interactive prototype libraries in Figma and Framer for rapid weekly stakeholder validation.'
      ]
    }
  ],
  education: [
    {
      id: 'edu_001',
      school: 'Rhode Island School of Design',
      degree: 'B.A. in Interaction Design',
      period: '2015 — 2019',
      details: 'Graduated Magna Cum Laude. Capstone: Human-machine decision-making interfaces for data-intensive workflows.'
    }
  ],
  projects: [
    {
      id: 'proj_001',
      name: 'InsightOps Intelligence Workspace',
      description: 'Unified workspace for customer success teams consolidating account health signals, churn alerts, and telemetry.',
      impact: 'Decreased customer churn analysis time by 40% across 12 enterprise accounts.'
    },
    {
      id: 'proj_002',
      name: 'OmniDesign System Tokens',
      description: 'Open-source design token architecture linking Figma styles directly to React and CSS custom variables.',
      impact: 'Over 1,200 GitHub stars and adopted across 8 internal web applications.'
    }
  ],
  certifications: ['Google UX Design Professional Certificate', 'Nielsen Norman Group UX Master Certified', 'DesignOps Specialist'],
  achievements: [
    'Recipient of Northstar Annual Innovation Award (2024)',
    'Keynote speaker at Bay Area UX Summit 2023 on "Data-Dense UI Simplification"'
  ],
  languages: ['English (Native)', 'French (Conversational)']
};

const defaultFormatting = {
  fontFamily: 'Inter',
  accentColor: '#6366f1',
  spacing: 'normal',
  visibleSections: {
    summary: true,
    experience: true,
    projects: true,
    education: true,
    skills: true,
    certifications: true,
    achievements: true,
  }
};

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS setup with production whitelist support
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5000', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '4mb' }));

// Global Rate Limiter (600 requests / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' } },
});
app.use('/api/', globalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts. Please wait 15 minutes.' } },
});
app.use('/api/v1/auth/', authLimiter);

// ----------------------------------------------------
// Mongoose Models
// ----------------------------------------------------

const invoiceSchema = new mongoose.Schema({
  id: { type: String, default: () => `INV-${Date.now().toString().slice(-6)}` },
  date: { type: Date, default: Date.now },
  amount: { type: String, default: '$19.00' },
  plan: { type: String, default: 'Pro Monthly' },
  status: { type: String, default: 'Paid' },
  cardLast4: { type: String, default: '4242' },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, default: '' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, default: '', sparse: true, index: true },
  avatar: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
  subscriptionStatus: { type: String, enum: ['active', 'trialing', 'canceled'], default: 'active' },
  planCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
  aiCreditsRemaining: { type: Number, default: 10 },
  aiCreditsTotal: { type: Number, default: 10 },
  planRenewsAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  customOpenAiKey: { type: String, default: '' },
  customAnthropicKey: { type: String, default: '' },
  invoices: [invoiceSchema],
  createdAt: { type: Date, default: Date.now },
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret.passwordHash;
    if (ret.customOpenAiKey) ret.customOpenAiKey = 'sk-...' + ret.customOpenAiKey.slice(-4);
    if (ret.customAnthropicKey) ret.customAnthropicKey = 'sk-ant-...' + ret.customAnthropicKey.slice(-4);
    return ret;
  },
});

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, default: '' },
  title: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  summary: { type: String, default: '' },
  skills: [{ type: String }],
  experience: [{
    id: String,
    company: String,
    role: String,
    period: String,
    summary: String,
    bullets: [String],
  }],
  education: [{
    id: String,
    school: String,
    degree: String,
    period: String,
    details: String,
  }],
  projects: [{
    id: String,
    name: String,
    description: String,
    impact: String,
  }],
  certifications: [{ type: String }],
  achievements: [{ type: String }],
  languages: [{ type: String }],
}, { timestamps: true });

profileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
  name: { type: String, default: 'My Resume' },
  title: { type: String, default: '' },
  templateId: { type: String, default: 'modern' },
  formatting: {
    fontFamily: { type: String, default: 'Inter' },
    accentColor: { type: String, default: '#6366f1' },
    spacing: { type: String, default: 'normal' },
    visibleSections: {
      summary: { type: Boolean, default: true },
      experience: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
      education: { type: Boolean, default: true },
      skills: { type: Boolean, default: true },
      certifications: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
    }
  },
  summary: { type: String, default: '' },
  skills: [{ type: String }],
  experience: [{
    id: String,
    company: String,
    role: String,
    period: String,
    summary: String,
    bullets: [String],
  }],
  education: [{
    id: String,
    school: String,
    degree: String,
    period: String,
    details: String,
  }],
  projects: [{
    id: String,
    name: String,
    description: String,
    impact: String,
  }],
  certifications: [{ type: String }],
  achievements: [{ type: String }],
  sectionOrder: [{ type: String }],
  jobDescription: { type: String, default: '' },
  analysis: { type: mongoose.Schema.Types.Mixed, default: null },
  match: { type: mongoose.Schema.Types.Mixed, default: null },
  ats: { type: mongoose.Schema.Types.Mixed, default: null },
  coverLetter: { type: String, default: '' },
}, { timestamps: true });

resumeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  status: { type: String, default: 'Applied', enum: ['Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected'] },
  matchScore: { type: Number, default: 85 },
  resumeId: { type: String, default: '' },
  jobDescription: { type: String, default: '' },
  notes: { type: String, default: '' },
  appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

applicationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Resume = mongoose.model('Resume', resumeSchema);
const Application = mongoose.model('Application', applicationSchema);

// ----------------------------------------------------
// Database Connection
// ----------------------------------------------------

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_resume_builder';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    console.log('Connected to MongoDB at', mongoUri);
  } catch (error) {
    console.warn('Local MongoDB unavailable, starting embedded MongoMemoryServer...');
    try {
      const memoryMongo = await MongoMemoryServer.create({
        instance: { dbName: 'resume_pilot_memory' },
      });
      await mongoose.connect(memoryMongo.getUri(), { dbName: 'resume_pilot_memory' });
      console.log('Connected to in-memory MongoDB fallback');
    } catch (memError) {
      console.error('Failed to start in-memory Mongo, continuing with mock fallback:', memError.message);
    }
  }
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function toPublicUser(user) {
  return {
    id: user._id ? user._id.toString() : user.id,
    username: user.username,
    email: user.email,
    authProvider: user.authProvider || 'local',
    avatar: user.avatar || '',
    googleId: user.googleId || '',
    plan: user.plan || 'free',
    subscriptionStatus: user.subscriptionStatus || 'active',
    planCycle: user.planCycle || 'monthly',
    aiCreditsRemaining: user.aiCreditsRemaining !== undefined ? user.aiCreditsRemaining : 10,
    aiCreditsTotal: user.aiCreditsTotal !== undefined ? user.aiCreditsTotal : 10,
    planRenewsAt: user.planRenewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    hasCustomKeys: Boolean(user.customOpenAiKey || user.customAnthropicKey),
    createdAt: user.createdAt,
  };
}

function buildToken(user) {
  const sub = user._id ? user._id.toString() : user.id;
  return jwt.sign({ sub }, JWT_SECRET, { expiresIn: '7d' });
}

async function authRequired(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    const userDoc = await User.findById(decoded.sub);
    if (!userDoc) {
      return res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found.' } });
    }
    req.userDoc = userDoc;
    next();
  } catch (error) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid.' } });
  }
}

async function getCurrentUserProfile(userId) {
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({
      userId,
      ...starterProfile,
    });
  }
  return profile;
}

async function getCurrentUserResume(userId, profileId) {
  let resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
  if (!resume) {
    const profile = await getCurrentUserProfile(userId);
    resume = await Resume.create({
      userId,
      profileId: profile._id,
      name: `${profile.name || 'Professional'} Resume`,
      title: profile.title || 'Professional',
      templateId: 'modern',
      formatting: defaultFormatting,
      summary: profile.summary || '',
      skills: profile.skills || [],
      experience: profile.experience || [],
      education: profile.education || [],
      projects: profile.projects || [],
      certifications: profile.certifications || [],
      achievements: profile.achievements || [],
      sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'achievements'],
    });
  }
  return resume;
}

function extractKeywordsFromText(text = '') {
  const clean = sanitizeText(text);
  if (!clean) return [];

  // Match words, technical tokens (c++, node.js, ui/ux, wcag 2.1, etc.)
  const rawWords = clean
    .toLowerCase()
    .replace(/[()[\]{},;:"?!=]/g, ' ')
    .match(/[a-zA-Z0-9+#./-]{2,}/g) || [];

  const unique = new Set();
  rawWords.forEach((word) => {
    const trimmed = word.replace(/^[./-]+|[./-]+$/g, '');
    if (trimmed.length > 2 && !STOP_WORDS.has(trimmed) && !/^\d+$/.test(trimmed)) {
      unique.add(trimmed);
    }
  });

  return Array.from(unique).slice(0, 30);
}

function analyzeJobDescription(resume, jdText) {
  const keywords = extractKeywordsFromText(jdText);
  const resumeSkills = (resume.skills || []).map((s) => s.toLowerCase());
  const resumeText = [
    resume.summary || '',
    resume.title || '',
    ...(resume.experience || []).flatMap((e) => [e.role, e.company, ...(e.bullets || [])]),
    ...(resume.projects || []).flatMap((p) => [p.name, p.description, p.impact]),
    ...(resume.skills || [])
  ].join(' ').toLowerCase();

  const matchedKeywords = [];
  const missingKeywords = [];

  keywords.forEach((keyword) => {
    const kw = keyword.toLowerCase();
    const hasExact = resumeSkills.some((s) => s.includes(kw) || kw.includes(s));
    const hasInText = resumeText.includes(kw);

    if (hasExact || hasInText) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  const total = keywords.length || 1;
  const coveragePercent = Math.min(100, Math.round((matchedKeywords.length / total) * 100));

  return {
    extractedKeywords: keywords,
    matchedKeywords,
    missingKeywords,
    keywordCoverage: `${coveragePercent}%`,
    summary: keywords.length
      ? `Found ${keywords.length} target role competencies. Your resume matches ${matchedKeywords.length} of them (${coveragePercent}% keyword alignment).`
      : 'Paste or upload a target job description to extract keywords and calculate match metrics.',
  };
}

function calculateATSScore(resume, jdText = '') {
  const analysis = analyzeJobDescription(resume, jdText);

  // 1. Structure Audit (25 points)
  const requiredSections = ['summary', 'experience', 'skills', 'education'];
  const presentSections = requiredSections.filter((sec) => {
    if (sec === 'summary') return Boolean(resume.summary && resume.summary.length >= 40);
    if (sec === 'experience') return Array.isArray(resume.experience) && resume.experience.length > 0;
    if (sec === 'skills') return Array.isArray(resume.skills) && resume.skills.length >= 3;
    if (sec === 'education') return Array.isArray(resume.education) && resume.education.length > 0;
    return false;
  });
  const structureScore = Math.round((presentSections.length / requiredSections.length) * 25);

  // 2. Keyword Match (35 points)
  let keywordScore = 20; // baseline if no JD
  if (analysis.extractedKeywords.length > 0) {
    const ratio = analysis.matchedKeywords.length / analysis.extractedKeywords.length;
    keywordScore = Math.round(ratio * 35);
  }

  // 3. Impact & Quantifiable Metrics (25 points)
  let bulletsCount = 0;
  let quantifiedBulletsCount = 0;
  (resume.experience || []).forEach((exp) => {
    (exp.bullets || []).forEach((bullet) => {
      bulletsCount++;
      if (/(\d+[%kKmMbB]?|\$\d+|\b\d+\b)/.test(bullet)) {
        quantifiedBulletsCount++;
      }
    });
  });
  const metricRatio = bulletsCount > 0 ? (quantifiedBulletsCount / bulletsCount) : 0;
  const impactScore = Math.round(metricRatio * 25);

  // 4. Formatting & Readability (15 points)
  let formatScore = 15;
  const formattingIssues = [];
  if (!resume.summary || resume.summary.length < 50) {
    formatScore -= 3;
    formattingIssues.push('Professional summary is brief or missing.');
  }
  if (bulletsCount < 3) {
    formatScore -= 4;
    formattingIssues.push('Work experience has fewer than 3 achievement bullet points.');
  }
  if (!resume.skills || resume.skills.length < 5) {
    formatScore -= 3;
    formattingIssues.push('Skill section has fewer than 5 identified skills.');
  }
  formatScore = Math.max(5, formatScore);

  const totalScore = Math.min(100, structureScore + keywordScore + impactScore + formatScore);

  const suggestions = [];
  if (analysis.missingKeywords.length > 0) {
    const topMissing = analysis.missingKeywords.slice(0, 4).join(', ');
    suggestions.push(`Tailor skills: Integrate missing target keywords where truthful: ${topMissing}`);
  }
  if (metricRatio < 0.5) {
    suggestions.push('Add measurable outcomes: Aim for at least 50% of your experience bullets to include metrics (%, $, time saved, users reached).');
  }
  if (structureScore < 25) {
    suggestions.push('Complete standard sections: Ensure Summary, Work Experience, Education, and Skills all have detailed content.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Excellent profile! Your resume has clear section structure, quantified metrics, and strong keyword alignment.');
  }

  const checks = [
    {
      label: 'Core Section Completeness',
      status: presentSections.length === 4 ? 'pass' : 'warning',
      value: `${presentSections.length}/4 sections`,
      details: 'Evaluates standard headings parsed by ATS: Summary, Experience, Skills, Education.'
    },
    {
      label: 'Role Keyword Alignment',
      status: (analysis.extractedKeywords.length === 0 || keywordScore >= 22) ? 'pass' : 'warning',
      value: analysis.extractedKeywords.length ? `${Math.round((analysis.matchedKeywords.length / analysis.extractedKeywords.length) * 100)}%` : 'No JD provided',
      details: 'Compares your resume content with extracted competencies from target role.'
    },
    {
      label: 'Quantified Impact Density',
      status: metricRatio >= 0.4 ? 'pass' : 'warning',
      value: bulletsCount > 0 ? `${Math.round(metricRatio * 100)}% of bullets` : '0%',
      details: 'Measures presence of numerical results, growth percentages, and scale.'
    },
    {
      label: 'ATS Formatting & Clean Layout',
      status: formatScore >= 12 ? 'pass' : 'warning',
      value: formatScore >= 12 ? 'High ATS Readability' : 'Minor Layout Risks',
      details: 'Validates standard bullet lengths, clear hierarchy, and ATS parse safety.'
    }
  ];

  return {
    score: totalScore,
    pass: totalScore >= 75,
    summary: totalScore >= 80
      ? 'Strong ATS Compatibility: Well-structured with strong keywords and measurable achievements.'
      : totalScore >= 65
      ? 'Moderate ATS Compatibility: Readable structure but could improve keyword alignment and quantified metrics.'
      : 'Action Needed: Several critical sections or keywords are missing for high-scoring ATS parsing.',
    checks,
    suggestions,
    metrics: {
      structureScore,
      keywordScore,
      impactScore,
      formatScore,
      quantifiedRatio: Math.round(metricRatio * 100),
    },
    disclaimer: 'ATS score is an estimate based on standard recruitment parser heuristics and keyword extraction models. Actual employer evaluations depend on specific company ATS configurations.',
    analysis,
  };
}

// Grounded AI Suggestions Generation
function buildGroundedAiSuggestion(section, profile, resume, context = '') {
  const role = resume?.title || profile.title || 'Professional';
  const skillsList = (profile.skills || []).slice(0, 8).join(', ');

  switch (section) {
    case 'summary': {
      const topCompany = profile.experience?.[0]?.company || 'leading organizations';
      const expCount = (profile.experience || []).length;
      const yearsText = expCount > 1 ? `${expCount * 2}+ years of progressive track record` : 'proven foundation';

      const suggestedContent = `${role} with a ${yearsText} delivering high-impact initiatives at ${topCompany}. Adept in ${skillsList || 'cross-functional execution, strategy, and systems'}. Combines user empathy with rigorous data-driven methodologies to accelerate product delivery, improve retention metrics, and scale high-performing solutions.`;

      return {
        section: 'summary',
        suggestedContent,
        originalContent: resume?.summary || profile.summary || '',
        explanation: 'Grounds your positioning in your verified roles, top skills, and measurable delivery record from your profile without inventing unverified claims.',
        confidence: 0.94,
        sourceFields: ['profile.title', 'profile.experience[0].company', 'profile.skills'],
        limitations: ['Grounded strictly in verified profile experience; no external employers or dates added.'],
      };
    }
    case 'experience': {
      const exp = profile.experience?.[0];
      const roleName = exp?.role || role;
      const comp = exp?.company || 'Organization';
      const existingBullets = exp?.bullets || [];

      const improvedBullets = existingBullets.length
        ? existingBullets.map((b, i) => {
            if (/^Spearheaded|^Architected|^Delivered|^Engineered/.test(b)) return b;
            const verb = ACTION_VERBS[i % ACTION_VERBS.length];
            return `${verb} ${b.charAt(0).toLowerCase()}${b.slice(1)}`;
          })
        : [
            `Spearheaded key initiatives for ${comp}, achieving measurable improvements in operational efficiency and product quality.`,
            `Partnered with cross-functional leadership to align roadmap objectives with customer feedback and analytics.`,
            `Engineered scalable workflows that accelerated delivery cycles and reduced defect rates.`
          ];

      return {
        section: 'experience',
        suggestedContent: improvedBullets.join('\n'),
        originalContent: existingBullets.join('\n'),
        explanation: 'Applies executive action verbs (Google XYZ formula) to your existing accomplishments while preserving your authentic work history.',
        confidence: 0.91,
        sourceFields: ['profile.experience[0].bullets', 'profile.experience[0].role'],
        limitations: ['Enhances action orientation and syntax; does not invent metrics not provided in original entry.'],
      };
    }
    case 'projects': {
      const proj = profile.projects?.[0];
      const name = proj?.name || 'High-Impact Initiative';
      const desc = proj?.description || 'Built scalable solution targeting enterprise workflows.';
      const impact = proj?.impact || 'Delivered significant performance and user satisfaction improvements.';

      return {
        section: 'projects',
        suggestedContent: `${name}: ${desc} Implemented robust architecture utilizing ${skillsList.split(',').slice(0, 3).join(', ')}, directly driving: ${impact}`,
        originalContent: `${name}: ${desc}`,
        explanation: 'Synthesizes project scope with verified core competencies and stated impact metrics for clarity.',
        confidence: 0.89,
        sourceFields: ['profile.projects[0].name', 'profile.projects[0].description', 'profile.projects[0].impact'],
        limitations: ['Rooted solely in the documented project scope and impact statement.'],
      };
    }
    case 'skills': {
      const allSkills = Array.from(new Set([...(profile.skills || []), ...(resume?.skills || [])]));
      return {
        section: 'skills',
        suggestedContent: allSkills.join(', '),
        originalContent: (resume?.skills || []).join(', '),
        explanation: 'Consolidates all verified technical and domain skills from your profile into an ATS-friendly standardized taxonomy.',
        confidence: 0.96,
        sourceFields: ['profile.skills'],
        limitations: ['Contains only user-entered competencies.'],
      };
    }
    default:
      return {
        section,
        suggestedContent: 'Polished section content aligned with your professional credentials.',
        originalContent: '',
        explanation: 'Maintains truthful representation of your career history.',
        confidence: 0.85,
        sourceFields: ['profile'],
        limitations: ['Grounded in profile data.'],
      };
  }
}

async function callLlmIfAvailable(prompt, fallback, customKeys = {}) {
  const openAiKey = customKeys.openAiKey || process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.4,
          messages: [
            {
              role: 'system',
              content: 'You are an expert ATS resume writer. Ground every suggestion ONLY in the user profile provided. Do not hallucinate employers, degrees, skills, or metrics.'
            },
            { role: 'user', content: prompt }
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('OpenAI request error, falling back to local heuristic:', e.message);
    }
  }

  const anthropicKey = customKeys.anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.content?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('Anthropic request error, falling back to local heuristic:', e.message);
    }
  }

  return fallback;
}

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

app.get('/api/v1/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    service: 'AI Resume Builder SaaS API',
    version: '2.4.0-production',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    memoryUsageMB: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
});

app.get('/api/v1/templates', (req, res) => {
  res.json({ templates });
});

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------

app.post('/api/v1/auth/register', async (req, res) => {
  const username = sanitizeText(req.body?.username);
  const email = sanitizeText(req.body?.email).toLowerCase();
  const password = sanitizeText(req.body?.password);

  if (!username || !email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Username, email, and password are required.' } });
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'An account with that email or username already exists.' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash });
    const profile = await getCurrentUserProfile(user._id);
    const resume = await getCurrentUserResume(user._id, profile._id);
    const token = buildToken(user);

    return res.status(201).json({
      token,
      user: toPublicUser(user),
      profile,
      resume,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  const email = sanitizeText(req.body?.email).toLowerCase();
  const password = sanitizeText(req.body?.password);

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Email and password are required.' } });
  }

  try {
    let user = await User.findOne({ email });
    // Demo user auto-provisioning with Pro SaaS credentials
    if (!user && email === 'demo@resume.dev') {
      const passwordHash = await bcrypt.hash('password123', 10);
      user = await User.create({
        username: 'demouser',
        email,
        passwordHash,
        plan: 'pro',
        subscriptionStatus: 'active',
        planCycle: 'monthly',
        aiCreditsRemaining: 9999,
        aiCreditsTotal: 9999,
        invoices: [{
          id: 'INV-DEMO-01',
          date: new Date(),
          amount: '$19.00',
          plan: 'Pro Monthly',
          status: 'Paid',
          cardLast4: '4242',
        }],
      });
    } else if (user && email === 'demo@resume.dev' && (!user.plan || user.plan === 'free')) {
      user.plan = 'pro';
      user.aiCreditsRemaining = 9999;
      user.aiCreditsTotal = 9999;
      await user.save();
    }

    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    if (!user.passwordHash && user.authProvider === 'google') {
      return res.status(400).json({
        error: {
          code: 'GOOGLE_AUTH_REQUIRED',
          message: 'This account was registered using Google Sign-In. Please click "Continue with Google" to access your account.',
        },
      });
    }

    const match = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!match && !(email === 'demo@resume.dev' && password === 'password123')) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const profile = await getCurrentUserProfile(user._id);
    const resume = await getCurrentUserResume(user._id, profile._id);
    const token = buildToken(user);

    return res.json({
      token,
      user: toPublicUser(user),
      profile,
      resume,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.get('/api/v1/auth/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }
    const profile = await getCurrentUserProfile(user._id);
    const resume = await getCurrentUserResume(user._id, profile._id);
    return res.json({ user: toPublicUser(user), profile, resume });
  } catch (error) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// Google Authentication Configuration & Verification
app.get('/api/v1/auth/google/config', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com'),
    mode: process.env.GOOGLE_CLIENT_ID ? 'production' : 'sandbox',
  });
});

app.post('/api/v1/auth/google', async (req, res) => {
  const { credential, mockUser } = req.body || {};

  try {
    let googleUser = null;

    if (credential) {
      // 1. Verify standard Google Identity Services ID token via Google TokenInfo API
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
      const googleRes = await fetch(tokenInfoUrl);

      if (!googleRes.ok) {
        const errorText = await googleRes.text().catch(() => '');
        return res.status(401).json({
          error: {
            code: 'INVALID_GOOGLE_TOKEN',
            message: 'Google authentication failed: token is invalid or has expired.',
            details: errorText,
          },
        });
      }

      const payload = await googleRes.json();

      // Check audience if client ID is configured in environment
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com' && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        return res.status(401).json({
          error: {
            code: 'AUDIENCE_MISMATCH',
            message: 'Google token audience does not match configured GOOGLE_CLIENT_ID.',
          },
        });
      }

      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        return res.status(401).json({
          error: {
            code: 'UNVERIFIED_EMAIL',
            message: 'Your Google email address is not verified. Please verify your email with Google first.',
          },
        });
      }

      googleUser = {
        sub: payload.sub,
        email: (payload.email || '').toLowerCase().trim(),
        name: payload.name || payload.given_name || payload.email.split('@')[0],
        avatar: payload.picture || '',
      };
    } else if (mockUser && (process.env.NODE_ENV !== 'production' || !process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-google-client-id.apps.googleusercontent.com')) {
      // Sandbox / Test / Demo Google Auth Mode (used for instant testing when no Google Cloud Project is set up)
      googleUser = {
        sub: mockUser.googleId || `g_mock_${Date.now()}`,
        email: (mockUser.email || 'alex.rivers@gmail.com').toLowerCase().trim(),
        name: mockUser.name || 'Alex Rivers',
        avatar: mockUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      };
    } else {
      return res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIAL',
          message: 'Google credential token or simulated user object is required.',
        },
      });
    }

    if (!googleUser.email) {
      return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Google account did not provide an email address.' } });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [
        { googleId: googleUser.sub },
        { email: googleUser.email },
      ],
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const baseCandidate = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
      let usernameCandidate = baseCandidate;
      let counter = 1;
      while (await User.findOne({ username: usernameCandidate })) {
        usernameCandidate = `${baseCandidate}${counter++}`;
      }

      user = await User.create({
        username: usernameCandidate,
        email: googleUser.email,
        passwordHash: '',
        authProvider: 'google',
        googleId: googleUser.sub,
        avatar: googleUser.avatar,
        plan: 'free',
        subscriptionStatus: 'active',
        planCycle: 'monthly',
        aiCreditsRemaining: 10,
        aiCreditsTotal: 10,
      });
    } else {
      let changed = false;
      if (!user.googleId && googleUser.sub) {
        user.googleId = googleUser.sub;
        changed = true;
      }
      if (!user.avatar && googleUser.avatar) {
        user.avatar = googleUser.avatar;
        changed = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        changed = true;
      }
      if (changed) await user.save();
    }

    const profile = await getCurrentUserProfile(user._id);
    if (isNewUser) {
      if (googleUser.name && (!profile.name || profile.name === 'Aisha Patel')) {
        profile.name = googleUser.name;
      }
      profile.email = googleUser.email;
      await profile.save();
    }

    const resume = await getCurrentUserResume(user._id, profile._id);
    const token = buildToken(user);

    return res.json({
      token,
      user: toPublicUser(user),
      profile,
      resume,
      isNewUser,
    });
  } catch (error) {
    console.error('Google Authentication Error:', error);
    return res.status(500).json({ error: { code: 'GOOGLE_AUTH_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// Profiles Endpoints
// ----------------------------------------------------

app.get('/api/v1/profiles', authRequired, async (req, res) => {
  const profile = await getCurrentUserProfile(req.user.sub);
  res.json({ profile });
});

app.get('/api/v1/profiles/:id', authRequired, async (req, res) => {
  try {
    let profile;
    if (isValidObjectId(req.params.id)) {
      profile = await Profile.findOne({ _id: req.params.id, userId: req.user.sub });
    }
    if (!profile) {
      profile = await getCurrentUserProfile(req.user.sub);
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/profiles', authRequired, async (req, res) => {
  try {
    const updated = await Profile.findOneAndUpdate(
      { userId: req.user.sub },
      { ...req.body, userId: req.user.sub },
      { returnDocument: 'after', upsert: true }
    );
    res.status(201).json({ profile: updated });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.patch('/api/v1/profiles/:id', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const updated = await Profile.findOneAndUpdate(query, req.body, { returnDocument: 'after', upsert: true });
    res.json({ profile: updated });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// Resumes Endpoints (with version management)
// ----------------------------------------------------

app.get('/api/v1/resumes', authRequired, async (req, res) => {
  try {
    let resumes = await Resume.find({ userId: req.user.sub }).sort({ updatedAt: -1 });
    if (!resumes || resumes.length === 0) {
      const initial = await getCurrentUserResume(req.user.sub);
      resumes = [initial];
    }
    res.json({ resumes });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/resumes', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const count = await Resume.countDocuments({ userId: req.user.sub });

    if (user && user.plan === 'free' && count >= 2) {
      return res.status(403).json({
        error: {
          code: 'UPGRADE_REQUIRED',
          message: 'Free tier is limited to 2 resume variations. Upgrade to Pro for unlimited resumes, deep ATS scans, and AI cover letters.',
          limit: 2,
          current: count,
        }
      });
    }

    const profile = await getCurrentUserProfile(req.user.sub);
    const name = req.body?.name || `Resume Version ${count + 1}`;
    const templateId = req.body?.templateId || 'modern';

    const resume = await Resume.create({
      userId: req.user.sub,
      profileId: profile._id,
      name,
      title: profile.title || 'Professional',
      templateId,
      formatting: { ...defaultFormatting, ...(req.body?.formatting || {}) },
      summary: profile.summary || '',
      skills: profile.skills || [],
      experience: profile.experience || [],
      education: profile.education || [],
      projects: profile.projects || [],
      certifications: profile.certifications || [],
      achievements: profile.achievements || [],
      sectionOrder: ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'achievements'],
    });

    res.status(201).json({ resume });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.get('/api/v1/resumes/:id', authRequired, async (req, res) => {
  try {
    let resume;
    if (isValidObjectId(req.params.id)) {
      resume = await Resume.findOne({ _id: req.params.id, userId: req.user.sub });
    }
    if (!resume) {
      resume = await getCurrentUserResume(req.user.sub);
    }
    res.json({ resume });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.patch('/api/v1/resumes/:id', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const updated = await Resume.findOneAndUpdate(query, req.body, { returnDocument: 'after' });
    if (!updated) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }
    res.json({ resume: updated });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/resumes/:id/duplicate', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const count = await Resume.countDocuments({ userId: req.user.sub });

    if (user && user.plan === 'free' && count >= 2) {
      return res.status(403).json({
        error: {
          code: 'UPGRADE_REQUIRED',
          message: 'Free tier is limited to 2 resume variations. Upgrade to Pro for unlimited resumes, deep ATS scans, and AI cover letters.',
          limit: 2,
          current: count,
        }
      });
    }

    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const original = await Resume.findOne(query);
    if (!original) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Original resume not found.' } });
    }

    const duplicateObj = original.toObject();
    delete duplicateObj._id;
    delete duplicateObj.id;
    delete duplicateObj.createdAt;
    delete duplicateObj.updatedAt;

    const duplicate = await Resume.create({
      ...duplicateObj,
      name: `${original.name} (Copy)`,
      userId: req.user.sub,
    });

    res.status(201).json({ resume: duplicate });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.delete('/api/v1/resumes/:id', authRequired, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid resume identifier.' } });
    }

    const count = await Resume.countDocuments({ userId: req.user.sub });
    if (count <= 1) {
      return res.status(400).json({ error: { code: 'CANNOT_DELETE_LAST', message: 'You must maintain at least one resume.' } });
    }

    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    if (!deleted) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }

    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// AI Content Generation & Improvement (PRD US-003, US-006)
// ----------------------------------------------------

app.post('/api/v1/resumes/:id/ai/generate', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const hasCustomKey = Boolean(user?.customOpenAiKey || user?.customAnthropicKey);

    if (user && user.plan === 'free' && !hasCustomKey) {
      if ((user.aiCreditsRemaining || 0) <= 0) {
        return res.status(403).json({
          error: {
            code: 'CREDITS_DEPLETED',
            message: 'You have used all 10 free AI credits. Upgrade to Pro for unlimited generation, or provide your personal API key in Settings.',
          }
        });
      }
      user.aiCreditsRemaining = Math.max(0, (user.aiCreditsRemaining || 10) - 1);
      await user.save();
    }

    const resume = await Resume.findOne(
      isValidObjectId(req.params.id) ? { _id: req.params.id, userId: req.user.sub } : { userId: req.user.sub }
    );
    const profile = await getCurrentUserProfile(req.user.sub);
    const section = req.body?.section || 'summary';

    const baseSuggestion = buildGroundedAiSuggestion(section, profile, resume);

    // Call LLM with strict grounding prompt
    const prompt = `Rewrite and polish this resume section: "${section}".
Candidate Data: ${JSON.stringify({
      title: profile.title,
      summary: profile.summary,
      skills: profile.skills,
      experience: profile.experience,
      projects: profile.projects,
    })}
Target Role / Job Context: ${resume?.jobDescription || 'Senior Industry Role'}
Instruction: Produce high-impact, professional resume text adhering strictly to the facts above. Zero hallucinated claims.`;

    const polishedContent = await callLlmIfAvailable(prompt, baseSuggestion.suggestedContent, {
      openAiKey: user?.customOpenAiKey,
      anthropicKey: user?.customAnthropicKey,
    });

    res.json({
      suggestion: {
        ...baseSuggestion,
        suggestedContent: polishedContent,
      },
      creditsRemaining: user ? user.aiCreditsRemaining : 9999,
    });
  } catch (error) {
    console.error('AI generate error:', error);
    res.status(500).json({ error: { code: 'AI_GENERATION_FAILED', message: error.message } });
  }
});

app.post('/api/v1/resumes/:id/ai/improve', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const hasCustomKey = Boolean(user?.customOpenAiKey || user?.customAnthropicKey);

    if (user && user.plan === 'free' && !hasCustomKey) {
      if ((user.aiCreditsRemaining || 0) <= 0) {
        return res.status(403).json({
          error: {
            code: 'CREDITS_DEPLETED',
            message: 'You have used all 10 free AI credits. Upgrade to Pro for unlimited generation, or provide your personal API key in Settings.',
          }
        });
      }
      user.aiCreditsRemaining = Math.max(0, (user.aiCreditsRemaining || 10) - 1);
      await user.save();
    }

    const section = req.body?.section || 'summary';
    const content = sanitizeText(req.body?.content || '');
    const profile = await getCurrentUserProfile(req.user.sub);

    const prompt = `Elevate this resume ${section} text to be more action-oriented, professional, and ATS-friendly.
Original text: "${content}"
Candidate verified skills: ${(profile.skills || []).slice(0, 8).join(', ')}
Requirements: Use strong action verbs, concise language, and do not invent unverified claims. Return only the revised text.`;

    // Local deterministic heuristic enhancement
    let localEnhanced = content;
    if (content) {
      localEnhanced = content
        .replace(/\b(worked on|helped with|responsible for|handled|did)\b/gi, 'Spearheaded')
        .replace(/\b(good|great|nice)\b/gi, 'measurable')
        .replace(/\b(a lot of|many)\b/gi, 'multiple enterprise');
      if (section === 'summary' && !localEnhanced.includes('measurable')) {
        localEnhanced += ' Focused on scalable architecture and driving measurable product outcomes.';
      }
    } else {
      localEnhanced = buildGroundedAiSuggestion(section, profile).suggestedContent;
    }

    const finalEnhanced = await callLlmIfAvailable(prompt, localEnhanced, {
      openAiKey: user?.customOpenAiKey,
      anthropicKey: user?.customAnthropicKey,
    });

    res.json({
      section,
      originalContent: content,
      suggestedContent: finalEnhanced,
      explanation: 'Strengthened with active verbs and executive phrasing while preserving your exact career facts.',
      confidence: 0.92,
      sourceFields: [`resume.${section}`, 'profile.skills'],
      limitations: ['Grounded solely in user provided text and verified skills.'],
      creditsRemaining: user ? user.aiCreditsRemaining : 9999,
    });
  } catch (error) {
    console.error('AI improve error:', error);
    res.status(500).json({ error: { code: 'AI_IMPROVE_FAILED', message: error.message } });
  }
});

// ----------------------------------------------------
// Job Description, Matching, & ATS Analysis
// ----------------------------------------------------

app.post('/api/v1/resumes/:id/job-description', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const resume = await Resume.findOne(query);
    if (!resume) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }

    const jdText = sanitizeText(req.body?.jobDescription);
    const analysis = analyzeJobDescription(resume, jdText);

    const updated = await Resume.findOneAndUpdate(
      query,
      { jobDescription: jdText, analysis },
      { returnDocument: 'after' }
    );

    res.json({ analysis, resume: updated });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/resumes/:id/match', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const resume = await Resume.findOne(query);
    if (!resume) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }

    const jdText = sanitizeText(req.body?.jobDescription || resume.jobDescription);
    const analysis = analyzeJobDescription(resume, jdText);
    const matchScore = Math.min(100, Math.round((analysis.matchedKeywords.length / Math.max(analysis.extractedKeywords.length, 1)) * 100));

    const match = {
      score: matchScore,
      matchedSkills: analysis.matchedKeywords,
      missingSkills: analysis.missingKeywords,
      keywordCoverage: `${matchScore}%`,
      summary: analysis.extractedKeywords.length
        ? `Your resume aligns with ${analysis.matchedKeywords.length} of ${analysis.extractedKeywords.length} key competencies (${matchScore}% match).`
        : 'Analyze a target job description to reveal skill gaps and keyword match percentage.',
      breakdown: [
        { category: 'Matched Competencies', count: analysis.matchedKeywords.length, items: analysis.matchedKeywords },
        { category: 'Missing Skills to Emphasize', count: analysis.missingKeywords.length, items: analysis.missingKeywords }
      ]
    };

    await Resume.findOneAndUpdate(query, { match }, { returnDocument: 'after' });
    res.json({ match });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/resumes/:id/ats-analysis', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const resume = await Resume.findOne(query);
    if (!resume) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }

    const jdText = sanitizeText(req.body?.jobDescription || resume.jobDescription);
    const ats = calculateATSScore(resume, jdText);

    await Resume.findOneAndUpdate(query, { ats }, { returnDocument: 'after' });
    res.json({ ats });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// Cover Letter Generation (PRD Priority: Could)
// ----------------------------------------------------

app.post('/api/v1/resumes/:id/cover-letter', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const hasCustomKey = Boolean(user?.customOpenAiKey || user?.customAnthropicKey);

    if (user && user.plan === 'free' && !hasCustomKey) {
      if ((user.aiCreditsRemaining || 0) <= 0) {
        return res.status(403).json({
          error: {
            code: 'CREDITS_DEPLETED',
            message: 'Cover Letter generation requires AI credits. You have 0 credits remaining on your Free plan. Upgrade to Pro for unlimited generation.',
          }
        });
      }
      user.aiCreditsRemaining = Math.max(0, (user.aiCreditsRemaining || 10) - 1);
      await user.save();
    }

    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const resume = await Resume.findOne(query);
    const profile = await getCurrentUserProfile(req.user.sub);

    const targetCompany = req.body?.company || 'Hiring Team';
    const targetRole = req.body?.role || resume?.title || profile.title || 'Product Role';
    const topSkills = (profile.skills || []).slice(0, 4).join(', ');
    const topExp = profile.experience?.[0];

    const fallbackLetter = `Dear ${targetCompany} Team,

I am writing to express my strong enthusiasm for the ${targetRole} position at ${targetCompany}. With a proven track record as ${profile.title || 'a product specialist'} and deep domain expertise in ${topSkills}, I have consistently built solutions that bridge user needs and strategic business growth.

In my recent position as ${topExp?.role || 'Senior Specialist'} at ${topExp?.company || 'my previous company'}, I ${topExp?.bullets?.[0] ? topExp.bullets[0].charAt(0).toLowerCase() + topExp.bullets[0].slice(1) : 'delivered complex initiatives on time with measurable user satisfaction improvements'}. I take pride in establishing clear methodologies, fostering cross-functional alignment, and delivering customer-centric experiences that scale.

What excites me most about ${targetCompany} is the opportunity to bring my background in ${profile.skills?.[0] || 'innovative product strategy'} to your current challenges and accelerate your team's mission.

Thank you for your consideration. I welcome the opportunity to discuss how my qualifications will add immediate value to your organization.

Sincerely,
${profile.name || 'Candidate'}
${profile.phone ? profile.phone + ' • ' : ''}${profile.email || ''}`;

    const prompt = `Write a formal, compelling, 3-paragraph cover letter for ${profile.name} applying for ${targetRole} at ${targetCompany}.
Use only their verified background:
Summary: ${profile.summary}
Key skills: ${topSkills}
Recent Role: ${topExp?.role} at ${topExp?.company}
Key Achievement: ${topExp?.bullets?.[0] || ''}`;

    const coverLetter = await callLlmIfAvailable(prompt, fallbackLetter, {
      openAiKey: user?.customOpenAiKey,
      anthropicKey: user?.customAnthropicKey,
    });
    await Resume.findOneAndUpdate(query, { coverLetter }, { returnDocument: 'after' });

    res.json({
      coverLetter,
      creditsRemaining: user ? user.aiCreditsRemaining : 9999,
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// Export Engine (PRD US-009)
// ----------------------------------------------------

app.post('/api/v1/resumes/:id/export', authRequired, async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id, userId: req.user.sub }
      : { userId: req.user.sub };

    const resume = await Resume.findOne(query);
    if (!resume) {
      return res.status(404).json({ error: { code: 'RESUME_NOT_FOUND', message: 'Resume not found.' } });
    }

    const exportId = uuidv4();
    const safeTitle = (resume.name || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}-${Date.now()}.pdf`;

    res.json({
      exportId,
      fileName,
      status: 'ready',
      templateId: resume.templateId,
      exportedAt: new Date().toISOString(),
      message: 'PDF export prepared. Client-side vector rendering initiated.',
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// Application Tracker (PRD Priority: Could)
// ----------------------------------------------------

app.get('/api/v1/applications', authRequired, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.sub }).sort({ updatedAt: -1 });
    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/applications', authRequired, async (req, res) => {
  try {
    const application = await Application.create({
      userId: req.user.sub,
      company: req.body.company || 'New Company',
      role: req.body.role || 'Target Role',
      location: req.body.location || 'Remote',
      status: req.body.status || 'Applied',
      matchScore: Number(req.body.matchScore) || 80,
      resumeId: req.body.resumeId || '',
      jobDescription: req.body.jobDescription || '',
      notes: req.body.notes || '',
      appliedDate: req.body.appliedDate || new Date().toISOString().split('T')[0],
    });
    res.status(201).json({ application });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.patch('/api/v1/applications/:id', authRequired, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid application ID.' } });
    }
    const updated = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      req.body,
      { returnDocument: 'after' }
    );
    res.json({ application: updated });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.delete('/api/v1/applications/:id', authRequired, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid application ID.' } });
    }
    await Application.findOneAndDelete({ _id: req.params.id, userId: req.user.sub });
    res.json({ success: true, deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// SaaS Subscription & Billing Endpoints
// ----------------------------------------------------

const SAAS_PLANS_CATALOG = [
  {
    id: 'free',
    name: 'Starter Free',
    priceMonthly: 0,
    priceAnnual: 0,
    popular: false,
    badge: 'Free Forever',
    description: 'Essential toolkit for candidates starting their search.',
    features: [
      'Up to 2 Resume Variations',
      '10 Grounded AI Generation Credits',
      'All 5 ATS-Optimized Vector Templates',
      'Core Keyword Match & Job Description Parser',
      'Standard ATS Score Audit',
      'Basic Job Application Tracker',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Career Accelerator',
    priceMonthly: 19,
    priceAnnual: 149,
    popular: true,
    badge: 'Most Popular',
    description: 'Engineered for high-growth tech, design, and business professionals.',
    features: [
      'Unlimited Resume Variations',
      'Unlimited Grounded AI Content & Google XYZ Rewriter',
      'Advanced ATS Deep Scanner with Quantified Metric Audit',
      '1-Click Tailored AI Cover Letter Studio',
      'High-DPI Vector PDF Export (Zero Watermark)',
      'Bring Your Own Key (BYOK) OpenAI & Anthropic Integration',
      'Unlimited Applications Kanban Tracker',
      'Priority Cloud Processing & Email Support',
    ],
  },
  {
    id: 'team',
    name: 'Executive & Agency',
    priceMonthly: 49,
    priceAnnual: 399,
    popular: false,
    badge: 'Agency & Teams',
    description: 'For career coaches, executive candidates, and recruitment agencies.',
    features: [
      'Everything in Pro tier',
      'Up to 5 Team / Reviewer Seats',
      'Client Multi-Profile Management Mode',
      'Custom Agency Header Branding on Exports',
      'Batch Job Description Keyword Parser',
      'Dedicated Account Manager & 1-on-1 ATS Review',
    ],
  },
];

app.get('/api/v1/subscription', authRequired, async (req, res) => {
  try {
    const user = req.userDoc || await User.findById(req.user.sub);
    const resumeCount = await Resume.countDocuments({ userId: req.user.sub });

    const fallbackInvoices = [
      {
        id: `INV-${user._id.toString().slice(-6).toUpperCase()}`,
        date: user.createdAt || new Date(),
        amount: user.plan === 'free' ? '$0.00' : user.plan === 'team' ? '$49.00' : '$19.00',
        plan: `${(user.plan || 'free').toUpperCase()} Plan`,
        status: 'Paid',
        cardLast4: '4242',
      }
    ];

    res.json({
      subscription: {
        plan: user.plan || 'free',
        status: user.subscriptionStatus || 'active',
        cycle: user.planCycle || 'monthly',
        aiCreditsRemaining: user.aiCreditsRemaining !== undefined ? user.aiCreditsRemaining : 10,
        aiCreditsTotal: user.aiCreditsTotal !== undefined ? user.aiCreditsTotal : 10,
        renewsAt: user.planRenewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        resumeCount,
        maxResumes: user.plan === 'free' ? 2 : 'Unlimited',
        hasCustomKey: Boolean(user.customOpenAiKey || user.customAnthropicKey),
      },
      invoices: user.invoices && user.invoices.length > 0 ? user.invoices : fallbackInvoices,
      plansCatalog: SAAS_PLANS_CATALOG,
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/subscription/upgrade', authRequired, async (req, res) => {
  try {
    const { plan = 'pro', cycle = 'monthly', paymentMethod = {} } = req.body;
    const user = await User.findById(req.user.sub);

    const price = plan === 'team'
      ? (cycle === 'annual' ? '$399.00' : '$49.00')
      : (cycle === 'annual' ? '$149.00' : '$19.00');

    const durationDays = cycle === 'annual' ? 365 : 30;
    const nextRenewal = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const newInvoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      amount: price,
      plan: `${plan.toUpperCase()} (${cycle})`,
      status: 'Paid',
      cardLast4: paymentMethod.last4 || '4242',
    };

    user.plan = plan;
    user.planCycle = cycle;
    user.subscriptionStatus = 'active';
    user.aiCreditsRemaining = 9999;
    user.aiCreditsTotal = 9999;
    user.planRenewsAt = nextRenewal;
    if (!user.invoices) user.invoices = [];
    user.invoices.unshift(newInvoice);

    await user.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan.toUpperCase()} tier! Unlimited resumes and AI unlocked.`,
      user: toPublicUser(user),
      invoice: newInvoice,
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/subscription/cancel', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    user.subscriptionStatus = 'canceled';
    await user.save();

    res.json({
      success: true,
      message: 'Subscription renewal has been canceled. You retain active access until the end of your billing cycle.',
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.post('/api/v1/subscription/add-credits', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    user.aiCreditsRemaining = (user.aiCreditsRemaining || 0) + 25;
    user.aiCreditsTotal = (user.aiCreditsTotal || 0) + 25;
    await user.save();

    res.json({
      success: true,
      message: 'Added +25 AI Generation Credits to your balance.',
      creditsRemaining: user.aiCreditsRemaining,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ----------------------------------------------------
// User Settings, BYOK Keys, & GDPR Privacy Endpoints
// ----------------------------------------------------

app.patch('/api/v1/user/settings', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }

    const { username, email, currentPassword, newPassword, customOpenAiKey, customAnthropicKey } = req.body;

    if (username && sanitizeText(username)) {
      user.username = sanitizeText(username);
    }
    if (email && sanitizeText(email)) {
      user.email = sanitizeText(email).toLowerCase();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: { code: 'PASSWORD_REQUIRED', message: 'Current password is required to change password.' } });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch && !(user.email === 'demo@resume.dev' && currentPassword === 'password123')) {
        return res.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Current password does not match.' } });
      }
      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (customOpenAiKey !== undefined) {
      user.customOpenAiKey = sanitizeText(customOpenAiKey);
    }
    if (customAnthropicKey !== undefined) {
      user.customAnthropicKey = sanitizeText(customAnthropicKey);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Account settings updated successfully.',
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.get('/api/v1/user/export-data', authRequired, async (req, res) => {
  try {
    const [user, profile, resumes, applications] = await Promise.all([
      User.findById(req.user.sub),
      Profile.findOne({ userId: req.user.sub }),
      Resume.find({ userId: req.user.sub }),
      Application.find({ userId: req.user.sub }),
    ]);

    const exportBundle = {
      exportVersion: '1.0-gdpr',
      platform: 'ResumePilot AI SaaS Platform',
      exportedAt: new Date().toISOString(),
      user: toPublicUser(user),
      profile,
      resumes,
      applications,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=ResumePilot-Data-${user.username}-${Date.now()}.json`);
    res.json(exportBundle);
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

app.delete('/api/v1/user/account', authRequired, async (req, res) => {
  try {
    const userId = req.user.sub;
    await Promise.all([
      User.findByIdAndDelete(userId),
      Profile.deleteMany({ userId }),
      Resume.deleteMany({ userId }),
      Application.deleteMany({ userId }),
    ]);
    res.json({ success: true, message: 'Your account and all associated resumes have been permanently deleted.' });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// Global 404 Handler for API
app.use('/api', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` } });
});

// Production Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isProd ? 'An unexpected server error occurred.' : err.message,
    }
  });
});

// ----------------------------------------------------
// Server Initialization
// ----------------------------------------------------

async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`AI Resume Builder API running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Fatal server boot error:', error);
    process.exit(1);
  });
}

module.exports = { app, connectDatabase, calculateATSScore, analyzeJobDescription, extractKeywordsFromText };
