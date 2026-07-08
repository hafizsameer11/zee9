export type Freelancer = {
  id: string; name: string; initials: string; title: string; location: string;
  rate: number; rating: number; reviews: number; success: number; jobsDone: number;
  verified: boolean; preferred: boolean; newTalent: boolean;
  about: string; skills: string[]; portfolio: string[];
  packages: { title: string; desc: string; from: number }[];
  reviewsList: { client: string; project: string; stars: number; text: string; date: string }[];
};

export type Job = {
  id: string; title: string; budget: string; type: 'Fixed' | 'Hourly';
  posted: string; bids: number; clientVerified: boolean; clientRating: number;
  category: string; skills: string[]; desc: string; match: number;
  deliverables: string[]; revisions: number; timeline: string;
};

export type Contract = {
  id: string; title: string; client: string; freelancer: string; amount: number;
  status: 'In progress' | 'Submitted' | 'Completed' | 'Awaiting funding';
  milestones: { title: string; amount: number; state: 'done' | 'now' | 'todo'; due: string }[];
};

export const freelancers: Freelancer[] = [
  {
    id: 'jane-doe', name: 'Jane Doe', initials: 'JD', title: 'Senior Shopify & E-commerce Developer',
    location: 'Cape Town, ZA', rate: 45, rating: 4.9, reviews: 37, success: 98, jobsDone: 41,
    verified: true, preferred: true, newTalent: false,
    about: 'Shopify specialist with 6 years building high-converting stores for beauty, skincare, and lifestyle brands. I handle everything from theme customization to CRO and speed optimization.',
    skills: ['Shopify', 'Liquid', 'CRO', 'JavaScript', 'Theme dev'],
    portfolio: ['Aurelia Skincare', 'Northwind Store', 'Bloom & Co.'],
    packages: [
      { title: 'Starter store setup', desc: '5-page Shopify store, ready to launch', from: 800 },
      { title: 'Store speed audit + fixes', desc: 'Full performance optimization', from: 350 },
    ],
    reviewsList: [
      { client: 'Aurelia Skincare', project: 'Shopify store build', stars: 5, text: 'Jane delivered ahead of schedule and the store converts beautifully. Communication was flawless.', date: 'Jun 2026' },
      { client: 'Northwind Co.', project: 'CRO audit', stars: 5, text: 'Found issues our agency missed for months. Worth every dollar.', date: 'May 2026' },
      { client: 'Bloom & Co.', project: 'Theme customization', stars: 4, text: 'Great work overall, minor delays on the final revision round.', date: 'Apr 2026' },
    ],
  },
  {
    id: 'sam-khoza', name: 'Sam Khoza', initials: 'SK', title: 'Shopify Plus Specialist',
    location: 'Johannesburg, ZA', rate: 38, rating: 4.8, reviews: 12, success: 95, jobsDone: 14,
    verified: true, preferred: false, newTalent: false,
    about: 'Shopify Plus developer focused on catalogue architecture, custom apps, and headless builds for growing brands.',
    skills: ['Shopify Plus', 'React', 'Node.js', 'GraphQL'],
    portfolio: ['UrbanKit', 'Fynbos Foods', 'Cape Roasters'],
    packages: [{ title: 'Plus migration', desc: 'Full migration to Shopify Plus', from: 1500 }],
    reviewsList: [
      { client: 'UrbanKit', project: 'Catalogue rebuild', stars: 5, text: 'Structured our 800-SKU catalogue perfectly.', date: 'Jun 2026' },
    ],
  },
  {
    id: 'priya-m', name: 'Priya M.', initials: 'PM', title: 'E-commerce Developer',
    location: 'Durban, ZA', rate: 30, rating: 0, reviews: 0, success: 0, jobsDone: 0,
    verified: true, preferred: false, newTalent: true,
    about: 'New to Trove but not new to Shopify — 6 years of agency experience shipping stores for retail and FMCG brands. Imported portfolio and references available.',
    skills: ['Shopify', 'CSS', 'Klaviyo', 'Figma'],
    portfolio: ['Retail Hub', 'FMCG Direct', 'StyleCraft'],
    packages: [{ title: 'Landing page sprint', desc: 'High-converting landing page in 5 days', from: 250 }],
    reviewsList: [],
  },
  {
    id: 'liam-osei', name: 'Liam Osei', initials: 'LO', title: 'Full-stack Web Developer',
    location: 'Accra, GH', rate: 42, rating: 4.7, reviews: 23, success: 96, jobsDone: 28,
    verified: true, preferred: true, newTalent: false,
    about: 'Full-stack developer (Laravel, React, Postgres) building marketplaces and SaaS dashboards for startups.',
    skills: ['Laravel', 'React', 'PostgreSQL', 'Stripe', 'AWS'],
    portfolio: ['MarketLink', 'PayFlow', 'TaskHive'],
    packages: [{ title: 'MVP build', desc: 'Web MVP in 3 weeks', from: 2400 }],
    reviewsList: [
      { client: 'MarketLink', project: 'Marketplace MVP', stars: 5, text: 'Shipped a working two-sided marketplace in under a month.', date: 'Jun 2026' },
    ],
  },
];

