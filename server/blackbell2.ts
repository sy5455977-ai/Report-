import { getUserMemories, readDB, appendUserMemory, getAllTrainedUserKnowledge, addLearnedKnowledge } from "./db";

// Comprehensive intent types for professional knowledge assistance
type Intent = 
  | 'GREETING'
  | 'IDENTITY'
  | 'TECH_CODING'
  | 'MANAGEMENT'
  | 'INTERNET'
  | 'GST_TAX'
  | 'AI_CONCEPT'
  | 'CONSTITUTION'
  | 'SCIENCE'
  | 'MATH_FACTS'
  | 'TIME_WEATHER'
  | 'DEFAULT';

interface KnowledgeConcept {
  keywords: string[];
  response: (userName: string, query: string) => string;
  questions: string[];
}

// Built-in intelligent concept knowledge graph for instant, direct, professional answers
const KNOWLEDGE_GRAPH: KnowledgeConcept[] = [
  {
    keywords: ['management', 'prabandhan', 'prabandh'],
    response: () => `Management (प्रबंधन) kisi organization, business ya project ke resources (people, money, technology aur time) ko efficiently plan, organize, direct aur control karne ka process hai taaki targeted goals achieve ho sakein.

Management Ke 5 Mukhya Kary (Core Functions):
1. Planning (योजना): Objectives aur unhe achieve karne ke raste tay karna.
2. Organizing (संगठन): Resources ko arrange karna aur roles assign karna.
3. Staffing (नियुक्ति): Right roles ke liye skilled logon ka chayan karna.
4. Directing (निर्देशन): Team ko motivate, communicate aur lead karna.
5. Controlling (नियंत्रण): Performance monitor karna aur zaruri sudhar karna.

Importance:
- Optimum utilization of resources
- Productivity aur efficiency mein badhotari
- Teamwork aur organizational coordination

Conclusion:
Management kisi bhi enterprise ya project ki safalta aur sustainable growth ka adhar hai.`,
    questions: [
      "Management ke 3 levels (Top, Middle, Operational) kya hote hain?",
      "Leadership aur Management mein mukhya difference kya hai?",
      "Henri Fayol ke 14 principles of management kya hain?"
    ]
  },
  {
    keywords: ['types of internet', 'internet ke types', 'internet types', 'types of network'],
    response: () => `Internet ko mukhya roop se do aadharon par classify kiya jaata hai: Network Coverage (Geographical Area) aur Connection Technology.

1. Geographical Coverage Ke Aadhar Par Networks:
- LAN (Local Area Network): Ek building ya office ke andar limited devices ko connect karta hai.
- MAN (Metropolitan Area Network): Ek poore city ya campus ko cover karta hai (jaise cable TV network).
- WAN (Wide Area Network): Desh aur poori duniya ke computers ko connect karta hai (Internet sabse bada WAN hai).
- PAN (Personal Area Network): Personal devices ke beech connection (jaise Bluetooth/Hotspot).

2. Internet Connection Technologies:
- Broadband / DSL: Traditional telephone wire par high-speed data.
- Fiber Optic: Light pulses ke zariye ultra-fast speed transfer karta hai.
- Wireless / Wi-Fi: Radio waves ke dwara devices ko connect karta hai.
- Cellular (4G/5G): Mobile tower networks ke zariye wireless internet deta hai.
- Satellite Internet: Direct satellite communication (jaise Starlink) jo remote areas mein kaam karta hai.

Conclusion:
Coverage aur speed requirements ke anusaar alag-alag network types aur connection mediums ka upyog kiya jaata hai.`,
    questions: [
      "LAN, MAN aur WAN mein key differences kya hain?",
      "Fiber optic cable broadband se fast kyu hoti hai?",
      "5G network 4G se kis tarah alag aur behtar hai?"
    ]
  },
  {
    keywords: ['internet kya', 'what is internet', 'internet define', 'internet explain'],
    response: () => `Internet ek global computer network hai jo duniya bhar ke billions computers, servers aur smart devices ko standardized communication protocols (TCP/IP) ke madhyam se aapas mein connect karta hai.

Internet Kaise Kaam Karta Hai?
1. Servers: Data, websites aur media store karte hain.
2. Clients: Users ke browsers aur devices jo information request karte hain.
3. Data Packets: Information chhote packets mein divide hokar travel karti hai.
4. Protocols: TCP/IP, HTTP, HTTPS rules define karte hain ki data safely kaise transfer hoga.

Internet Ke Mukhya Uses:
1. Communication (Email, messaging, video calls)
2. Information & Research (Search engines, digital libraries)
3. Online Commerce & Banking (Shopping, digital payments)
4. Education & Learning (Online courses, webinars)
5. Entertainment (Streaming, gaming)

Conclusion:
Internet modern information era ki foundation hai, jo global connectivity aur data sharing ko sambhav banata hai.`,
    questions: [
      "Internet aur World Wide Web (WWW) mein kya difference hai?",
      "TCP/IP protocol suite kaise kaam karta hai?",
      "Internet ke advantages aur cyber security risks kya hain?"
    ]
  },
  {
    keywords: ['gst', 'goods and services tax', 'gst tax', 'tax kya'],
    response: () => `GST (Goods and Services Tax) Bharat mein 1 July 2017 ko lagu kiya gaya ek comprehensive indirect tax hai, jisne purane kai state aur central taxes (VAT, Service Tax, Excise Duty) ko replace kiya. Iska mukhya uddeshya "One Nation, One Tax" implement karna tha.

GST Ke Mukhya Components:
1. CGST (Central GST): Central government collect karti hai intrastate transaction par.
2. SGST (State GST): State government collect karti hai intrastate transaction par.
3. IGST (Integrated GST): Interstate transaction par central government collect karke state ke saath share karti hai.

GST Tax Slabs:
- 0%: Essential items (Fresh food, milk, grains)
- 5%: Basic mass consumption goods (Packaged food, footwear < ₹500)
- 12%: Processed items (Butter, computers, mobiles)
- 18%: Most services and goods (Financial services, restaurants)
- 28%: Luxury and demerit goods (Luxury cars, tobacco, aerated drinks)

Input Tax Credit (ITC):
Vyapaari apne purchase par diye gaye GST ko apne output tax liability se set-off kar sakte hain, jisse cascading effect (tax par tax) samapt hota hai.

Conclusion:
GST ne Bharat ke tax structure ko transparent, digital aur uniform banaya hai.`,
    questions: [
      "Input Tax Credit (ITC) claim karne ka rule kya hai?",
      "CGST, SGST aur IGST mein specific difference kya hai?",
      "GST registration ke liye annual turnover threshold kya hai?"
    ]
  },
  {
    keywords: ['artificial intelligence', 'ai kya', 'what is ai', 'ai explain'],
    response: () => `Artificial Intelligence (AI) computer science ki ek shakha hai jo aisi machines aur algorithms develop karti hai jo human intelligence jaise tasks perform kar sakein—jaise learning, reasoning, problem solving aur decision making.

AI Ke Mukhya Categories:
1. Narrow AI (Weak AI): Kisi ek specific task mein expert (jaise ChatGPT, Siri, recommendation engines). Aaj ka saara active AI yahi hai.
2. General AI (AGI): Manav ke barabar har domain mein dimaagi kaam karne ki theoretical kshamta.
3. Super AI (ASI): Manav se kahin aage nikalne wali theoretical stage.

AI Ke Key Sub-domains:
- Machine Learning (ML): Data se patterns seekhkar predictions banana.
- Deep Learning (DL): Multi-layered artificial neural networks par aadharit models.
- Natural Language Processing (NLP): Bhasha ko samajhna aur generate karna.
- Computer Vision: Photos aur videos ko analyze aur recognize karna.

Conclusion:
AI automation, healthcare diagnostics, software development aur research ko revolutionize kar raha hai.`,
    questions: [
      "AI, Machine Learning aur Deep Learning mein kya hierarchy hai?",
      "Generative AI aur Traditional AI mein kya antar hai?",
      "AI ke ethical concerns aur future risks kya hain?"
    ]
  },
  {
    keywords: ['संविधान', 'samvidhan', 'constitution of india', 'samvidhaan'],
    response: () => `भारत का संविधान 26 जनवरी 1950 को पूर्ण रूप से लागू हुआ था, और इसी उपलक्ष्य में प्रतिवर्ष 26 जनवरी को गणतंत्र दिवस (Republic Day) मनाया जाता है। इसे 26 नवंबर 1949 को संविधान सभा (Constituent Assembly) द्वारा औपचारिक रूप से अंगीकृत (Adopt) किया गया था।

मुख्य ऐतिहासिक तथ्य:
1. निर्माण समय: संविधान बनाने में 2 वर्ष, 11 महीने और 18 दिन लगे।
2. प्रारूप समिति (Drafting Committee): इसके अध्यक्ष डॉ. भीमराव अंबेडकर थे, जिन्हें भारतीय संविधान का जनक माना जाता है।
3. स्वरूप: यह विश्व का सबसे लंबा हस्तलिखित संविधान है।
4. मूल संरचना: लागू होते समय इसमें 395 अनुच्छेद, 22 भाग और 8 अनुसूचियां थीं (वर्तमान में 448+ अनुच्छेद, 25 भाग और 12 अनुसूचियां हैं)।

प्रमुख विशेषताएं:
- संप्रभु, समाजवादी, धर्मनिरपेक्ष, लोकतांत्रिक गणराज्य
- मौलिक अधिकार (Fundamental Rights) और मौलिक कर्तव्य
- स्वतंत्र न्यायपालिका और त्रिस्तरीय शासन प्रणाली

निष्कर्ष:
भारतीय संविधान देश का सर्वोच्च कानून है जो नागरिकों को न्याय, स्वतंत्रता और समानता की गारंटी देता है।`,
    questions: [
      "संविधान के 6 मौलिक अधिकार कौन-कौन से हैं?",
      "प्रस्तावना (Preamble) का मूल अर्थ और महत्व क्या है?",
      "संविधान संशोधन की प्रक्रिया (अनुच्छेद 368) क्या है?"
    ]
  },
  {
    keywords: ['html', 'css', 'difference between html and css', 'html aur css'],
    response: () => `HTML aur CSS web development ki do sabse mukhya building blocks hain:

HTML (HyperText Markup Language):
- Kaam: Webpage ka structure aur content define karna (Headings, paragraphs, images, links, forms).
- Nature: Markup language hai, programming language nahi.
- Extension: \`.html\`

CSS (Cascading Style Sheets):
- Kaam: Webpage ke visual presentation, layout, colors, fonts aur responsive design ko style karna.
- Nature: Style sheet language.
- Extension: \`.css\`

Key Comparison:
| Feature | HTML | CSS |
|---|---|---|
| Primary Role | Content aur Structure | Design aur Styling |
| Component | Elements & Tags (\`<h1>\`, \`<p>\`, \`<div>\`) | Selectors & Rules (\`color\`, \`margin\`, \`display\`) |
| Analogy | Human skeleton (haddiyan) | Skin, clothing aur look |
| Execution | Browser content render karta hai | Browser style rules apply karta hai |

Conclusion:
HTML bina CSS ke sirf raw plain text dikhega, aur CSS bina HTML ke render hone ke liye koi structure nahi paayega. Dono milkar modern web experiences banate hain.`,
    questions: [
      "CSS Flexbox aur Grid layout mein kya difference hai?",
      "HTML5 ke top semantic tags kaunse hain aur kyu use hote hain?",
      "Responsive web design ke liye CSS Media Queries kaise likhte hain?"
    ]
  },
  {
    keywords: ['javascript', 'typescript', 'python', 'code', 'coding', 'react', 'developer'],
    response: () => `Software engineering aur modern programming mein high quality code likhne ke liye structured architecture aur clear design principles sabse zaroori hain.

Core Best Practices:
1. DRY (Don't Repeat Yourself): Logic ko reusable functions aur modules mein break karein.
2. SOLID Principles: Code maintainable aur extendable banayein.
3. Clean Architecture: Business logic, state management aur UI layer ko separate rakhein.
4. Error Handling: Network failures, null checks aur edge cases ko gracefully handle karein.

Aap specific problem statement ya code snippet share kar sakte hain for review, debugging ya architecture planning.`,
    questions: [
      "Modular clean code design ke practical steps kya hain?",
      "Async/Await aur Promises mein error handling kaise improve karein?",
      "Frontend aur backend ke beech API contracts kaise structure karein?"
    ]
  },
  {
    keywords: ['krishna', 'geeta', 'gita', 'bhagavad', 'karm', 'karma'],
    response: () => `Shrimad Bhagavad Gita ka mukhya dharshan Nishkam Karma Yog hai:
**"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"** (अध्याय 2, श्लोक 47)

Core Principles:
1. Karm Par Adhikar: Insaan ka niyanatran keval apne karm, mehnat aur nishtha par hai, uske parinaam (phal) par nahi.
2. Asakti Rahit Kary: Parinaam ki chinta chhodkar kartavya samajhkar kaam karna mansik shanti aur shreshth output deta hai.
3. Sthitaprajna: Sukh-dukh aur safalta-asafalta mein dimaagi santulan maintain karna.

Conclusion:
Ye philosophy human psychological resilience aur focus badhane ka timeless guide hai.`,
    questions: [
      "Dharamsankat aur decision-making mein Gita ka kya sandesh hai?",
      "Gita ke 18 adhyayon ka mukhya saar kya hai?",
      "Nishkam Karma ko modern professional life mein kaise apply karein?"
    ]
  }
];

