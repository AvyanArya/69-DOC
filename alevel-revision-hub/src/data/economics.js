/* Pearson Edexcel A-level Economics A (9EC0). Components are the spec sections (1.1, 1.2 …),
   grouped by theme; topics are the numbered sub-sections (1.2.3 …). */
(function (RH) {
  'use strict';
  const L = RH.link, r = L.r;

  const THEMES = {
    1: 'Theme 1: Introduction to markets and market failure',
    2: 'Theme 2: The UK economy – performance and policies',
    3: 'Theme 3: Business behaviour and the labour market',
    4: 'Theme 4: A global perspective'
  };
  const PAPERS = { 1: ['p1', 'p3'], 2: ['p2', 'p3'], 3: ['p1', 'p3'], 4: ['p2', 'p3'] };
  const base = 'Economics/A-level/Notes/Edexcel-A/';

  // pmtTitle covers the one section PMT names differently (3.5 "Labour Markets").
  function section(theme, num, title, topics, pmtTitle) {
    const t = 'Theme-' + theme + '/';
    const file = num + '. ' + (pmtTitle || title) + '.pdf';
    return {
      id: 's' + num.replace('.', '-'), name: num + ' ' + title, group: THEMES[theme], papers: PAPERS[theme],
      res: [
        r('pmt', 'notes', 'PMT detailed notes: ' + num + ' ' + title, L.pmtFile(base + t + 'Detailed/' + file)),
        r('pmt', 'notes', 'PMT summary notes: ' + num + ' ' + title, L.pmtFile(base + t + 'Summary/' + file)),
        r('pmt', 'notes', 'PMT key definitions: Theme ' + theme, L.pmtFile(base + t + 'Definitions.pdf')),
        r('pmt', 'cards', 'PMT definition flashcards: Theme ' + theme, L.pmtPage('economics-revision/a-level-edexcel-a/theme-' + theme + '/flashcards/'))
      ],
      topics: topics.map(function (row) {
        return { id: 't' + row[0].replace(/\./g, '-'), name: row[0] + ' ' + row[1], q: row[2], pts: row[3], tip: row[4] || '',
          res: [r('ehelp', 'notes', 'Economics Help articles: ' + row[1], L.search('ehelp', row[2]))] };
      })
    };
  }

  RH.SUBJECT_LIST = RH.SUBJECT_LIST || [];
  RH.SUBJECT_LIST.push({
    id: 'economics', short: 'eco', name: 'Economics', board: 'Pearson Edexcel', spec: '9EC0 (Economics A)',
    video: ['econdal', 't2u', 'twot'],
    papers: [
      { id: 'p1', code: '9EC0/01', name: 'Paper 1: Markets and Business Behaviour', dur: 120, marks: 100, weight: '35%', what: 'Themes 1 and 3. Multiple-choice and short answers, a data response, and one extended essay from a choice of two.' },
      { id: 'p2', code: '9EC0/02', name: 'Paper 2: The National and Global Economy', dur: 120, marks: 100, weight: '35%', what: 'Themes 2 and 4. Same structure as Paper 1.' },
      { id: 'p3', code: '9EC0/03', name: 'Paper 3: Microeconomics and Macroeconomics', dur: 120, marks: 100, weight: '30%', what: 'All four themes, synoptic. Two data-response sections, each ending in an essay choice.' }
    ],
    res: [
      r('pmt', 'notes', 'PMT Edexcel A Economics: all themes', L.pmtPage('economics-revision/a-level-edexcel-a/')),
      r('pmt', 'notes', 'PMT exam technique: A-level papers', L.pmtFile(base + 'Exam Technique - A-level Papers - Edexcel (A) Economics A-level.pdf')),
      r('pmt', 'notes', 'PMT exam technique: essay skills', L.pmtFile(base + 'Exam Technique - Essay Skills - Edexcel (A) Economics A-level.pdf')),
      r('pmt', 'papers', 'PMT Economics past papers', L.pmtPage('past-papers/a-level-economics/')),
      r('sme', 'notes', 'Save My Exams: Edexcel A revision notes', L.sme('economics/edexcel/a/17/revision-notes/')),
      r('sme', 'qs', 'Save My Exams: topic questions', L.sme('economics/edexcel/a/17/topic-questions/')),
      r('sme', 'cards', 'Save My Exams: flashcards', L.sme('economics/edexcel/a/17/flashcards/')),
      r('sme', 'papers', 'Save My Exams: Edexcel A past papers', L.sme('economics/edexcel/a/past-papers/')),
      r('econdal', 'video', 'EconplusDal: every spec point and essay walkthroughs', 'https://www.youtube.com/@EconplusDal/playlists'),
      r('t2u', 'notes', 'tutor2u Economics study notes', 'https://www.tutor2u.net/economics'),
      r('t2u', 'notes', 'tutor2u topic index', 'https://www.tutor2u.net/economics/topics'),
      r('ehelp', 'notes', 'Economics Help', 'https://www.economicshelp.org/blog/'),
      r('eonline', 'notes', 'Economics Online', 'https://www.economicsonline.co.uk/'),
      r('ons', 'other', 'ONS: latest UK GDP, inflation and jobs data', 'https://www.ons.gov.uk/'),
      r('boe', 'other', 'Bank of England Knowledge Bank', 'https://www.bankofengland.co.uk/knowledgebank'),
      r('seneca', 'cards', 'Seneca free courses', 'https://senecalearning.com/en-gb/'),
      r('pearson', 'other', 'Specification, sample papers & examiner reports', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/economics-a-2015.html')
    ],
    comps: [
      section(1, '1.1', 'Nature of Economics', [
        ['1.1.1', 'Economics as a social science', 'economics as a social science', ['Explain why economists use models and assumptions', 'Use ceteris paribus', 'Explain why economists cannot run controlled experiments']],
        ['1.1.2', 'Positive and normative statements', 'positive and normative statements', ['Tell positive from normative statements', 'Explain how value judgements affect policy decisions']],
        ['1.1.3', 'The economic problem', 'the economic problem scarcity', ['Explain scarcity, choice and opportunity cost', 'Describe the four factors of production and their rewards', 'Tell renewable from non-renewable resources']],
        ['1.1.4', 'Production possibility frontiers', 'production possibility frontier', ['Draw PPFs and show opportunity cost', 'Explain the shape of the PPF', 'Show economic growth and decline with shifts', 'Tell capital goods from consumer goods'], 'Diagram: PPF with movement along vs outward shift.'],
        ['1.1.5', 'Specialisation and the division of labour', 'specialisation division of labour', ["Explain Adam Smith's division of labour", 'Give advantages and disadvantages of specialisation', 'Explain the functions of money']],
        ['1.1.6', 'Free market, mixed and command economies', 'free market command mixed economy', ['Compare free market, command and mixed economies', 'Know the views of Smith, Hayek and Marx', 'Evaluate the role of the state']]
      ]),
      section(1, '1.2', 'How Markets Work', [
        ['1.2.1', 'Rational decision making', 'rational decision making', ['Explain the assumptions of rational consumers and firms', 'Link utility maximisation and profit maximisation']],
        ['1.2.2', 'Demand', 'demand curve shifts', ['Tell movements along the demand curve from shifts', 'List the factors that shift demand', 'Explain diminishing marginal utility'], 'Diagram: demand shift vs movement.'],
        ['1.2.3', 'Price, income and cross elasticities of demand', 'price elasticity of demand', ['Calculate and interpret PED, YED and XED', 'Explain the factors that affect PED', 'Link PED to total revenue', 'Explain the significance of elasticities to firms and government']],
        ['1.2.4', 'Price elasticity of supply', 'price elasticity of supply', ['Calculate and interpret PES', 'Explain the factors that affect PES', 'Tell short-run from long-run PES']],
        ['1.2.5', 'Supply', 'supply curve', ['Tell movements along the supply curve from shifts', 'List the factors that shift supply']],
        ['1.2.6', 'Price determination', 'equilibrium price excess demand', ['Find equilibrium price and quantity', 'Explain excess demand and excess supply', 'Analyse shifts in demand and supply in related markets (joint, competitive, composite, derived demand)'], 'Diagram: supply and demand with a shift and new equilibrium.'],
        ['1.2.7', 'Price mechanism', 'price mechanism rationing signalling incentive', ['Explain the rationing, incentive and signalling functions', 'Apply the price mechanism to local, national and global markets']],
        ['1.2.8', 'Consumer and producer surplus', 'consumer surplus producer surplus', ['Show consumer and producer surplus on a diagram', 'Explain how surplus changes when demand or supply shifts']],
        ['1.2.9', 'Indirect taxes and subsidies', 'indirect tax subsidy incidence', ['Show specific and ad valorem taxes on diagrams', 'Find tax incidence on consumers and producers', 'Show subsidies, cost to government and areas gained', 'Link incidence to elasticity'], 'Diagram: specific tax with incidence shaded.'],
        ['1.2.10', 'Alternative views of consumer behaviour', 'behavioural economics consumer behaviour', ['Explain why consumers may not behave rationally', 'Use bounded rationality, bounded self-control, biases (rules of thumb, anchoring, availability)', 'Explain social norms and altruism']]
      ]),
      section(1, '1.3', 'Market Failure', [
        ['1.3.1', 'Types of market failure', 'types of market failure', ['Define market failure', 'Identify externalities, under-provision of public goods and information gaps']],
        ['1.3.2', 'Externalities', 'negative externalities positive externalities', ['Tell private, external and social costs and benefits apart', 'Draw negative production and positive consumption externality diagrams', 'Show the welfare loss triangle', 'Explain the impact on third parties'], 'Diagrams: MSC above MPC (negative), MSB above MPB (positive).'],
        ['1.3.3', 'Public goods', 'public goods free rider problem', ['Explain non-rivalry and non-excludability', 'Tell public goods from private and quasi-public goods', 'Explain the free-rider problem']],
        ['1.3.4', 'Information gaps', 'information gaps asymmetric information', ['Explain symmetric and asymmetric information', 'Show how information gaps cause misallocation of resources']]
      ]),
      section(1, '1.4', 'Government Intervention', [
        ['1.4.1', 'Government intervention in markets', 'government intervention market failure', ['Analyse indirect taxes, subsidies, maximum and minimum prices', 'Analyse tradable pollution permits', 'Analyse state provision, information provision and regulation', 'Evaluate each method'], 'Diagrams: maximum price, minimum price, tax on a negative externality.'],
        ['1.4.2', 'Government failure', 'government failure', ['Define government failure', 'Explain causes: distortion of price signals, unintended consequences, excessive admin costs, information gaps', 'Give real examples (e.g. CAP, rent controls)']]
      ]),

      section(2, '2.1', 'Measures of Economic Performance', [
        ['2.1.1', 'Economic growth', 'GDP real nominal economic growth', ['Define GDP, real vs nominal, total vs per capita', 'Use GNI and PPP for comparisons', 'Explain limitations of GDP for comparing living standards', 'Discuss national happiness and well-being measures']],
        ['2.1.2', 'Inflation', 'inflation CPI RPI demand pull cost push', ['Define inflation, deflation and disinflation', 'Explain how CPI and RPI are calculated and their limits', 'Explain demand-pull, cost-push and money-supply causes', 'Analyse the effects of inflation on stakeholders']],
        ['2.1.3', 'Employment and unemployment', 'unemployment causes claimant count ILO', ['Tell unemployment from underemployment', 'Compare the claimant count and ILO measures', 'Explain structural, frictional, seasonal and cyclical unemployment', 'Discuss real-wage unemployment and the effects of migration', 'Analyse the effects of unemployment']],
        ['2.1.4', 'Balance of payments', 'balance of payments current account', ['Describe the components of the current account', 'Explain causes of current account deficits and surpluses', 'Discuss the links with other macro objectives']]
      ]),
      section(2, '2.2', 'Aggregate Demand', [
        ['2.2.1', 'The characteristics of AD', 'aggregate demand curve', ['Define AD = C + I + G + (X − M)', 'Explain the shape of the AD curve', 'Tell movements along AD from shifts']],
        ['2.2.2', 'Consumption (C)', 'consumption marginal propensity to consume', ['Explain influences on consumption: interest rates, wealth, confidence, income, availability of credit', 'Use the marginal propensity to consume and save']],
        ['2.2.3', 'Investment (I)', 'investment accelerator', ['Tell gross from net investment', 'Explain influences on investment: growth, expectations, interest rates, access to credit, government', 'Explain the accelerator']],
        ['2.2.4', 'Government expenditure (G)', 'government spending fiscal', ['Explain influences on government spending: the trade cycle and fiscal policy', 'Distinguish current and capital spending']],
        ['2.2.5', 'Net trade (X − M)', 'net trade exports imports exchange rate', ['Explain how real income, exchange rates, the world economy, protectionism and non-price factors affect net trade']]
      ]),
      section(2, '2.3', 'Aggregate Supply', [
        ['2.3.1', 'The characteristics of AS', 'aggregate supply', ['Explain the shape of the short-run AS curve', 'Tell movements along AS from shifts']],
        ['2.3.2', 'Short-run AS', 'short run aggregate supply', ['Explain factors that shift SRAS: raw material and energy costs, exchange rates, tax rates, wages']],
        ['2.3.3', 'Long-run AS', 'long run aggregate supply Keynesian classical', ['Compare Keynesian and classical LRAS curves', 'Explain factors that shift LRAS: technology, productivity, education, demography, competition', 'Show LRAS shifts on a diagram'], 'Diagrams: Keynesian LRAS (three ranges) and vertical classical LRAS.']
      ]),
      section(2, '2.4', 'National Income', [
        ['2.4.1', 'National income', 'circular flow of income', ['Tell income from wealth', 'Explain the circular flow of income']],
        ['2.4.2', 'Injections and withdrawals', 'injections withdrawals circular flow', ['Identify injections (I, G, X) and withdrawals (S, T, M)', 'Explain how changes affect national income']],
        ['2.4.3', 'Equilibrium levels of real national output', 'macroeconomic equilibrium AD AS', ['Show equilibrium where AD = AS', 'Analyse shifts in AD and AS on output and price level']],
        ['2.4.4', 'The multiplier', 'multiplier effect', ['Explain the multiplier process', 'Calculate the multiplier using 1/(1 − MPC) or 1/MPW', 'Evaluate the significance of the multiplier']]
      ]),
      section(2, '2.5', 'Economic Growth', [
        ['2.5.1', 'Causes of growth', 'causes of economic growth', ['Tell actual growth from potential growth', 'Explain the causes of each', 'Discuss export-led growth']],
        ['2.5.2', 'Output gaps', 'output gap', ['Define positive and negative output gaps', 'Show output gaps on a diagram', 'Explain the difficulties of measuring them']],
        ['2.5.3', 'Trade (business) cycle', 'business cycle', ['Describe the phases of the trade cycle', 'Explain booms, recessions and demand-side shocks']],
        ['2.5.4', 'The impact of economic growth', 'benefits costs of economic growth', ['Analyse benefits and costs of growth for consumers, firms, government and the environment', 'Discuss sustainability']]
      ]),
      section(2, '2.6', 'Macroeconomic Objectives and Policies', [
        ['2.6.1', 'Possible macroeconomic objectives', 'macroeconomic objectives', ['List the objectives: growth, low unemployment, stable inflation, BoP balance, balanced budget, environment, equity']],
        ['2.6.2', 'Demand-side policies', 'monetary policy fiscal policy', ['Explain monetary policy: Bank Rate, quantitative easing, the MPC', 'Explain fiscal policy: taxation, government spending, budget balance', 'Tell discretionary from automatic stabilisers', 'Evaluate demand-side policies, including the 2008 crisis response'], 'Diagram: AD shift from expansionary policy.'],
        ['2.6.3', 'Supply-side policies', 'supply side policies', ['Tell market-based from interventionist policies', 'Give examples: tax incentives, education and training, infrastructure, deregulation, privatisation', 'Evaluate supply-side policies (time lags, cost, equity)']],
        ['2.6.4', 'Conflicts and trade-offs between objectives and policies', 'Phillips curve trade offs', ['Explain the short-run Phillips curve and its trade-off', 'Discuss conflicts: growth vs inflation, growth vs environment, etc.', 'Evaluate policy combinations']]
      ]),

      section(3, '3.1', 'Business Growth', [
        ['3.1.1', 'Sizes and types of firms', 'public private sector firms', ['Explain reasons why some firms stay small', 'Explain the principal–agent problem', 'Tell public from private sector, for-profit from not-for-profit']],
        ['3.1.2', 'Business growth', 'horizontal vertical integration', ['Tell organic growth from mergers and takeovers', 'Explain horizontal, vertical (forward/backward) and conglomerate integration', 'Discuss advantages and disadvantages, and constraints on growth']],
        ['3.1.3', 'Demergers', 'demergers', ['Explain reasons for demergers', 'Analyse the impact on businesses, workers and consumers']]
      ]),
      section(3, '3.2', 'Business Objectives', [
        ['3.2.1', 'Business objectives', 'profit maximisation revenue maximisation satisficing', ['Explain profit maximisation (MC = MR)', 'Explain revenue maximisation (MR = 0) and sales maximisation (AC = AR)', 'Explain satisficing and the role of stakeholders'], 'Diagram: profit, revenue and sales maximising outputs on one diagram.']
      ]),
      section(3, '3.3', 'Revenues, Costs and Profits', [
        ['3.3.1', 'Revenue', 'average revenue marginal revenue', ['Calculate total, average and marginal revenue', 'Link PED and revenue on a diagram']],
        ['3.3.2', 'Costs', 'short run costs diminishing marginal productivity', ['Calculate fixed, variable, total, average and marginal costs', 'Explain the law of diminishing marginal productivity', 'Explain the shape of SRAC and LRAC curves']],
        ['3.3.3', 'Economies and diseconomies of scale', 'economies of scale', ['Explain internal economies (technical, managerial, financial, marketing, purchasing, risk-bearing)', 'Explain external economies and diseconomies', 'Explain minimum efficient scale']],
        ['3.3.4', 'Normal profits, supernormal profits and losses', 'normal profit supernormal profit shut down', ['Define normal and supernormal profit and losses', 'Explain the short-run and long-run shutdown points']]
      ]),
      section(3, '3.4', 'Market Structures', [
        ['3.4.1', 'Efficiency', 'allocative productive dynamic efficiency', ['Define allocative (P = MC), productive (min AC), dynamic and X-efficiency', 'Apply efficiency to each market structure']],
        ['3.4.2', 'Perfect competition', 'perfect competition', ['State the characteristics', 'Draw short-run and long-run diagrams for the firm and industry', 'Explain profit maximising equilibrium'], 'Diagrams: firm and industry side by side.'],
        ['3.4.3', 'Monopolistic competition', 'monopolistic competition', ['State the characteristics', 'Draw short-run and long-run diagrams', 'Evaluate efficiency']],
        ['3.4.4', 'Oligopoly', 'oligopoly game theory kinked demand', ['State the characteristics and calculate concentration ratios', 'Tell collusive from non-collusive behaviour', 'Use game theory (prisoner\'s dilemma) and the kinked demand curve', 'Explain price and non-price competition']],
        ['3.4.5', 'Monopoly', 'monopoly price discrimination', ['State the characteristics and sources of monopoly power', 'Draw the profit maximising monopoly diagram', 'Explain third-degree price discrimination', 'Evaluate costs and benefits, including natural monopoly'], 'Diagrams: monopoly; price discrimination; natural monopoly.'],
        ['3.4.6', 'Monopsony', 'monopsony', ['State the characteristics of monopsony', 'Evaluate costs and benefits for firms, employees and consumers']],
        ['3.4.7', 'Contestability', 'contestable markets', ['Explain the characteristics of contestable markets', 'Explain sunk costs and barriers to entry and exit', 'Analyse the implications for firm behaviour']]
      ]),
      section(3, '3.5', 'Labour Market', [
        ['3.5.1', 'Demand for labour', 'demand for labour derived demand MRP', ['Explain labour as a derived demand', 'Explain factors that shift labour demand', 'Explain elasticity of demand for labour']],
        ['3.5.2', 'Supply of labour', 'supply of labour', ['Explain factors that shift labour supply (wages, migration, tax, benefits, demographics)', 'Explain elasticity of labour supply']],
        ['3.5.3', 'Wage determination in competitive and non-competitive markets', 'wage determination trade unions minimum wage', ['Analyse wage determination in competitive markets', 'Analyse monopsony and trade unions', 'Evaluate national minimum wage and maximum wages', 'Explain labour market immobility (geographical and occupational)'], 'Diagram: national minimum wage in a competitive and in a monopsony labour market.']
      ], 'Labour Markets'),
      section(3, '3.6', 'Government Intervention', [
        ['3.6.1', 'Government intervention', 'competition policy CMA regulation', ['Explain controlling mergers, monopolies and monopsonies', 'Explain price regulation (RPI − X), profit regulation and performance targets', 'Explain promoting competition: deregulation, competitive tendering, privatisation', 'Explain protecting suppliers and employees']],
        ['3.6.2', 'The impact of government intervention', 'impact of government intervention competition', ['Analyse the impact on prices, efficiency, quality and choice', 'Discuss regulatory capture and asymmetric information']]
      ]),

      section(4, '4.1', 'International Economics', [
        ['4.1.1', 'Globalisation', 'globalisation', ['Define globalisation and its causes', 'Analyse the impact on countries, consumers, producers, workers and the environment']],
        ['4.1.2', 'Specialisation and trade', 'comparative advantage', ['Tell absolute from comparative advantage (numerical and PPF)', 'State the assumptions and limits of comparative advantage', 'Discuss the advantages and disadvantages of specialisation and trade']],
        ['4.1.3', 'Pattern of trade', 'pattern of trade', ['Explain the factors that change trade patterns: comparative advantage, emerging economies, trading blocs, exchange rates']],
        ['4.1.4', 'Terms of trade', 'terms of trade', ['Calculate the terms of trade', 'Explain factors that change them and their impact']],
        ['4.1.5', 'Trading blocs and the WTO', 'trading blocs customs union WTO', ['Explain FTAs, customs unions, common markets and monetary unions', 'Discuss trade creation and trade diversion', 'Explain the role of the WTO and conflicts with trading blocs']],
        ['4.1.6', 'Restrictions on free trade', 'protectionism tariffs quotas', ['Explain reasons for restrictions', 'Analyse tariffs, quotas, subsidies, non-tariff barriers', 'Evaluate the impact of protectionism'], 'Diagram: tariff with deadweight losses.'],
        ['4.1.7', 'Balance of payments', 'balance of payments financial account', ['Describe current, capital and financial accounts', 'Explain causes of deficits and surpluses', 'Evaluate measures to reduce imbalances (expenditure switching and reducing)', 'Discuss the significance of global imbalances']],
        ['4.1.8', 'Exchange rates', 'exchange rates floating fixed', ['Compare floating, fixed and managed systems', 'Tell revaluation/devaluation from appreciation/depreciation', 'Explain factors affecting exchange rates and the Marshall–Lerner condition and J-curve', 'Analyse the impact on the economy']],
        ['4.1.9', 'International competitiveness', 'international competitiveness', ['Measure it with relative unit labour costs and relative export prices', 'Explain the factors that influence it', 'Discuss the benefits of being competitive']]
      ]),
      section(4, '4.2', 'Poverty and Inequality', [
        ['4.2.1', 'Absolute and relative poverty', 'absolute relative poverty', ['Tell absolute from relative poverty', 'Explain the causes of changes in poverty']],
        ['4.2.2', 'Inequality', 'Lorenz curve Gini coefficient inequality', ['Tell wealth inequality from income inequality', 'Draw the Lorenz curve and calculate the Gini coefficient', 'Explain causes of inequality within and between countries', 'Discuss the impact of economic change and capitalism on inequality']]
      ]),
      section(4, '4.3', 'Emerging and Developing Economies', [
        ['4.3.1', 'Measures of development', 'human development index', ['Explain the HDI and its limitations', 'Use other indicators of development']],
        ['4.3.2', 'Factors influencing growth and development', 'barriers to economic development', ['Analyse economic factors: primary product dependency, savings gap, foreign currency gap, capital flight, debt, access to credit, infrastructure, education', 'Analyse non-economic factors: corruption, property rights, war, disease, geography']],
        ['4.3.3', 'Strategies influencing growth and development', 'development strategies aid FDI microfinance', ['Evaluate market-oriented strategies (trade liberalisation, FDI, removing subsidies, floating exchange rates, microfinance, privatisation)', 'Evaluate interventionist strategies (human capital, protectionism, managed exchange rates, infrastructure, joint ventures, buffer stocks)', 'Evaluate other strategies: industrialisation, tourism, primary industries, Fairtrade, aid, debt relief', 'Discuss the role of the IMF, World Bank and NGOs']]
      ]),
      section(4, '4.4', 'The Financial Sector', [
        ['4.4.1', 'Role of financial markets', 'role of financial markets', ['Explain how financial markets facilitate saving, lending, exchange and hedging', 'Explain how banks create credit', 'Explain the money market, capital market and foreign exchange market']],
        ['4.4.2', 'Market failure in the financial sector', 'market failure financial sector', ['Explain asymmetric information, externalities, moral hazard, speculation and market bubbles, market rigging']],
        ['4.4.3', 'Role of central banks', 'role of central banks lender of last resort', ['Explain the functions of a central bank: monetary policy, banker to government and banks, lender of last resort', 'Explain the role of regulation (PRA, FPC, FCA)']]
      ]),
      section(4, '4.5', 'Role of the State in the Macroeconomy', [
        ['4.5.1', 'Public expenditure', 'public expenditure', ['Tell capital from current expenditure and transfer payments', 'Explain why public spending as a share of GDP differs between countries', 'Analyse the effects on productivity, growth, living standards, crowding out, taxation and equality']],
        ['4.5.2', 'Taxation', 'progressive regressive proportional tax Laffer curve', ['Tell progressive, proportional and regressive taxes apart', 'Analyse the economic effects of tax changes', 'Explain the Laffer curve']],
        ['4.5.3', 'Public sector finances', 'national debt fiscal deficit', ['Tell automatic stabilisers from discretionary policy', 'Tell fiscal deficit from national debt', 'Tell structural from cyclical deficits', 'Discuss the factors that influence the size of deficits and the significance of debt']],
        ['4.5.4', 'Macroeconomic policies in a global context', 'macroeconomic policy global context', ['Use policies to reduce fiscal deficits and national debts', 'Use policies to reduce poverty and inequality', 'Analyse changes in interest rates and the money supply', 'Analyse policies to control global companies (transfer pricing)', 'Discuss problems facing policymakers: inaccurate information, risks, external shocks']]
      ])
    ]
  });
})(window.RH = window.RH || {});