export const jobs: Job[] = [
  {
    id: 'shopify-build', title: 'Shopify store build for skincare brand', budget: '$800–1,200', type: 'Fixed',
    posted: '2 hours ago', bids: 12, clientVerified: true, clientRating: 4.8,
    category: 'E-commerce', skills: ['Shopify', 'Liquid', 'Theme dev'], match: 92,
    desc: 'We are launching a premium skincare line and need a fully built Shopify store — 5 pages, product catalogue setup for up to 30 products, and a clean, conversion-focused design. Brand kit and copy are ready.',
    deliverables: ['Fully built Shopify store (5 pages)', 'Product catalogue setup (up to 30 products)'],
    revisions: 2, timeline: 'By a set date — 3 weeks',
  },
  {
    id: 'liquid-theme', title: 'Liquid theme customization', budget: '$800–1,200', type: 'Fixed',
    posted: '5 hours ago', bids: 3, clientVerified: true, clientRating: 5.0,
    category: 'E-commerce', skills: ['Shopify', 'Liquid'], match: 92,
    desc: 'Customize our Dawn-based theme: mega menu, product bundles section, and sticky add-to-cart. Design specs provided in Figma.',
    deliverables: ['Customized theme deployed to live store', 'Source in shared GitHub repo'],
    revisions: 2, timeline: '2 weeks',
  },
  {
    id: 'speed-opt', title: 'Shopify speed optimization', budget: '$500', type: 'Fixed',
    posted: '1 day ago', bids: 7, clientVerified: true, clientRating: 4.6,
    category: 'E-commerce', skills: ['Shopify', 'Performance'], match: 87,
    desc: 'Store scores 34 on mobile PageSpeed. Need a full performance pass: image optimization, app cleanup, lazy loading, and code minification. Target 70+.',
    deliverables: ['PageSpeed 70+ on mobile', 'Before/after report'],
    revisions: 1, timeline: '1 week',
  },
  {
    id: 'marketplace-mvp', title: 'Two-sided marketplace MVP (web)', budget: '$2,000–3,500', type: 'Fixed',
    posted: '1 day ago', bids: 18, clientVerified: false, clientRating: 0,
    category: 'Web development', skills: ['React', 'Node.js', 'Stripe'], match: 74,
    desc: 'Build an MVP for a services marketplace: auth, listings, search, checkout with escrow-style payments, and an admin panel.',
    deliverables: ['Deployed MVP', 'Admin panel', 'Source code + docs'],
    revisions: 2, timeline: '4–6 weeks',
  },
  {
    id: 'brand-refresh', title: 'Brand refresh + landing page', budget: '$400–700', type: 'Fixed',
    posted: '2 days ago', bids: 9, clientVerified: true, clientRating: 4.9,
    category: 'Design', skills: ['Figma', 'Branding', 'Webflow'], match: 61,
    desc: 'Refresh our logo, palette and typography, then apply it to a new one-page marketing site in Webflow.',
    deliverables: ['Brand kit (logo, colors, type)', 'Live Webflow landing page'],
    revisions: 3, timeline: '2 weeks',
  },
];

export const contracts: Contract[] = [
  {
    id: 'aurelia-build', title: 'Shopify store build — Aurelia Skincare',
    client: 'Aurelia Skincare', freelancer: 'Jane Doe', amount: 1080,
    status: 'In progress',
    milestones: [
      { title: 'Homepage & catalogue', amount: 800, state: 'done', due: 'Completed Jul 1' },
      { title: 'Remaining pages & checkout polish', amount: 180, state: 'now', due: 'Due in 4 days' },
      { title: 'Launch & handover', amount: 100, state: 'todo', due: 'Due Jul 24' },
    ],
  },
  {
    id: 'northwind-cro', title: 'CRO audit — Northwind Co.',
    client: 'Northwind Co.', freelancer: 'Jane Doe', amount: 450,
    status: 'Submitted',
    milestones: [
      { title: 'Full audit report + fixes list', amount: 450, state: 'now', due: 'Awaiting client approval' },
    ],
  },
];

export const threads = [
  {
    id: 'aurelia', name: 'Aurelia Skincare', initials: 'AC', last: 'Perfect, the catalogue looks great. One question on…', time: '2:41 PM',
    msgs: [
      { me: false, text: 'Hi Jane! Just reviewed milestone 1 — the homepage looks fantastic.', time: '2:20 PM' },
      { me: false, text: 'Perfect, the catalogue looks great. One question on the bundles section — can we swap the order?', time: '2:41 PM' },
      { me: true, text: 'Absolutely — I can reorder those today. It’s within the current scope.', time: '2:44 PM' },
    ],
  },
  {
    id: 'northwind', name: 'Northwind Co.', initials: 'NC', last: 'Thanks — reviewing the audit this week.', time: 'Mon',
    msgs: [
      { me: true, text: 'Audit submitted! The report covers 23 issues ranked by impact.', time: 'Mon 10:02 AM' },
      { me: false, text: 'Thanks — reviewing the audit this week.', time: 'Mon 4:18 PM' },
    ],
  },
  {
    id: 'guardian', name: 'Trove Guardian', initials: '🛡', last: 'Milestone 2 is due in 4 days — on track?', time: '9:00 AM',
    msgs: [
      { me: false, text: 'Good morning! Milestone 2 (Aurelia) is due in 4 days — on track? I can help draft a scope note if anything changed.', time: '9:00 AM' },
    ],
  },
];

export const escrow = {
  project: 800, processingRate: 0.054, clientLabel: 'Milestone 1 · Homepage & catalogue',
  freelancerFeeRate: 0.04,
};

export const categories = ['E-commerce', 'Web development', 'Design', 'Marketing', 'Writing', 'Video & Animation'];