// Contextual responses template matrices (100% professional, zero flattery, zero baby talk)
const TEMPLATES: Record<Intent, string[]> = {
  GREETING: [
    "Hello! Main BLACKBELL AI hoon, aapka professional knowledge assistant. Aaj main aapki kis vishay mein sahayata kar sakta hoon?",
    "Namaste! Main BLACKBELL AI hoon. Aap technology, science, business ya general knowledge se related koi bhi sawaal poochh sakte hain."
  ],
  IDENTITY: [
    "Main BLACKBELL AI hoon—ek professional knowledge assistant aur software builder. Mera uddeshya direct, accurate aur well-structured information provide karna hai."
  ],
  TECH_CODING: [
    "Software development aur architecture mein aap jo feature build ya debug karna chahte hain, kripya uska exact context ya requirements share karein."
  ],
  MANAGEMENT: [
    "Management kisi organization ya project ko effectively organize karne aur strategic goals achieve karne ki vidya hai."
  ],
  INTERNET: [
    "Internet global computer networks ka network hai jo devices ko digital communication aur information sharing ke liye connect karta hai."
  ],
  GST_TAX: [
    "GST ek comprehensive indirect tax hai jo goods aur services ke supply par Bharat mein laagu hota hai."
  ],
  AI_CONCEPT: [
    "Artificial Intelligence computer systems ko human-like cognitive abilities (learning, reasoning, problem-solving) provide karne ka domain hai."
  ],
  CONSTITUTION: [
    "Samvidhan kisi bhi rashtra ka supreme law hota hai jo state structures aur citizens ke rights define karta hai."
  ],
  SCIENCE: [
    "Vigyan (Science) prakriti aur universe ke rules ko empirical evidence, experimentation aur logic ke aadhar par samajhne ka system hai."
  ],
  MATH_FACTS: [
    "Mathematics logic, numbers aur patterns ka universal science hai. Aap koi bhi calculation ya theorem evaluate karne ke liye query enter kar sakte hain."
  ],
  TIME_WEATHER: [
    "Vartaman samay aur tarikh digital clocks ke standard coordinated time (IST) ke aadhar par sync hoti hai."
  ],
  DEFAULT: [
    "Aapka prashn note kiya gaya hai. Is vishay par vistaar se samajhne ke liye specific details share karein, ya neeche diye gaye related points par click karein."
  ]
};

