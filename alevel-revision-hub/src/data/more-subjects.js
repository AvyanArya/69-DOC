/* The other A-level subjects Dubai College offers. Each uses the most widely taken specification for that
   subject (the board is shown on the subject page; schools can differ). Sections and lessons follow the
   specification; key points are the things you must be able to do. Set texts and options vary by school. */
(function (RH) {
  'use strict';
  const L = RH.link, r = L.r;
  Object.assign(RH.SITES, {
    yt: { name: 'YouTube', short: 'YouTube', url: 'https://www.youtube.com/', blurb: 'Search YouTube for any topic.' },
    aqa: { name: 'AQA', short: 'AQA', url: 'https://www.aqa.org.uk/', blurb: 'Official AQA specifications, past papers and mark schemes.' },
    ocr: { name: 'OCR', short: 'OCR', url: 'https://www.ocr.org.uk/', blurb: 'Official OCR specifications, past papers and mark schemes.' },
    allery: { name: 'Allery Chemistry', short: 'Allery', url: 'https://www.youtube.com/@AlleryChemistry', yt: '@AlleryChemistry', blurb: 'A-level Chemistry lessons and exam technique, mapped to the AQA spec.' },
    sshorts: { name: 'Science Shorts', short: 'Science Shorts', url: 'https://www.youtube.com/@ScienceShorts', yt: '@ScienceShorts', blurb: 'Short, clear A-level Biology and Chemistry explainers.' },
    cognitosci: { name: 'Cognito', short: 'Cognito', url: 'https://www.youtube.com/@Cognitoedu', yt: '@Cognitoedu', blurb: 'Animated science explainers.' },
    craig: { name: "Craig 'n' Dave", short: "Craig'n'Dave", url: 'https://www.youtube.com/@craigndave', yt: '@craigndave', blurb: 'Every OCR A-level Computer Science spec point, in order.' },
    psyboost: { name: 'Psych Boost', short: 'Psych Boost', url: 'https://www.youtube.com/@PsychBoost', yt: '@PsychBoost', blurb: 'AQA A-level Psychology topic videos and exam technique.' },
    t2uall: { name: 'tutor2u', short: 'tutor2u', url: 'https://www.youtube.com/@tutor2u', yt: '@tutor2u', blurb: 'Revision videos for Psychology, Geography, Politics, History and more.' },
    tfg: { name: 'Time for Geography', short: 'Time for Geography', url: 'https://www.youtube.com/@TimeforGeography', yt: '@TimeforGeography', blurb: 'Geography explainer videos with case studies.' },
    bruff: { name: 'Mr Bruff', short: 'Mr Bruff', url: 'https://www.youtube.com/@mrbruff', yt: '@mrbruff', blurb: 'English Literature text guides and exam advice.' },
    allsop: { name: 'Mr Allsop History', short: 'Mr Allsop', url: 'https://www.youtube.com/@MrAllsopHistory', yt: '@MrAllsopHistory', blurb: 'A-level History revision on Russia, Germany, the Tudors and more.' },
    musicteacher: { name: 'The Music Teacher', short: 'Music Teacher', url: 'https://www.youtube.com/@TheMusicTeacher', yt: '@TheMusicTeacher', blurb: 'Set-work analyses and music theory.' },
    chemguide: { name: 'Chemguide', short: 'Chemguide', url: 'https://www.chemguide.co.uk/', blurb: 'Detailed, reliable explanations of A-level chemistry.' },
    chemrevise: { name: 'Chemrevise', short: 'Chemrevise', url: 'https://www.chemrevise.org/', blurb: 'Free AQA chemistry revision guides and question booklets.' },
    simplypsy: { name: 'Simply Psychology', short: 'Simply Psych', url: 'https://www.simplypsychology.org/', blurb: 'Clear articles on every psychology study and theory.' },
    isaaccs: { name: 'Isaac Computer Science', short: 'Isaac CS', url: 'https://isaaccomputerscience.org/', blurb: 'Free A-level Computer Science lessons and questions.' },
    isaacsci: { name: 'Isaac Science', short: 'Isaac', url: 'https://isaacscience.org/', blurb: 'Free practice questions in physics, chemistry and biology.' },
    mrbruffsite: { name: 'Mr Bruff', short: 'Mr Bruff', url: 'https://www.mrbruff.com/', blurb: 'Guides to set texts and exam technique.' }
  });
  L.ytFind = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

  // Build a subject from compact rows: sections are [name, group, papers, [[lesson, search terms, [key points], tip], ...]].
  function subject(def) {
    def.comps = def.sections.map(function (sec, i) {
      return { id: 'u' + (i + 1), name: sec[0], group: sec[1] || '', papers: sec[2], res: [],
        topics: sec[3].map((row, j) => ({ id: 't' + (j + 1), name: row[0], q: row[1], pts: row[2], tip: row[3] || '', res: [] })) };
    });
    delete def.sections;
    RH.SUBJECT_LIST.push(def);
  }
  const P = (id, code, name, dur, marks, what) => ({ id: id, code: code, name: name, dur: dur, marks: marks, what: what || '' });
  const common = (name, extra) => [r('seneca', 'cards', 'Seneca: free ' + name + ' course', 'https://senecalearning.com/en-gb/')].concat(extra || []);

  // ---------- Chemistry (AQA 7405) ----------
  subject({
    id: 'chemistry', short: 'chm', name: 'Chemistry', board: 'AQA', spec: '7405', tag: 'CHM', color: '#EF4444', video: ['allery', 'sshorts'],
    papers: [P('p1', '7405/1', 'Paper 1: Inorganic and physical chemistry', 120, 105), P('p2', '7405/2', 'Paper 2: Organic and physical chemistry', 120, 105), P('p3', '7405/3', 'Paper 3: Any content and practical skills', 120, 90)],
    res: [r('aqa', 'notes', 'AQA A-level Chemistry specification and past papers', 'https://www.aqa.org.uk/subjects/chemistry/a-level/chemistry-7405'),
      r('pmt', 'notes', 'PMT AQA Chemistry: notes, questions and flashcards', 'https://www.physicsandmathstutor.com/chemistry-revision/a-level-aqa/'),
      r('sme', 'notes', 'Save My Exams: AQA Chemistry revision notes', 'https://www.savemyexams.com/a-level/chemistry/aqa/17/revision-notes/'),
      r('chemguide', 'notes', 'Chemguide', 'https://www.chemguide.co.uk/'), r('chemrevise', 'notes', 'Chemrevise revision guides', 'https://www.chemrevise.org/'),
      r('isaacsci', 'qs', 'Isaac Science: chemistry questions', 'https://isaacscience.org/'), r('allery', 'video', 'Allery Chemistry', 'https://www.youtube.com/@AlleryChemistry/playlists')].concat(common('Chemistry')),
    sections: [
      ['Physical chemistry: foundations', 'Physical chemistry', ['p1', 'p2', 'p3'], [
        ['Atomic structure', 'atomic structure electron configuration mass spectrometry', ['Describe protons, neutrons and electrons and isotopes', 'Interpret time-of-flight mass spectra and calculate relative atomic mass', 'Write electron configurations up to Kr, including s, p and d sub-shells', 'Explain trends in first ionisation energy across a period and down a group']],
        ['Amount of substance', 'moles avogadro ideal gas equation empirical formula', ['Use the mole, Avogadro constant and molar mass', 'Use pV = nRT', 'Find empirical and molecular formulae', 'Balance equations and calculate yields and atom economy', 'Do titration calculations']],
        ['Bonding', 'ionic covalent metallic bonding shapes of molecules intermolecular forces', ['Describe ionic, covalent, dative and metallic bonding', 'Predict shapes and bond angles with VSEPR', 'Explain electronegativity and bond polarity', 'Explain van der Waals forces, dipole–dipole forces and hydrogen bonding and their effect on properties']],
        ['Energetics', 'enthalpy change calorimetry hess law bond enthalpy', ['Define standard enthalpy changes of formation and combustion', 'Calculate ΔH from calorimetry using q = mcΔT', 'Use Hess’s law cycles', 'Calculate ΔH from mean bond enthalpies and explain their limits']],
        ['Kinetics', 'collision theory maxwell boltzmann catalyst', ['Explain rates using collision theory and activation energy', 'Sketch and use the Maxwell–Boltzmann distribution', 'Explain the effect of temperature, concentration, pressure and catalysts']],
        ['Chemical equilibria, Le Chatelier and Kc', 'le chatelier equilibrium kc', ['Describe dynamic equilibrium', 'Predict shifts with Le Chatelier’s principle', 'Write Kc expressions and calculate Kc and equilibrium amounts', 'Explain that only temperature changes Kc']],
        ['Oxidation, reduction and redox', 'oxidation states redox half equations', ['Assign oxidation states', 'Write half-equations and combine them into redox equations']]
      ]],
      ['Physical chemistry: further', 'Physical chemistry', ['p1', 'p2', 'p3'], [
        ['Thermodynamics', 'born haber cycle entropy gibbs free energy', ['Construct Born–Haber cycles and explain differences from theoretical lattice enthalpies', 'Use enthalpy of solution and hydration', 'Calculate entropy change ΔS', 'Use ΔG = ΔH − TΔS to judge feasibility']],
        ['Rate equations', 'rate equations orders arrhenius', ['Write rate equations and find orders from data and graphs', 'Calculate the rate constant k and its units', 'Use the Arrhenius equation', 'Link the rate equation to the rate-determining step']],
        ['Equilibrium constant Kp', 'kp partial pressure', ['Calculate mole fractions and partial pressures', 'Write and calculate Kp', 'Explain the effect of changing conditions on Kp']],
        ['Electrode potentials and cells', 'electrode potentials electrochemical cells', ['Describe the standard hydrogen electrode', 'Use E° values to calculate EMF and predict reactions', 'Describe commercial cells, including fuel cells']],
        ['Acids and bases', 'pH strong weak acids buffers titration curves', ['Use Brønsted–Lowry definitions', 'Calculate pH of strong acids, strong bases (Kw) and weak acids (Ka, pKa)', 'Interpret pH curves and choose indicators', 'Explain and calculate buffer pH']]
      ]],
      ['Inorganic chemistry', 'Inorganic chemistry', ['p1', 'p3'], [
        ['Periodicity', 'periodicity period 3 trends', ['Classify elements into s, p and d blocks', 'Explain trends in atomic radius, ionisation energy and melting point across Period 3']],
        ['Group 2, the alkaline earth metals', 'group 2 trends reactions', ['Explain trends in atomic radius, ionisation energy and melting point', 'Describe reactions with water and trends in solubility of hydroxides and sulfates', 'Give uses (barium meal, Mg in titanium extraction, CaO in flue gases)']],
        ['Group 7, the halogens', 'halogens halide ions tests chlorine water', ['Explain trends in electronegativity and boiling point', 'Describe displacement reactions and oxidising ability', 'Describe halide ion tests with silver nitrate and sulfuric acid', 'Describe uses of chlorine and chlorate(I) in water treatment']],
        ['Properties of Period 3 elements and their oxides', 'period 3 oxides reactions', ['Describe reactions of Na, Mg, Al, Si, P, S with oxygen and water', 'Explain the structure, bonding and acid–base nature of the oxides']],
        ['Transition metals', 'transition metals complexes ligands colour catalysts', ['Describe the general properties of transition metals', 'Explain ligands, coordination number, shapes and isomerism of complexes', 'Explain the origin of colour and use ΔE = hν', 'Describe variable oxidation states, redox titrations and catalysis (heterogeneous and homogeneous)']],
        ['Reactions of ions in aqueous solution', 'metal aqua ions hydrolysis precipitates', ['Explain the acidity of metal aqua ions', 'Describe reactions with NaOH, NH3 and Na2CO3 and the colours of precipitates']]
      ]],
      ['Organic chemistry: foundations', 'Organic chemistry', ['p2', 'p3'], [
        ['Introduction to organic chemistry', 'nomenclature isomerism mechanisms', ['Name compounds using IUPAC rules', 'Draw structural, displayed and skeletal formulae', 'Describe structural and E/Z stereoisomerism', 'Use curly arrows in mechanisms']],
        ['Alkanes', 'alkanes fractional distillation cracking free radical', ['Describe fractional distillation and cracking', 'Describe combustion and pollutants', 'Explain free-radical substitution']],
        ['Halogenoalkanes', 'halogenoalkanes nucleophilic substitution elimination ozone', ['Explain nucleophilic substitution with OH⁻, CN⁻ and NH3', 'Explain elimination to form alkenes', 'Describe ozone depletion by CFCs']],
        ['Alkenes', 'alkenes electrophilic addition markovnikov polymers', ['Explain electrophilic addition and carbocation stability', 'Describe addition polymers and their disposal']],
        ['Alcohols', 'alcohols oxidation fermentation dehydration', ['Classify alcohols and describe their oxidation', 'Compare fermentation and hydration of ethene', 'Describe dehydration to alkenes']],
        ['Organic analysis', 'organic analysis tests mass spectrometry infrared', ['Use chemical tests for functional groups', 'Use high-resolution mass spectrometry', 'Interpret infrared spectra']]
      ]],
      ['Organic chemistry: further', 'Organic chemistry', ['p2', 'p3'], [
        ['Optical isomerism', 'optical isomerism chiral', ['Identify chiral centres and enantiomers', 'Explain racemic mixtures formed in reactions']],
        ['Aldehydes and ketones', 'aldehydes ketones nucleophilic addition tollens', ['Describe oxidation and tests (Tollens’, Fehling’s)', 'Explain nucleophilic addition of HCN and reduction with NaBH4']],
        ['Carboxylic acids and derivatives', 'esters acyl chlorides acid anhydrides', ['Describe esterification and uses of esters', 'Explain nucleophilic addition–elimination of acyl chlorides and anhydrides']],
        ['Aromatic chemistry', 'benzene electrophilic substitution nitration', ['Explain the stability of benzene', 'Explain electrophilic substitution: nitration and Friedel–Crafts acylation']],
        ['Amines', 'amines basicity nucleophilic substitution', ['Prepare amines', 'Explain base strength of ammonia and amines', 'Describe nucleophilic properties']],
        ['Polymers', 'condensation polymers polyesters polyamides', ['Describe condensation polymers (polyesters, polyamides)', 'Discuss biodegradability and disposal']],
        ['Amino acids, proteins and DNA', 'amino acids proteins dna', ['Describe amino acids and zwitterions', 'Describe protein structure and enzymes', 'Describe DNA structure and the action of cisplatin']],
        ['Organic synthesis', 'organic synthesis routes', ['Plan multi-step syntheses using known reactions']],
        ['NMR spectroscopy', 'nmr spectroscopy carbon 13 proton', ['Interpret ¹³C and ¹H NMR spectra, including splitting patterns (n + 1 rule)']],
        ['Chromatography', 'thin layer column gas chromatography', ['Describe TLC, column and gas chromatography and calculate Rf values']]
      ]],
      ['Required practicals', 'Practical skills', ['p3'], [
        ['RP1: Volumetric solution and acid–base titration', 'titration required practical', ['Make up a standard solution', 'Carry out a titration and calculate concentration']],
        ['RP2: Measuring an enthalpy change', 'enthalpy change practical', ['Measure ΔH with a polystyrene cup and extrapolate a cooling curve']],
        ['RP3: Rate of reaction and temperature', 'rate temperature practical', ['Investigate how rate changes with temperature']],
        ['RP4: Test-tube reactions to identify ions', 'test for ions practical', ['Identify cations and anions in solution']],
        ['RP5: Distillation of a product', 'distillation practical', ['Set up distillation apparatus safely']],
        ['RP6: Tests for functional groups', 'tests alcohol aldehyde alkene carboxylic acid', ['Test for alcohols, aldehydes, alkenes and carboxylic acids']],
        ['RP7: Initial-rate and continuous-monitoring methods', 'initial rates continuous monitoring', ['Measure rates by both methods and process the data']],
        ['RP8: EMF of an electrochemical cell', 'emf electrochemical cell practical', ['Set up a cell and measure EMF']],
        ['RP9: pH curves', 'ph curve titration practical', ['Investigate pH changes in weak acid–strong base and strong acid–weak base titrations']],
        ['RP10: Preparing pure organic solids and liquids', 'recrystallisation melting point purification', ['Purify by recrystallisation and test purity by melting point', 'Purify a liquid using a separating funnel and drying agent']],
        ['RP11: Identifying transition metal ions', 'transition metal ions test tube', ['Identify transition metal ions with simple test-tube reactions']],
        ['RP12: Thin-layer chromatography', 'thin layer chromatography practical', ['Separate species by TLC and calculate Rf']]
      ]]
    ]
  });

  // ---------- Biology (AQA 7402) ----------
  subject({
    id: 'biology', short: 'bio', name: 'Biology', board: 'AQA', spec: '7402', tag: 'BIO', color: '#22C55E', video: ['sshorts', 'cognitosci'],
    papers: [P('p1', '7402/1', 'Paper 1: Topics 1–4', 120, 91), P('p2', '7402/2', 'Paper 2: Topics 5–8', 120, 91), P('p3', '7402/3', 'Paper 3: Topics 1–8, practical skills and essay', 120, 78)],
    res: [r('aqa', 'notes', 'AQA A-level Biology specification and past papers', 'https://www.aqa.org.uk/subjects/biology/a-level/biology-7402'),
      r('pmt', 'notes', 'PMT AQA Biology: notes, questions and flashcards', 'https://www.physicsandmathstutor.com/biology-revision/a-level-aqa/'),
      r('sme', 'notes', 'Save My Exams: AQA Biology revision notes', 'https://www.savemyexams.com/a-level/biology/aqa/17/revision-notes/'),
      r('isaacsci', 'qs', 'Isaac Science: biology questions', 'https://isaacscience.org/'), r('sshorts', 'video', 'Science Shorts', 'https://www.youtube.com/@ScienceShorts/playlists')].concat(common('Biology')),
    sections: [
      ['Biological molecules', 'Year 1', ['p1', 'p3'], [
        ['Monomers, polymers and carbohydrates', 'carbohydrates glycosidic bond starch glycogen cellulose', ['Describe condensation and hydrolysis', 'Describe monosaccharides, disaccharides and polysaccharides and their structures', 'Do Benedict’s and iodine tests']],
        ['Lipids', 'triglycerides phospholipids', ['Describe triglycerides and phospholipids and their properties', 'Do the emulsion test']],
        ['Proteins', 'protein structure peptide bond', ['Describe amino acids and peptide bonds', 'Describe primary to quaternary structure', 'Do the biuret test']],
        ['Enzymes', 'enzymes induced fit inhibition', ['Explain the induced-fit model', 'Explain the effects of temperature, pH, substrate and enzyme concentration', 'Explain competitive and non-competitive inhibition']],
        ['Nucleic acids and DNA replication', 'dna rna structure semi conservative replication', ['Describe the structure of DNA and RNA', 'Explain semi-conservative replication and the Meselson–Stahl evidence']],
        ['ATP, water and inorganic ions', 'atp water properties inorganic ions', ['Describe ATP structure and roles', 'Explain the properties of water', 'Describe roles of H⁺, Fe²⁺, Na⁺ and phosphate ions']]
      ]],
      ['Cells', 'Year 1', ['p1', 'p3'], [
        ['Cell structure', 'eukaryotic prokaryotic cells organelles viruses', ['Describe eukaryotic organelles and their functions', 'Compare prokaryotic cells and viruses']],
        ['Methods of studying cells', 'microscopy magnification cell fractionation', ['Compare light, TEM and SEM microscopes', 'Use magnification = image ÷ actual', 'Describe cell fractionation and ultracentrifugation']],
        ['Cell division', 'mitosis cell cycle binary fission', ['Describe the cell cycle and the stages of mitosis', 'Calculate a mitotic index', 'Link uncontrolled division to cancer', 'Describe binary fission and viral replication']],
        ['Cell membranes and transport', 'fluid mosaic diffusion osmosis active transport', ['Describe the fluid-mosaic model', 'Explain simple and facilitated diffusion, osmosis, active transport and co-transport']],
        ['The immune system', 'antigens phagocytosis t cells b cells antibodies vaccination hiv', ['Describe antigens and phagocytosis', 'Explain the roles of T and B lymphocytes and antibodies', 'Explain vaccination, herd immunity and monoclonal antibodies', 'Describe HIV and the ELISA test']]
      ]],
      ['Exchanging substances', 'Year 1', ['p1', 'p3'], [
        ['Surface area to volume ratio and gas exchange', 'gas exchange insects fish leaves lungs', ['Relate SA:V to the need for exchange surfaces', 'Describe gas exchange in insects, fish, leaves and humans', 'Explain ventilation and lung disease']],
        ['Digestion and absorption', 'digestion absorption enzymes', ['Describe digestion of carbohydrates, lipids and proteins', 'Explain absorption, including co-transport and micelles']],
        ['Mass transport in animals', 'haemoglobin oxygen dissociation heart circulation tissue fluid', ['Explain oxygen dissociation curves and the Bohr effect', 'Describe the circulatory system and cardiac cycle', 'Explain tissue fluid formation']],
        ['Mass transport in plants', 'xylem cohesion tension phloem mass flow', ['Explain cohesion–tension in the xylem', 'Explain mass flow in the phloem and the evidence for it']]
      ]],
      ['Genetic information and variation', 'Year 1', ['p1', 'p3'], [
        ['DNA, genes and chromosomes', 'genes chromosomes introns exons', ['Describe DNA in prokaryotes and eukaryotes', 'Define genes, alleles, introns and exons', 'Describe the genetic code']],
        ['Protein synthesis', 'transcription translation mrna trna', ['Describe transcription and splicing', 'Describe translation by ribosomes and tRNA']],
        ['Mutation and meiosis', 'meiosis crossing over independent segregation mutation', ['Describe gene mutations and chromosome non-disjunction', 'Explain how meiosis produces variation']],
        ['Natural selection and adaptation', 'natural selection directional stabilising', ['Explain natural selection', 'Describe directional and stabilising selection']],
        ['Species, taxonomy and biodiversity', 'classification taxonomy biodiversity index', ['Describe hierarchical classification and binomial names', 'Calculate an index of diversity', 'Describe how genetic diversity is investigated']]
      ]],
      ['Energy transfers', 'Year 2', ['p2', 'p3'], [
        ['Photosynthesis', 'light dependent reaction calvin cycle limiting factors', ['Describe the light-dependent reaction', 'Describe the light-independent reaction (Calvin cycle)', 'Explain limiting factors and agricultural applications']],
        ['Respiration', 'glycolysis link reaction krebs oxidative phosphorylation anaerobic', ['Describe glycolysis, the link reaction and the Krebs cycle', 'Explain oxidative phosphorylation and chemiosmosis', 'Describe anaerobic respiration']],
        ['Energy and ecosystems', 'biomass gpp npp productivity', ['Calculate GPP, NPP and efficiency', 'Explain how farming increases productivity']],
        ['Nutrient cycles', 'nitrogen cycle phosphorus cycle eutrophication', ['Describe the nitrogen and phosphorus cycles', 'Explain mycorrhizae, fertilisers and eutrophication']]
      ]],
      ['Responding to change', 'Year 2', ['p2', 'p3'], [
        ['Stimuli and responses', 'taxis kinesis tropism receptors pacinian', ['Describe taxes, kineses and tropisms (IAA)', 'Describe receptors: Pacinian corpuscle and the retina', 'Explain control of heart rate']],
        ['Nerve impulses and synapses', 'action potential synapse cholinergic', ['Explain resting and action potentials', 'Explain saltatory conduction and refractory periods', 'Explain synaptic transmission and summation']],
        ['Skeletal muscle', 'sliding filament theory', ['Explain the sliding filament model and the role of ATP and calcium']],
        ['Homeostasis: blood glucose', 'insulin glucagon diabetes', ['Explain negative feedback', 'Explain the roles of insulin, glucagon and adrenaline', 'Compare type 1 and type 2 diabetes']],
        ['Homeostasis: water potential', 'kidney nephron adh osmoregulation', ['Describe the nephron and ultrafiltration', 'Explain the role of ADH']]
      ]],
      ['Genetics, populations and evolution', 'Year 2', ['p2', 'p3'], [
        ['Inheritance', 'genetic crosses dihybrid sex linkage epistasis chi squared', ['Use monohybrid and dihybrid crosses', 'Explain codominance, multiple alleles, sex linkage, autosomal linkage and epistasis', 'Use the chi-squared test']],
        ['Populations and Hardy–Weinberg', 'hardy weinberg allele frequency', ['Use the Hardy–Weinberg equations']],
        ['Evolution and speciation', 'allopatric sympatric speciation genetic drift', ['Explain allopatric and sympatric speciation and genetic drift']],
        ['Populations in ecosystems', 'succession conservation sampling mark release recapture', ['Describe succession and conservation', 'Estimate population size with quadrats and mark–release–recapture']]
      ]],
      ['Control of gene expression', 'Year 2', ['p2', 'p3'], [
        ['Mutations and stem cells', 'gene mutations stem cells totipotent', ['Describe types of mutation', 'Describe totipotent, pluripotent, multipotent and unipotent stem cells and their uses']],
        ['Regulation of transcription and translation', 'transcription factors oestrogen epigenetics rnai', ['Explain transcription factors and oestrogen', 'Explain epigenetics (methylation, acetylation) and RNA interference']],
        ['Gene expression and cancer', 'tumour suppressor oncogenes', ['Explain the roles of oncogenes, tumour suppressor genes and methylation in cancer']],
        ['Genome projects and gene technologies', 'recombinant dna pcr gene therapy genetic fingerprinting', ['Describe recombinant DNA technology and PCR', 'Describe DNA probes, screening and genetic fingerprinting', 'Discuss genome projects and gene therapy']]
      ]],
      ['Required practicals', 'Practical skills', ['p3'], [
        ['RP1: Enzyme rate', 'enzyme required practical', ['Investigate a variable affecting an enzyme-controlled reaction']],
        ['RP2: Mitosis in root tip squashes', 'root tip squash mitotic index', ['Prepare a stained squash and calculate the mitotic index']],
        ['RP3: Water potential of plant tissue', 'water potential potato practical', ['Make a dilution series and find water potential from a calibration curve']],
        ['RP4: Membrane permeability', 'beetroot membrane permeability', ['Investigate how temperature or solvent affects membrane permeability']],
        ['RP5: Dissection', 'dissection heart lungs', ['Dissect a gas exchange or mass transport organ']],
        ['RP6: Aseptic technique and antimicrobials', 'aseptic technique antimicrobial', ['Investigate antimicrobial substances on bacterial growth']],
        ['RP7: Chromatography of leaf pigments', 'chromatography leaf pigments', ['Separate photosynthetic pigments and calculate Rf']],
        ['RP8: Dehydrogenase activity in chloroplasts', 'dcpip dehydrogenase chloroplasts', ['Investigate a factor affecting dehydrogenase activity using DCPIP']],
        ['RP9: Respiration of yeast', 'respiration rate yeast respirometer', ['Investigate a variable affecting respiration rate']],
        ['RP10: Choice chambers and mazes', 'choice chamber woodlice', ['Investigate how an environmental variable affects animal movement']],
        ['RP11: Glucose calibration curve', 'colorimetry glucose calibration', ['Use colorimetry to find glucose concentration']],
        ['RP12: Species distribution', 'quadrat transect distribution', ['Investigate how an environmental factor affects distribution']]
      ]]
    ]
  });

  // ---------- Computer Science (OCR H446) ----------
  subject({
    id: 'compsci', short: 'cs', name: 'Computer Science', board: 'OCR', spec: 'H446', tag: 'CS', color: '#0EA5E9', video: ['craig'],
    papers: [P('p1', 'H446/01', 'Component 01: Computer systems', 150, 140), P('p2', 'H446/02', 'Component 02: Algorithms and programming', 150, 140)],
    res: [r('ocr', 'notes', 'OCR A-level Computer Science specification and past papers', 'https://www.ocr.org.uk/qualifications/as-and-a-level/computer-science-h046-h446-from-2015/'),
      r('pmt', 'notes', 'PMT OCR Computer Science notes and questions', 'https://www.physicsandmathstutor.com/computer-science-revision/a-level-ocr/'),
      r('sme', 'notes', 'Save My Exams: OCR Computer Science notes', 'https://www.savemyexams.com/a-level/computer-science/ocr/17/revision-notes/'),
      r('isaaccs', 'notes', 'Isaac Computer Science', 'https://isaaccomputerscience.org/'), r('craig', 'video', "Craig 'n' Dave OCR playlists", 'https://www.youtube.com/@craigndave/playlists')].concat(common('Computer Science')),
    sections: [
      ['1.1 Processors, input, output and storage', 'Component 01: Computer systems', ['p1'], [
        ['1.1.1 Structure and function of the processor', 'cpu fetch decode execute registers', ['Describe the ALU, control unit and registers (PC, ACC, MAR, MDR, CIR)', 'Describe the fetch–decode–execute cycle', 'Explain factors affecting performance', 'Explain pipelining and von Neumann vs Harvard architecture']],
        ['1.1.2 Types of processor', 'cisc risc gpu multicore', ['Compare CISC and RISC', 'Describe GPUs, multicore and parallel systems']],
        ['1.1.3 Input, output and storage', 'storage devices ram rom virtual storage', ['Choose input, output and storage devices', 'Compare magnetic, flash and optical storage', 'Explain RAM, ROM and virtual storage']]
      ]],
      ['1.2 Software and software development', 'Component 01: Computer systems', ['p1'], [
        ['1.2.1 Systems software', 'operating systems scheduling paging interrupts', ['Describe the functions of an operating system', 'Explain memory management, paging, segmentation and virtual memory', 'Explain interrupts and scheduling algorithms', 'Describe types of OS, BIOS, device drivers and virtual machines']],
        ['1.2.2 Applications generation', 'compilers interpreters assemblers translation stages', ['Compare compilers, interpreters and assemblers', 'Describe lexical analysis, syntax analysis, code generation and optimisation', 'Explain linkers, loaders and libraries']],
        ['1.2.3 Software development', 'waterfall agile spiral rad', ['Compare waterfall, agile, extreme programming, spiral and RAD', 'Write and follow algorithms']],
        ['1.2.4 Types of programming language', 'programming paradigms oop assembly addressing modes', ['Compare paradigms: procedural, object-oriented, assembly', 'Use LMC and addressing modes', 'Explain classes, objects, inheritance, encapsulation and polymorphism']]
      ]],
      ['1.3 Exchanging data', 'Component 01: Computer systems', ['p1'], [
        ['1.3.1 Compression, encryption and hashing', 'lossy lossless compression encryption hashing', ['Compare lossy and lossless compression, RLE and dictionary coding', 'Compare symmetric and asymmetric encryption', 'Explain uses of hashing']],
        ['1.3.2 Databases', 'relational database normalisation sql transactions', ['Describe relational databases, keys and ERDs', 'Normalise to 3NF', 'Write SQL', 'Explain referential integrity, transactions and ACID']],
        ['1.3.3 Networks', 'tcp ip layers protocols lan wan packet switching', ['Explain protocols, standards and the TCP/IP stack', 'Describe DNS, LANs, WANs, packet and circuit switching', 'Describe network security: firewalls, proxies, encryption']],
        ['1.3.4 Web technologies', 'html css javascript search engine pagerank', ['Use HTML, CSS and JavaScript', 'Explain search engine indexing and PageRank', 'Compare server-side and client-side processing']]
      ]],
      ['1.4 Data types, structures and algorithms', 'Component 01: Computer systems', ['p1'], [
        ['1.4.1 Data types', 'binary hexadecimal twos complement floating point', ['Convert binary, denary and hexadecimal', 'Use two’s complement and sign and magnitude', 'Represent and normalise floating point numbers', 'Use bitwise manipulation and masks', 'Describe character sets (ASCII, Unicode)']],
        ['1.4.2 Data structures', 'arrays linked lists stacks queues trees graphs hash tables', ['Describe arrays, records, lists and tuples', 'Describe linked lists, graphs, stacks, queues, trees, binary search trees and hash tables', 'Traverse trees and graphs']],
        ['1.4.3 Boolean algebra', 'boolean algebra karnaugh maps logic gates adders', ['Use logic gates and truth tables', 'Simplify with Boolean algebra, De Morgan’s laws and Karnaugh maps', 'Describe half adders, full adders and D-type flip-flops']]
      ]],
      ['1.5 Legal, moral, cultural and ethical issues', 'Component 01: Computer systems', ['p1'], [
        ['1.5.1 Computing-related legislation', 'data protection act computer misuse act copyright', ['Describe the Data Protection Act, Computer Misuse Act, Copyright, Designs and Patents Act and RIPA']],
        ['1.5.2 Moral and ethical issues', 'ethics computing artificial intelligence privacy', ['Discuss AI, automated decisions, privacy, censorship, environmental effects and the digital divide']]
      ]],
      ['2.1 Computational thinking', 'Component 02: Algorithms and programming', ['p2'], [
        ['2.1.1 Thinking abstractly', 'abstraction computational thinking', ['Explain abstraction and devise abstract models']],
        ['2.1.2 Thinking ahead', 'thinking ahead inputs outputs preconditions caching', ['Identify inputs, outputs and preconditions', 'Explain caching and reusable components']],
        ['2.1.3 Thinking procedurally', 'decomposition procedural thinking', ['Decompose problems into sub-procedures']],
        ['2.1.4 Thinking logically', 'decision points logical conditions', ['Identify decision points and conditions']],
        ['2.1.5 Thinking concurrently', 'concurrency parallel processing', ['Identify parts of a problem that can be tackled concurrently']]
      ]],
      ['2.2 Problem solving and programming', 'Component 02: Algorithms and programming', ['p2'], [
        ['2.2.1 Programming techniques', 'recursion iteration global local variables parameters ide', ['Use sequence, selection, iteration and recursion', 'Use global and local variables, parameters by value and by reference', 'Use an IDE to debug', 'Write object-oriented code']],
        ['2.2.2 Computational methods', 'problem recognition decomposition backtracking heuristics', ['Use decomposition, divide and conquer, backtracking, data mining, heuristics, pipelining and visualisation']]
      ]],
      ['2.3 Algorithms', 'Component 02: Algorithms and programming', ['p2'], [
        ['2.3.1 Algorithm analysis and Big O', 'big o notation complexity', ['Compare algorithms with Big O: constant, linear, polynomial, exponential, logarithmic']],
        ['2.3.2 Algorithms for data structures', 'stack queue tree traversal algorithms', ['Write algorithms for stacks, queues, trees, linked lists and graph traversals (breadth-first, depth-first)']],
        ['2.3.3 Searching algorithms', 'binary search linear search', ['Write and trace linear and binary search']],
        ['2.3.4 Sorting algorithms', 'bubble sort insertion sort merge sort quick sort', ['Write and trace bubble, insertion, merge and quick sort and compare their efficiency']],
        ['2.3.5 Shortest path algorithms', 'dijkstra a star algorithm', ['Trace Dijkstra’s and the A* algorithm']]
      ]],
      ['3 Programming project (NEA)', 'Component 03', [], [
        ['Analysis', 'computer science nea analysis', ['Identify the problem, stakeholders and success criteria', 'Research existing solutions']],
        ['Design', 'computer science nea design', ['Decompose the problem and design algorithms, data structures and test plans']],
        ['Development and testing', 'computer science nea development', ['Develop iteratively with evidence of testing at each stage']],
        ['Evaluation', 'computer science nea evaluation', ['Evaluate against success criteria, usability and maintenance']]
      ]]
    ]
  });

  // ---------- Psychology (AQA 7182) ----------
  subject({
    id: 'psychology', short: 'psy', name: 'Psychology', board: 'AQA', spec: '7182', tag: 'PSY', color: '#EC4899', video: ['psyboost', 't2uall'],
    papers: [P('p1', '7182/1', 'Paper 1: Introductory topics', 120, 96), P('p2', '7182/2', 'Paper 2: Psychology in context', 120, 96), P('p3', '7182/3', 'Paper 3: Issues and options', 120, 96)],
    res: [r('aqa', 'notes', 'AQA A-level Psychology specification and past papers', 'https://www.aqa.org.uk/subjects/psychology/a-level/psychology-7182'),
      r('pmt', 'notes', 'PMT AQA Psychology notes and questions', 'https://www.physicsandmathstutor.com/psychology-revision/a-level-aqa/'),
      r('sme', 'notes', 'Save My Exams: AQA Psychology notes', 'https://www.savemyexams.com/a-level/psychology/aqa/17/revision-notes/'),
      r('t2u', 'notes', 'tutor2u Psychology', 'https://www.tutor2u.net/psychology'), r('simplypsy', 'notes', 'Simply Psychology', 'https://www.simplypsychology.org/')].concat(common('Psychology')),
    sections: [
      ['Social influence', 'Paper 1', ['p1'], [
        ['Types and explanations of conformity', 'conformity compliance identification internalisation', ['Describe compliance, identification and internalisation', 'Explain normative and informational social influence']],
        ['Variables affecting conformity: Asch', 'asch conformity study', ['Describe Asch’s study and the effects of group size, unanimity and task difficulty', 'Evaluate it']],
        ['Conformity to social roles: Zimbardo', 'stanford prison experiment zimbardo', ['Describe and evaluate the Stanford prison experiment']],
        ['Obedience: Milgram', 'milgram obedience study', ['Describe Milgram’s study and situational variables (proximity, location, uniform)', 'Evaluate it']],
        ['Explanations of obedience', 'agentic state legitimacy of authority authoritarian personality', ['Explain agentic state and legitimacy of authority', 'Explain the authoritarian personality']],
        ['Resistance and minority influence', 'resistance social support locus of control minority influence', ['Explain resistance: social support and locus of control', 'Explain minority influence: consistency, commitment, flexibility', 'Explain the role of social influence in social change']]
      ]],
      ['Memory', 'Paper 1', ['p1'], [
        ['Multi-store model', 'multi store model memory', ['Describe sensory register, STM and LTM: coding, capacity, duration', 'Evaluate the model']],
        ['Types of long-term memory', 'episodic semantic procedural memory', ['Describe episodic, semantic and procedural memory']],
        ['Working memory model', 'working memory model baddeley hitch', ['Describe the central executive, phonological loop, visuo-spatial sketchpad and episodic buffer', 'Evaluate the model']],
        ['Forgetting', 'interference retrieval failure', ['Explain interference and retrieval failure (cue-dependent forgetting)']],
        ['Eyewitness testimony and the cognitive interview', 'eyewitness testimony loftus cognitive interview', ['Explain the effects of misleading information and anxiety', 'Describe and evaluate the cognitive interview']]
      ]],
      ['Attachment', 'Paper 1', ['p1'], [
        ['Caregiver–infant interactions and stages', 'reciprocity interactional synchrony schaffer stages', ['Describe reciprocity and interactional synchrony', 'Describe Schaffer’s stages of attachment and the role of the father']],
        ['Animal studies and explanations', 'lorenz harlow learning theory bowlby monotropic', ['Describe Lorenz and Harlow', 'Explain learning theory and Bowlby’s monotropic theory']],
        ['Ainsworth’s Strange Situation and culture', 'strange situation cultural variations', ['Describe the Strange Situation and attachment types', 'Explain cultural variations (van IJzendoorn)']],
        ['Deprivation, institutionalisation and later relationships', 'maternal deprivation romanian orphans internal working model', ['Explain Bowlby’s maternal deprivation', 'Describe Romanian orphan studies', 'Explain the influence of early attachment on later relationships']]
      ]],
      ['Psychopathology', 'Paper 1', ['p1'], [
        ['Definitions of abnormality', 'definitions of abnormality', ['Explain statistical infrequency, deviation from social norms, failure to function adequately and deviation from ideal mental health']],
        ['Phobias, depression and OCD', 'phobias depression ocd characteristics', ['Describe the behavioural, emotional and cognitive characteristics of each']],
        ['Explaining and treating phobias', 'two process model systematic desensitisation flooding', ['Explain the two-process model', 'Evaluate systematic desensitisation and flooding']],
        ['Explaining and treating depression', 'beck ellis cbt depression', ['Explain Beck’s negative triad and Ellis’s ABC model', 'Evaluate CBT']],
        ['Explaining and treating OCD', 'ocd genetic neural explanations ssri', ['Explain genetic and neural explanations', 'Evaluate drug therapy']]
      ]],
      ['Approaches in psychology', 'Paper 2', ['p2'], [
        ['Origins and learning approaches', 'wundt behaviourism social learning theory', ['Describe Wundt and introspection', 'Explain classical and operant conditioning and social learning theory']],
        ['Cognitive and biological approaches', 'cognitive approach biological approach schema', ['Explain schema, models and cognitive neuroscience', 'Explain genes, neurochemistry and evolution']],
        ['Psychodynamic and humanistic approaches', 'freud psychodynamic humanistic maslow rogers', ['Explain the psychodynamic approach', 'Explain Maslow and Rogers', 'Compare the approaches']]
      ]],
      ['Biopsychology', 'Paper 2', ['p2'], [
        ['Nervous and endocrine systems', 'nervous system neurons synaptic transmission endocrine fight or flight', ['Describe the divisions of the nervous system, neurons and synaptic transmission', 'Describe the endocrine system and fight or flight']],
        ['Localisation, lateralisation and plasticity', 'localisation of function split brain plasticity', ['Explain localisation of function and hemispheric lateralisation (split-brain research)', 'Explain plasticity and functional recovery']],
        ['Ways of studying the brain', 'fmri eeg erp post mortem', ['Compare fMRI, EEGs, ERPs and post-mortem examinations']],
        ['Biological rhythms', 'circadian infradian ultradian rhythms', ['Explain circadian, infradian and ultradian rhythms', 'Explain endogenous pacemakers and exogenous zeitgebers']]
      ]],
      ['Research methods', 'Paper 2', ['p2'], [
        ['Experimental methods and designs', 'experimental designs variables hypotheses', ['Write aims and hypotheses', 'Compare lab, field, natural and quasi experiments', 'Compare experimental designs and control variables']],
        ['Sampling, ethics and other methods', 'sampling ethics observations self report correlations', ['Compare sampling techniques', 'Apply BPS ethical guidelines', 'Use observations, self-report, correlations, case studies and content analysis']],
        ['Data handling and analysis', 'descriptive statistics graphs', ['Calculate mean, median, mode, range and standard deviation', 'Draw and interpret graphs and distributions']],
        ['Inferential testing', 'sign test inferential statistics', ['Carry out a sign test', 'Choose tests and interpret critical values, p values and errors']]
      ]],
      ['Issues and debates', 'Paper 3', ['p3'], [
        ['Gender and culture bias', 'gender bias culture bias', ['Explain alpha and beta bias, androcentrism, universality and ethnocentrism']],
        ['Free will vs determinism; nature vs nurture', 'free will determinism nature nurture', ['Explain hard and soft determinism and the interactionist approach']],
        ['Holism vs reductionism; idiographic vs nomothetic', 'holism reductionism idiographic nomothetic', ['Explain levels of explanation and approaches to research']],
        ['Ethical implications', 'socially sensitive research', ['Discuss socially sensitive research']]
      ]],
      ['Option: Relationships', 'Paper 3', ['p3'], [
        ['Evolutionary explanations', 'sexual selection relationships', ['Explain sexual selection and human reproductive behaviour']],
        ['Attraction and theories of romantic relationships', 'filter theory social exchange equity rusbult', ['Explain self-disclosure, physical attractiveness and filter theory', 'Explain social exchange, equity and Rusbult’s investment model']],
        ['Breakdown and virtual relationships', 'duck phase model parasocial relationships', ['Explain Duck’s phase model', 'Explain virtual and parasocial relationships']]
      ]],
      ['Option: Schizophrenia', 'Paper 3', ['p3'], [
        ['Classification and diagnosis', 'schizophrenia symptoms diagnosis reliability validity', ['Describe positive and negative symptoms', 'Discuss reliability and validity of diagnosis']],
        ['Explanations', 'dopamine hypothesis family dysfunction', ['Explain biological (genetic, dopamine, neural) and psychological (family, cognitive) explanations']],
        ['Treatments', 'antipsychotics cbt family therapy token economy', ['Evaluate drug therapy, CBT, family therapy and token economies', 'Explain the interactionist approach (diathesis–stress)']]
      ]],
      ['Option: Forensic psychology', 'Paper 3', ['p3'], [
        ['Defining crime and offender profiling', 'offender profiling top down bottom up', ['Explain measuring crime', 'Compare top-down and bottom-up profiling']],
        ['Explanations of offending', 'atavistic form eysenck cognitive distortions', ['Explain biological, Eysenck’s, cognitive and psychodynamic explanations, and differential association']],
        ['Dealing with offending', 'custodial sentencing restorative justice', ['Evaluate custodial sentencing, behaviour modification, anger management and restorative justice']]
      ]]
    ]
  });

  // ---------- Geography (AQA 7037) ----------
  subject({
    id: 'geography', short: 'geo', name: 'Geography', board: 'AQA', spec: '7037', tag: 'GEO', color: '#84CC16', video: ['tfg', 't2uall'],
    papers: [P('p1', '7037/1', 'Paper 1: Physical geography', 150, 120), P('p2', '7037/2', 'Paper 2: Human geography', 150, 120)],
    res: [r('aqa', 'notes', 'AQA A-level Geography specification and past papers', 'https://www.aqa.org.uk/subjects/geography/a-level/geography-7037'),
      r('pmt', 'notes', 'PMT AQA Geography notes', 'https://www.physicsandmathstutor.com/geography-revision/a-level-aqa/'),
      r('sme', 'notes', 'Save My Exams: AQA Geography notes', 'https://www.savemyexams.com/a-level/geography/aqa/18/revision-notes/'),
      r('t2u', 'notes', 'tutor2u Geography', 'https://www.tutor2u.net/geography'), r('tfg', 'video', 'Time for Geography', 'https://www.youtube.com/@TimeforGeography')].concat(common('Geography')),
    sections: [
      ['Water and carbon cycles', 'Physical geography', ['p1'], [
        ['Systems and the water cycle', 'water cycle stores flows', ['Use systems terms: inputs, outputs, stores, flows, feedback', 'Describe stores and flows in the water cycle']],
        ['Drainage basins and hydrographs', 'drainage basin storm hydrograph', ['Explain drainage basin processes', 'Interpret storm hydrographs and the factors that affect them']],
        ['The carbon cycle', 'carbon cycle stores fluxes', ['Describe carbon stores and fluxes and changes over time']],
        ['Links, climate change and case studies', 'carbon water cycle climate change amazon', ['Explain links between the cycles and climate change', 'Use a tropical rainforest and a river catchment case study']]
      ]],
      ['Coastal systems and landscapes', 'Physical geography', ['p1'], [
        ['Coastal systems and processes', 'coastal processes waves erosion longshore drift', ['Describe waves, tides and sediment cells', 'Explain erosion, transportation and deposition']],
        ['Coastal landforms', 'erosional depositional landforms headlands spits', ['Explain erosional landforms (cliffs, arches, stacks)', 'Explain depositional landforms (beaches, spits, bars, dunes, salt marshes)']],
        ['Sea level change and coastal management', 'sea level change coastal management', ['Explain eustatic and isostatic change', 'Evaluate hard and soft engineering and ICZM with case studies']]
      ]],
      ['Hazards', 'Physical geography', ['p1'], [
        ['The concept of hazard and plate tectonics', 'plate tectonics hazard park model', ['Explain hazard perception, the Park model and the hazard management cycle', 'Explain plate boundaries and tectonic processes']],
        ['Volcanic and seismic hazards', 'volcanoes earthquakes tsunami', ['Explain volcanic and seismic hazards, their impacts and responses with case studies']],
        ['Storm hazards and fires', 'tropical storms wildfires', ['Explain tropical storms and wildfires, impacts and responses']],
        ['Multi-hazardous environments', 'multi hazard environment case study', ['Analyse a multi-hazardous environment and a local hazard case study']]
      ]],
      ['Global systems and global governance', 'Human geography', ['p2'], [
        ['Globalisation', 'globalisation flows tncs', ['Explain flows of capital, labour, products and information', 'Explain the role of TNCs']],
        ['Global systems and trade', 'international trade unequal power', ['Explain international trade and access to markets', 'Discuss interdependence and inequality']],
        ['Global governance and the global commons', 'global governance antarctica', ['Explain global governance and the global commons, using Antarctica']]
      ]],
      ['Changing places', 'Human geography', ['p2'], [
        ['The nature and importance of places', 'place insider outsider perspectives', ['Explain insider and outsider perspectives, near and far places']],
        ['Changing places: relationships and meanings', 'endogenous exogenous factors place', ['Explain endogenous and exogenous factors and how places are represented']],
        ['Place studies', 'local place study', ['Carry out a local and a distant place study using qualitative and quantitative data']]
      ]],
      ['Contemporary urban environments', 'Human geography', ['p2'], [
        ['Urbanisation', 'urbanisation suburbanisation counter urbanisation', ['Explain urbanisation, suburbanisation, counter-urbanisation and regeneration']],
        ['Urban forms, climate and drainage', 'urban heat island urban drainage', ['Explain urban forms, the urban heat island and urban drainage (SUDS)']],
        ['Urban waste, environmental problems and sustainability', 'urban sustainability waste', ['Evaluate waste management and sustainable cities with case studies']]
      ]],
      ['Geographical skills and NEA', 'Fieldwork', [], [
        ['Geographical skills', 'geography statistical skills spearman chi squared', ['Use Spearman’s rank, chi-squared, Mann–Whitney U, measures of central tendency and dispersion', 'Read maps and graphs']],
        ['Independent investigation (NEA)', 'geography nea investigation', ['Plan, collect, present, analyse and evaluate a 3,000–4,000 word fieldwork investigation']]
      ]]
    ]
  });

  // ---------- History (AQA 7042) ----------
  subject({
    id: 'history', short: 'his', name: 'History', board: 'AQA', spec: '7042', tag: 'HIS', color: '#B45309', video: ['allsop', 't2uall'],
    papers: [P('p1', '7042/1', 'Component 1: Breadth study', 150, 80), P('p2', '7042/2', 'Component 2: Depth study', 150, 80)],
    res: [r('aqa', 'notes', 'AQA A-level History specification and past papers', 'https://www.aqa.org.uk/subjects/history/a-level/history-7042'), r('t2u', 'notes', 'tutor2u History', 'https://www.tutor2u.net/history')].concat(common('History')),
    sections: [
      ['Breadth: Tsarist and Communist Russia, 1855–1964 (1H)', 'Component 1 · options vary by school', ['p1'], [
        ['Trying to preserve autocracy, 1855–1894', 'alexander ii emancipation reforms alexander iii', ['Explain Alexander II’s reforms and their limits', 'Explain Alexander III’s reaction and economic change']],
        ['The collapse of autocracy, 1894–1917', 'nicholas ii 1905 revolution february revolution', ['Explain the 1905 revolution, the Dumas and Stolypin', 'Explain the impact of the First World War and the February Revolution']],
        ['The emergence of Communist dictatorship, 1917–1941', 'october revolution lenin stalin five year plans', ['Explain the Bolshevik takeover, civil war and NEP', 'Explain Stalin’s rise, collectivisation, five-year plans and the Terror']],
        ['The Stalinist dictatorship and reaction, 1941–1964', 'great patriotic war khrushchev de stalinisation', ['Explain the Great Patriotic War and late Stalinism', 'Explain Khrushchev’s reforms and fall']]
      ]],
      ['Depth: Democracy and Nazism, Germany 1918–1945 (2O)', 'Component 2 · options vary by school', ['p2'], [
        ['Weimar: establishment and early problems, 1918–1924', 'weimar republic treaty of versailles 1923 crisis', ['Explain the constitution, Versailles, uprisings and the 1923 crisis']],
        ['The ‘Golden Age’, 1924–1928', 'stresemann golden age weimar', ['Evaluate Stresemann’s recovery and its limits']],
        ['The collapse of democracy, 1928–1933', 'depression nazi rise to power 1933', ['Explain the Depression, Nazi electoral success and how Hitler became Chancellor']],
        ['The Nazi dictatorship, 1933–1939', 'nazi consolidation of power police state', ['Explain consolidation of power, propaganda and terror']],
        ['Nazi economic, social and racial policy', 'nazi economy social policy persecution', ['Explain economic policy, social policies and the persecution of minorities']],
        ['The impact of war, 1939–1945', 'nazi germany war economy holocaust', ['Explain the war economy, the Holocaust and opposition']]
      ]],
      ['Historical skills and NEA', 'Skills', [], [
        ['Source and interpretation skills', 'a level history source analysis interpretations', ['Assess the value of sources for a purpose', 'Evaluate historians’ interpretations']],
        ['Essay technique', 'a level history essay technique', ['Write a balanced, sustained argument with a clear judgement']],
        ['Historical investigation (NEA)', 'history nea coursework', ['Write a 3,000–3,500 word investigation covering about 100 years']]
      ]]
    ]
  });

  // ---------- English Literature (AQA A 7712) ----------
  subject({
    id: 'englit', short: 'eng', name: 'English Literature', board: 'AQA', spec: '7712 (Specification A)', tag: 'ENG', color: '#6366F1', video: ['bruff'],
    papers: [P('p1', '7712/1', 'Paper 1: Love through the ages', 180, 75), P('p2', '7712/2', 'Paper 2: Texts in shared contexts', 150, 75)],
    res: [r('aqa', 'notes', 'AQA A-level English Literature A specification and past papers', 'https://www.aqa.org.uk/subjects/english/a-level/english-7712'), r('mrbruffsite', 'notes', 'Mr Bruff', 'https://www.mrbruff.com/')].concat(common('English Literature')),
    sections: [
      ['Love through the ages', 'Paper 1 · set texts vary by school', ['p1'], [
        ['Shakespeare: Othello', 'othello themes characters analysis', ['Analyse love, jealousy, race and power in Othello', 'Use critical views and context (AO5, AO3)']],
        ['Unseen poetry', 'unseen poetry comparison', ['Compare two unseen love poems confidently']],
        ['AQA love poetry anthology', 'aqa love poetry through the ages anthology', ['Know your pre- or post-1900 anthology poems']],
        ['Comparing prose: The Great Gatsby and Wuthering Heights', 'great gatsby wuthering heights love', ['Compare how love is presented across two prose texts']]
      ]],
      ['Texts in shared contexts: modern times', 'Paper 2 · set texts vary by school', ['p2'], [
        ['Prose: The Handmaid’s Tale', 'handmaids tale analysis', ['Analyse themes, narrative voice and context']],
        ['Drama: A Streetcar Named Desire', 'a streetcar named desire analysis', ['Analyse themes, staging and context']],
        ['Poetry: Feminine Gospels', 'feminine gospels carol ann duffy', ['Analyse key poems and themes']],
        ['Unseen prose extract', 'unseen prose analysis', ['Analyse an unseen extract in relation to the period']]
      ]],
      ['Skills and NEA', 'Skills', [], [
        ['Assessment objectives AO1–AO5', 'english literature assessment objectives', ['Write accurately, analyse methods, use context, make connections and engage with interpretations']],
        ['Independent critical study (NEA)', 'english literature nea', ['Compare two texts in a 2,500 word essay']]
      ]]
    ]
  });

  // ---------- Politics (Edexcel 9PL0) ----------
  subject({
    id: 'politics', short: 'pol', name: 'Politics', board: 'Pearson Edexcel', spec: '9PL0', tag: 'POL', color: '#0F766E', video: ['t2uall'],
    papers: [P('p1', '9PL0/01', 'Component 1: UK politics', 120, 84), P('p2', '9PL0/02', 'Component 2: UK government', 120, 84), P('p3', '9PL0/03', 'Component 3: Comparative politics (USA)', 120, 84)],
    res: [r('pearson', 'notes', 'Edexcel A-level Politics specification', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/politics-2017.html'), r('t2u', 'notes', 'tutor2u Politics', 'https://www.tutor2u.net/politics')].concat(common('Politics')),
    sections: [
      ['UK politics', 'Component 1', ['p1'], [
        ['Democracy and participation', 'direct representative democracy participation pressure groups', ['Compare direct and representative democracy', 'Discuss participation, pressure groups and rights']],
        ['Political parties', 'uk political parties', ['Explain party functions, funding and ideas', 'Discuss the party system']],
        ['Electoral systems', 'fptp ams stv sv electoral systems', ['Compare FPTP, AMS, STV and SV', 'Discuss referendums']],
        ['Voting behaviour and the media', 'voting behaviour media', ['Explain social factors and the media’s influence using elections since 1945']],
        ['Core ideas: conservatism, liberalism, socialism', 'conservatism liberalism socialism', ['Explain core ideas and key thinkers']]
      ]],
      ['UK government', 'Component 2', ['p2'], [
        ['The constitution', 'uk constitution sources reform', ['Explain sources and principles; evaluate reforms and devolution']],
        ['Parliament', 'house of commons house of lords', ['Explain the structure, roles and powers of both houses']],
        ['The Prime Minister and executive', 'prime minister cabinet', ['Explain powers, ministerial responsibility and the PM–cabinet relationship']],
        ['Relations between the branches', 'supreme court eu relations', ['Explain the Supreme Court and the balance of power']],
        ['Optional idea: feminism', 'feminism political idea', ['Explain feminist ideas and key thinkers']]
      ]],
      ['Comparative politics: USA', 'Component 3', ['p3'], [
        ['The US Constitution and federalism', 'us constitution federalism', ['Explain the Constitution, amendment and federalism']],
        ['Congress, the presidency and the Supreme Court', 'us congress presidency supreme court', ['Explain the powers and roles of each branch']],
        ['Democracy, participation and civil rights', 'us elections parties pressure groups civil rights', ['Explain elections, parties, pressure groups and civil rights']],
        ['Comparing the UK and the USA', 'comparative theories rational structural cultural', ['Use rational, cultural and structural theories']]
      ]]
    ]
  });

  // ---------- Modern languages (AQA) ----------
  function language(id, short, name, spec, tag, color, themes, extra) {
    subject({
      id: id, short: short, name: name, board: 'AQA', spec: spec, tag: tag, color: color, video: [],
      papers: [P('p1', spec + '/1', 'Paper 1: Listening, reading and writing', 150, 100), P('p2', spec + '/2', 'Paper 2: Writing (literary text or film)', 120, 80), P('p3', spec + '/3', 'Paper 3: Speaking', 23, 60)],
      res: [r('aqa', 'notes', 'AQA A-level ' + name + ' specification and past papers', extra)].concat(common(name)),
      sections: themes.concat([['Skills', 'Skills', ['p1', 'p2', 'p3'], [
        ['Grammar', name.toLowerCase() + ' a level grammar', ['Master the grammar list in the specification']],
        ['Literary text or film essay', name.toLowerCase() + ' a level film essay', ['Write a critical essay on a set text or film']],
        ['Individual research project', name.toLowerCase() + ' a level irp', ['Research a topic and present and discuss it in the speaking exam']],
        ['Translation', name.toLowerCase() + ' translation practice', ['Translate into and out of ' + name]]
      ]]])
    });
  }
  const T3 = (title, items) => [title, 'Themes', ['p1', 'p3'], items.map((x) => [x, x.toLowerCase(), ['Know vocabulary, key facts and opinions you can use in reading, listening and speaking']])];
  language('french', 'fre', 'French', '7652', 'FRE', '#2563EB', [
    T3('Aspects of French-speaking society: current trends', ['The changing nature of family', 'The ‘cyber-society’', 'The place of voluntary work']),
    T3('Aspects of French-speaking society: current issues', ['Positive features of a diverse society', 'Life for the marginalised', 'How criminals are treated']),
    T3('Artistic culture in the French-speaking world', ['A culture proud of its heritage', 'Contemporary francophone music', 'Cinema: the 7th art form']),
    T3('Aspects of political life in the French-speaking world', ['Teenagers, the right to vote and political commitment', 'Demonstrations and strikes: who holds the power?', 'Politics and immigration'])
  ], 'https://www.aqa.org.uk/subjects/french/a-level/french-7652');
  language('spanish', 'spa', 'Spanish', '7692', 'SPA', '#E11D48', [
    T3('Aspects of Hispanic society', ['Modern and traditional values', 'Cyberspace', 'Equal rights']),
    T3('Multiculturalism in Hispanic society', ['Immigration', 'Racism', 'Integration']),
    T3('Artistic culture in the Hispanic world', ['Modern-day idols', 'Spanish regional identity', 'Cultural heritage']),
    T3('Aspects of political life in the Hispanic world', ['Today’s youth, tomorrow’s citizens', 'Monarchies, republics and dictatorships', 'Popular movements'])
  ], 'https://www.aqa.org.uk/subjects/spanish/a-level/spanish-7692');

  // ---------- Arabic (Edexcel 9AA0) ----------
  subject({
    id: 'arabic', short: 'ara', name: 'Arabic', board: 'Pearson Edexcel', spec: '9AA0', tag: 'ARA', color: '#059669', video: [],
    papers: [P('p1', '9AA0/01', 'Paper 1: Listening, reading and translation', 120), P('p2', '9AA0/02', 'Paper 2: Written response to works and translation', 160), P('p3', '9AA0/03', 'Paper 3: Speaking', 23)],
    res: [r('pearson', 'notes', 'Edexcel A-level Arabic specification', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/arabic-2018.html')].concat(common('Arabic')),
    sections: [
      ['Themes', 'Check the exact themes in your specification', ['p1', 'p3'], [
        ['Changes in Arab society', 'arabic society family education', ['Know vocabulary and views on family, education and work']],
        ['Arabic culture and media', 'arabic culture media', ['Know vocabulary and views on music, media, festivals and traditions']],
        ['Political and global issues', 'arabic current affairs vocabulary', ['Discuss current issues and the wider world']]
      ]],
      ['Skills', 'Skills', ['p1', 'p2', 'p3'], [
        ['Grammar and translation', 'arabic grammar translation', ['Translate accurately into and out of Arabic']],
        ['Literary text and film', 'arabic literature essay', ['Write critical responses to set works']],
        ['Independent research project', 'arabic speaking research project', ['Present and discuss your research in the speaking exam']]
      ]]
    ]
  });

  // ---------- Latin (OCR H443) ----------
  subject({
    id: 'latin', short: 'lat', name: 'Latin', board: 'OCR', spec: 'H443', tag: 'LAT', color: '#9333EA', video: [],
    papers: [P('p1', 'H443/01', 'Unseen translation', 105, 100), P('p2', 'H443/02', 'Prose composition or comprehension', 75, 50), P('p3', 'H443/03', 'Prose literature', 120, 75), P('p4', 'H443/04', 'Verse literature', 120, 75)],
    res: [r('ocr', 'notes', 'OCR A-level Latin specification', 'https://www.ocr.org.uk/qualifications/as-and-a-level/latin-h043-h443-from-2016/')].concat(common('Latin')),
    sections: [
      ['Language', 'Language', ['p1', 'p2'], [
        ['Accidence and syntax', 'latin grammar accidence syntax', ['Know the OCR defined vocabulary list, accidence and syntax']],
        ['Unseen prose translation (Livy)', 'latin unseen translation livy', ['Translate unseen prose accurately']],
        ['Unseen verse translation (Ovid) and scansion', 'latin ovid scansion hexameter', ['Translate unseen verse and scan hexameters']],
        ['Comprehension or prose composition', 'latin prose composition', ['Answer comprehension questions or translate English into Latin']]
      ]],
      ['Literature', 'Literature · set texts change regularly', ['p3', 'p4'], [
        ['Prose set texts', 'latin prose set text', ['Translate, analyse style and write essays on your prose set texts']],
        ['Verse set texts', 'latin verse set text virgil', ['Translate, analyse style and write essays on your verse set texts']]
      ]]
    ]
  });

  // ---------- Art and Design (AQA 7202 Fine Art) ----------
  subject({
    id: 'art', short: 'art', name: 'Art and Design', board: 'AQA', spec: '7202 (Fine Art)', tag: 'ART', color: '#F43F5E', video: [],
    papers: [P('c1', 'Component 1', 'Personal investigation (60%)', 0), P('c2', 'Component 2', 'Externally set assignment (40%, 15 hours)', 900)],
    res: [r('aqa', 'notes', 'AQA A-level Art and Design specification', 'https://www.aqa.org.uk/subjects/art-and-design/a-level/art-and-design-7201-7206')].concat(common('Art')),
    sections: [
      ['Assessment objectives', 'How you are marked', ['c1', 'c2'], [
        ['AO1: Develop ideas through investigation', 'a level art ao1 artist research', ['Investigate artists and contextual sources with critical understanding']],
        ['AO2: Explore and refine', 'a level art ao2 experimenting materials', ['Experiment with media, materials, techniques and processes']],
        ['AO3: Record ideas and observations', 'a level art ao3 drawing recording', ['Record observations and insights through drawing, photography and annotation']],
        ['AO4: Present a personal response', 'a level art ao4 final piece', ['Realise intentions in a final piece that links to your research']]
      ]],
      ['Components', 'Coursework and exam', ['c1', 'c2'], [
        ['Personal investigation and written study', 'a level art personal investigation essay', ['Develop a sustained project and a 1,000–3,000 word related study']],
        ['Externally set assignment', 'a level art externally set assignment', ['Respond to a starting point with preparatory work and a 15-hour final piece']]
      ]]
    ]
  });

  // ---------- Design and Technology (AQA 7552 Product Design) ----------
  subject({
    id: 'dt', short: 'dt', name: 'Design and Technology', board: 'AQA', spec: '7552 (Product Design)', tag: 'D&T', color: '#64748B', video: [],
    papers: [P('p1', '7552/1', 'Paper 1: Technical principles', 150, 120), P('p2', '7552/2', 'Paper 2: Designing and making principles', 90, 80)],
    res: [r('aqa', 'notes', 'AQA A-level Product Design specification', 'https://www.aqa.org.uk/subjects/design-and-technology/a-level/design-and-technology-7552')].concat(common('Design and Technology')),
    sections: [
      ['Technical principles', 'Paper 1', ['p1'], [
        ['Materials and their applications', 'product design materials properties', ['Know properties and uses of papers, polymers, woods, metals, composites and smart materials']],
        ['Enhancement, forming and joining', 'manufacturing processes forming joining', ['Describe processes for forming, redistribution, addition and joining']],
        ['Modern manufacturing and digital design', 'cad cam modern manufacturing', ['Explain CAD/CAM, lean manufacturing and JIT']],
        ['Health, safety, standards and design for manufacture', 'product design health and safety standards', ['Explain safety, standards, IP protection and design for maintenance']]
      ]],
      ['Designing and making principles', 'Paper 2', ['p2'], [
        ['Design methods and design theory', 'design movements designers', ['Explain iterative design and key designers and movements']],
        ['Responsible design and sustainability', 'sustainable design life cycle assessment', ['Evaluate environmental, social and moral issues']],
        ['Critical analysis and evaluation', 'product analysis evaluation', ['Analyse and evaluate products']],
        ['Project management and enterprise', 'project management gantt enterprise', ['Use project management tools and understand marketing']]
      ]],
      ['NEA', 'Coursework', [], [['Design and make project', 'product design nea', ['Identify a problem, design, prototype and evaluate a solution']]]]
    ]
  });

  // ---------- Drama and Theatre (AQA 7262) ----------
  subject({
    id: 'drama', short: 'dra', name: 'Drama and Theatre', board: 'AQA', spec: '7262', tag: 'DRA', color: '#DB2777', video: [],
    papers: [P('p1', '7262/W', 'Component 1: Drama and theatre (written)', 180, 80)],
    res: [r('aqa', 'notes', 'AQA A-level Drama and Theatre specification', 'https://www.aqa.org.uk/subjects/drama/a-level/drama-and-theatre-7262')].concat(common('Drama')),
    sections: [
      ['Component 1: Drama and theatre', 'Written exam · set plays vary', ['p1'], [
        ['Set play study', 'a level drama set play', ['Analyse how a set play could be performed and staged']],
        ['Live theatre production', 'a level drama live theatre review', ['Analyse and evaluate a live production']],
        ['Practitioners', 'stanislavski brecht artaud frantic assembly', ['Explain Stanislavski, Brecht, Artaud and contemporary companies']]
      ]],
      ['Practical components', 'Performance', [], [
        ['Component 2: Creating original drama', 'devising drama practitioner', ['Devise and perform original work influenced by a practitioner, with a working notebook']],
        ['Component 3: Making theatre', 'a level drama scripted extracts', ['Perform extracts and write a reflective report']]
      ]]
    ]
  });

  // ---------- Music (Edexcel 9MU0) ----------
  subject({
    id: 'music', short: 'mus', name: 'Music', board: 'Pearson Edexcel', spec: '9MU0', tag: 'MUS', color: '#F59E0B', video: ['musicteacher'],
    papers: [P('p3', '9MU0/03', 'Component 3: Appraising', 130, 100)],
    res: [r('pearson', 'notes', 'Edexcel A-level Music specification', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/music-2016.html')].concat(common('Music')),
    sections: [
      ['Appraising: areas of study', 'Component 3 · set works can change: check with your teacher', ['p3'], [
        ['Vocal music', 'edexcel a level music vocal music set works', ['Analyse the vocal set works and wider listening']],
        ['Instrumental music', 'edexcel a level music instrumental set works', ['Analyse the instrumental set works']],
        ['Music for film', 'edexcel a level music film music set works', ['Analyse the film set works']],
        ['Popular music and jazz', 'edexcel a level music popular music jazz', ['Analyse the popular music and jazz set works']],
        ['Fusions', 'edexcel a level music fusions', ['Analyse the fusions set works']],
        ['New directions', 'edexcel a level music new directions', ['Analyse the new directions set works']],
        ['Unfamiliar listening and dictation', 'music melodic dictation', ['Answer on unfamiliar pieces and complete melodic or rhythmic dictation']]
      ]],
      ['Performing and composing', 'Coursework', [], [
        ['Component 1: Performing', 'a level music performance', ['Perform a recital of at least 8 minutes']],
        ['Component 2: Composing', 'a level music composition', ['Compose two pieces, one free and one to a brief, plus technique exercises']]
      ]]
    ]
  });

  // ---------- Physical Education (AQA 7582) ----------
  subject({
    id: 'pe', short: 'pe', name: 'Physical Education', board: 'AQA', spec: '7582', tag: 'PE', color: '#10B981', video: [],
    papers: [P('p1', '7582/1', 'Paper 1: Factors affecting participation', 120, 105), P('p2', '7582/2', 'Paper 2: Factors affecting optimal performance', 120, 105)],
    res: [r('aqa', 'notes', 'AQA A-level PE specification and past papers', 'https://www.aqa.org.uk/subjects/physical-education/a-level/physical-education-7582')].concat(common('PE')),
    sections: [
      ['Factors affecting participation', 'Paper 1', ['p1'], [
        ['Applied anatomy and physiology', 'cardiovascular respiratory neuromuscular systems', ['Explain the cardiovascular, respiratory and neuromuscular systems and energy systems']],
        ['Skill acquisition', 'skill acquisition learning theories guidance feedback', ['Explain classification of skills, transfer, learning theories, guidance and feedback']],
        ['Sport and society', 'sport and society history', ['Explain the development of sport and sociological theory']]
      ]],
      ['Factors affecting optimal performance', 'Paper 2', ['p2'], [
        ['Exercise physiology', 'diet training methods injury', ['Explain diet, ergogenic aids, training methods and injury']],
        ['Biomechanical movement', 'newtons laws projectile motion biomechanics', ['Apply Newton’s laws, levers, projectiles and fluid mechanics to sport']],
        ['Sport psychology', 'sport psychology anxiety motivation', ['Explain personality, motivation, arousal, anxiety, aggression and leadership']],
        ['Sport and the role of technology', 'technology in sport', ['Discuss data, technology and its effects on sport']]
      ]],
      ['NEA', 'Practical', [], [['Performance and analysis', 'a level pe nea', ['Perform in one activity and analyse and evaluate performance']]]]
    ]
  });
})(window.RH = window.RH || {});