// Clickable follow-up questions templates (100% professional and relevant)
const FOLLOW_UPS: Record<Intent, string[]> = {
  GREETING: [
    "Internet kya hai aur kaise kaam karta hai?",
    "Artificial Intelligence ke baare mein samjhaiye",
    "GST Tax structure aur slabs kya hain?"
  ],
  IDENTITY: [
    "BLACKBELL AI ki core capabilities kya hain?",
    "Single-file web applications kaise build karein?",
    "Code architecture aur debugging mein help kaise milegi?"
  ],
  TECH_CODING: [
    "Is logic ko clean aur maintainable kaise banayein?",
    "Clean architecture design patterns kya hain?",
    "Frontend aur backend ke standard practices kya hain?"
  ],
  MANAGEMENT: [
    "Management ke 5 primary functions kya hain?",
    "Leadership aur management mein kya difference hai?",
    "Strategic planning aur execution ke key steps kya hain?"
  ],
  INTERNET: [
    "Internet aur WWW mein kya difference hai?",
    "Internet kaise kaam karta hai step-by-step?",
    "Network types (LAN, WAN, MAN) kya hote hain?"
  ],
  GST_TAX: [
    "Input Tax Credit (ITC) kaise kaam karta hai?",
    "CGST, SGST aur IGST mein kya farak hai?",
    "GST slabs aur tax rates ka detail breakdown kya hai?"
  ],
  AI_CONCEPT: [
    "AI, Machine Learning aur Deep Learning mein kya difference hai?",
    "Narrow AI aur General AI (AGI) mein kya difference hai?",
    "AI ke practical industry applications kaunse hain?"
  ],
  CONSTITUTION: [
    "भारतीय संविधान के 6 मौलिक अधिकार कौन से हैं?",
    "संविधान सभा का गठन और इतिहास क्या है?",
    "संविधान की प्रस्तावना (Preamble) का क्या महत्व है?"
  ],
  SCIENCE: [
    "Is scientific concept ke underlying principles kya hain?",
    "Iska real-world experimental evidence kya hai?",
    "Future research aur applications kya hain?"
  ],
  MATH_FACTS: [
    "Is equation ya formula ka step-by-step derivation kya hai?",
    "Is mathematical principle ka practical application kya hai?",
    "Related problem solve karne ke shortcut techniques kya hain?"
  ],
  TIME_WEATHER: [
    "Time zones aur IST calculation kaise hoti hai?",
    "Calendar system aur leap year logic kya hai?",
    "Productive daily scheduling kaise set karein?"
  ],
  DEFAULT: [
    "Is topic ke practical examples aur real-world uses kya hain?",
    "Iske key advantages aur limitations kya hain?",
    "Isko step-by-step detail mein kaise samjhein?"
  ]
};

/**
 * Parses user input to identify dominant professional intent
 */
function parseIntent(message: string): Intent {
  const clean = message.toLowerCase().trim();

  if (clean.includes('management') || clean.includes('prabandhan') || clean.includes('prabandh') || clean.includes('organization') || clean.includes('leadership')) {
    return 'MANAGEMENT';
  }
  if (clean.includes('types of internet') || clean.includes('internet types') || clean.includes('network types') || clean.includes('lan wan')) {
    return 'INTERNET';
  }
  if (clean.includes('internet') || clean.includes('wifi') || clean.includes('broadband') || clean.includes('tcp/ip') || clean.includes('web network')) {
    return 'INTERNET';
  }
  if (clean.includes('gst') || clean.includes('tax') || clean.includes('cgst') || clean.includes('sgst') || clean.includes('income tax')) {
    return 'GST_TAX';
  }
  if (clean.includes('artificial intelligence') || clean.includes('ai kya') || clean.includes('what is ai') || clean.includes('machine learning') || clean.includes('deep learning')) {
    return 'AI_CONCEPT';
  }
  if (clean.includes('संविधान') || clean.includes('samvidhan') || clean.includes('constitution') || clean.includes('ambedkar') || clean.includes('fundamental rights')) {
    return 'CONSTITUTION';
  }
  if (clean.includes('who are you') || clean.includes('tum kaun ho') || clean.includes('kaun ho') || clean.includes('blackbell') || clean.includes('what are you')) {
    return 'IDENTITY';
  }
  if (clean.includes('code') || clean.includes('coding') || clean.includes('react') || clean.includes('javascript') || clean.includes('python') || clean.includes('typescript') || clean.includes('html') || clean.includes('css')) {
    return 'TECH_CODING';
  }
  if (clean.includes('science') || clean.includes('physics') || clean.includes('chemistry') || clean.includes('biology') || clean.includes('quantum') || clean.includes('gravity')) {
    return 'SCIENCE';
  }
  if (clean.includes('math') || clean.includes('calculate') || clean.includes('plus') || clean.includes('minus') || clean.includes('formula') || clean.includes('equation')) {
    return 'MATH_FACTS';
  }
  if (clean.includes('time') || clean.includes('ghadi') || clean.includes('date') || clean.includes('tarikh') || clean.includes('samay')) {
    return 'TIME_WEATHER';
  }
  if (clean.includes('hello') || clean.includes('hey') || clean.includes('hi ') || clean === 'hi' || clean.includes('namaste') || clean.includes('kaise ho')) {
    return 'GREETING';
  }

  return 'DEFAULT';
}

/**
 * Autonomous Local Self-Learning Knowledge Extractor (facts only, no flattery)
 */
export function extractAndLearnLocally(userEmail: string, userMessage: string): void {
  if (!userEmail || !userMessage) return;
  const clean = userMessage.trim();
  const lower = clean.toLowerCase();

  let learnedFact = '';
  if (lower.startsWith('mera naam') || lower.includes('my name is')) {
    const match = clean.match(/(?:mera naam|my name is)\s+([a-zA-Z0-9\s_]+)/i);
    if (match && match[1]) {
      learnedFact = `Name: ${match[1].trim()}`;
    }
  } else if (lower.includes('i want to learn') || lower.includes('mujhe seekhna hai')) {
    learnedFact = `Learning Goal: ${clean.substring(0, 60)}`;
  } else if (lower.includes('coding') || lower.includes('developer') || lower.includes('science')) {
    learnedFact = `Subject Interest: ${clean.substring(0, 60)}`;
  }

  if (learnedFact && learnedFact.length > 3) {
    appendUserMemory(userEmail, learnedFact);
  }
}

/**
 * Main generator for Blackbell 2.0 Offline/Self-Hosted Engine Responses
 * 100% direct, factual, structured, and free of any flattery, baby talk, or emotional chatting.
 */
export function generateBlackbell2Response(
  message: string,
  history: any[],
  userName: string,
  memories: string[]
): string {
  const cleanMsg = (message || '').trim();
  const lowerMsg = cleanMsg.toLowerCase();

  // 1. Check Knowledge Graph for precise contextual match
  for (const concept of KNOWLEDGE_GRAPH) {
    const matches = concept.keywords.some(k => lowerMsg.includes(k));
    if (matches) {
      const graphResponse = concept.response(userName, cleanMsg);
      const qBlock = `\n\n[QUESTIONS]\n- ${concept.questions[0]}\n- ${concept.questions[1]}\n- ${concept.questions[2]}`;
      return graphResponse + qBlock;
    }
  }

  // 2. Check Database Knowledge Items dynamically stored by Admin/Self-Learning (only if specifically relevant)
  try {
    const db = readDB();
    if (db.knowledge && db.knowledge.length > 0) {
      const matchedDbItem = db.knowledge.find(k => {
        const cleanTitle = k.title.toLowerCase().replace(/^\[live trend\]\s*/i, '').trim();
        return cleanTitle.length > 4 && lowerMsg.includes(cleanTitle);
      });
      if (matchedDbItem) {
        const dynResponse = `**${matchedDbItem.title}**\n\n${matchedDbItem.content}`;
        const qBlock = `\n\n[QUESTIONS]\n- ${matchedDbItem.title} ke practical applications kya hain?\n- Is topic ke core concepts step-by-step samjhein\n- Is se related next topic kya hona chahiye?`;
        return dynResponse + qBlock;
      }
    }
  } catch (e) {
    // Graceful fallback if SQLite query encounters an issue
  }

  // 3. Fallback to Professional Intent Matrix
  const intent = parseIntent(message);
  const list = TEMPLATES[intent] || TEMPLATES.DEFAULT;
  const randIdx = Math.floor(Math.random() * list.length);
  const responseText = list[randIdx];

  // Choose follow up questions for matching intent
  const qList = FOLLOW_UPS[intent] || FOLLOW_UPS.DEFAULT;
  const questionsBlock = `\n\n[QUESTIONS]\n- ${qList[0]}\n- ${qList[1]}\n- ${qList[2]}`;
  
  return responseText + questionsBlock;
}
