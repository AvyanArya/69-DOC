/* Pearson Edexcel A-level Physics (9PH0). Topics follow the specification's 13 topics. */
(function (RH) {
  'use strict';
  const L = RH.link, r = L.r;

  const notes = (folder, file) => L.pmtFile('Physics/A-level/Notes/Edexcel/' + folder + '/' + file);
  const cards = (slug, card) => L.pmtPage('physics-revision/a-level-edexcel/' + slug + '/' + card + '-flashcards/');
  const topicQ = (folder, set, file) => L.pmtFile('Physics/A-level/Topic-Qs/Edexcel/' + folder + '/' + set + '/' + file);
  const cp = (file) => L.pmtFile('Physics/A-level/Notes/Edexcel/Practical-Skills/' + file + '.pdf');

  // Resources every subtopic in a spec topic shares.
  function topicPack(n, slug, folder, notesName, defsName, smeSlug) {
    return [
      r('pmt', 'notes', 'Detailed notes: Topic ' + n, notes(folder, 'Notes - Topic ' + n + ' ' + notesName + ' - Edexcel Physics A-level.pdf')),
      r('pmt', 'notes', 'Definitions list: Topic ' + n, notes(folder, 'Definitions - Topic ' + n + ' ' + defsName + ' - Edexcel Physics A-level.pdf')),
      r('pmt', 'notes', 'Key points summary', L.pmtPage('physics-revision/a-level-edexcel/' + slug + '/key-points/')),
      r('pmt', 'qs', 'Questions by topic with mark schemes', L.pmtPage('physics-revision/a-level-edexcel/' + slug + '/')),
      r('sme', 'notes', 'Revision notes, flashcards & topic questions', L.sme('physics/edexcel/17/topics/' + smeSlug + '/'))
    ];
  }

  const CP = {
    1:  r('pmt', 'notes', 'Core Practical 1: acceleration of free fall', cp('CP 01 - Determine the Acceleration of a Freely-Falling Object')),
    2:  r('pmt', 'notes', 'Core Practical 2: resistivity of a material', cp('CP 02 - Determine the Electrical Resistivity of a Material')),
    3:  r('pmt', 'notes', 'Core Practical 3: EMF and internal resistance', cp('CP 03 - Determine the EMF and Internal Resistance of an Electrical Cell')),
    4:  r('pmt', 'notes', 'Core Practical 4: viscosity of a liquid', cp('CP 04 - Determine the Viscosity of a Liquid')),
    5:  r('pmt', 'notes', "Core Practical 5: Young's modulus", cp('CP 05 - Determine the Young\u2019s Modulus of a Material')),
    6:  r('pmt', 'notes', 'Core Practical 6: speed of sound in air', cp('CP 06 - Determine the Speed of Sound in Air')),
    7:  r('pmt', 'notes', 'Core Practical 7: vibrating string', cp('CP 07 - Factors affecting the Frequency of a Vibrating String')),
    8:  r('pmt', 'notes', 'Core Practical 8: wavelength of light (grating)', cp('CP 08 - Determine the Wavelength of Light')),
    9:  r('pmt', 'notes', 'Core Practical 9: change in momentum', cp('CP 09 - Investigating Change in Momentum')),
    10: r('pmt', 'notes', 'Core Practical 10: collisions using ICT', cp('CP 10 - Use ICT to analyse Collisions between Small Spheres')),
    11: r('pmt', 'notes', 'Core Practical 11: capacitor charge & discharge', cp('CP 11 - Analyse the PD across a charging and discharging Capacitor')),
    12: r('pmt', 'notes', 'Core Practical 12: calibrate a thermistor', cp('CP 12 - Calibrate a Thermistor in a Potential Divider Circuit as a Thermostat')),
    13: r('pmt', 'notes', 'Core Practical 13: specific latent heat', cp('CP 13 - Determine the Specific Latent Heat of a Phase Change')),
    14: r('pmt', 'notes', 'Core Practical 14: pressure and volume of a gas', cp('CP 14 - Investigate the relationship between Pressure and Volume of a Gas')),
    15: r('pmt', 'notes', 'Core Practical 15: absorption of gamma by lead', cp('CP 15 - Investigate the Absorption of Gamma Radiation by Lead')),
    16: r('pmt', 'notes', 'Core Practical 16: mass from resonant frequency', cp('CP 16 - Determine the value of an unknown Mass using the Resonant Frequencies'))
  };

  RH.SUBJECT_LIST = RH.SUBJECT_LIST || [];
  RH.SUBJECT_LIST.push({
    id: 'physics', short: 'phy', name: 'Physics', board: 'Pearson Edexcel', spec: '9PH0',
    video: ['phyo', 'gill', 'cog'],
    papers: [
      { id: 'p1', code: '9PH0/01', name: 'Paper 1: Advanced Physics I', dur: 105, marks: 90, weight: '30%', what: 'Topics 1–3 and 6–8: mechanics, circuits, further mechanics, fields, nuclear & particle physics.' },
      { id: 'p2', code: '9PH0/02', name: 'Paper 2: Advanced Physics II', dur: 105, marks: 90, weight: '30%', what: 'Topics 1, 4, 5 and 9–13: materials, waves, thermodynamics, space, radiation, gravity, oscillations.' },
      { id: 'p3', code: '9PH0/03', name: 'Paper 3: General and Practical Principles in Physics', dur: 150, marks: 120, weight: '40%', what: 'Any topic, with synoptic questions and core-practical skills. Practical questions make up a large share of the marks.' }
    ],
    res: [
      r('pmt', 'notes', 'PMT Edexcel A-level Physics: all topics', L.pmtPage('physics-revision/a-level-edexcel/')),
      r('pmt', 'papers', 'Past papers: Paper 1', L.pmtPage('past-papers/a-level-physics/edexcel-paper-1/')),
      r('pmt', 'papers', 'Past papers: Paper 2', L.pmtPage('past-papers/a-level-physics/edexcel-paper-2/')),
      r('pmt', 'papers', 'Past papers: Paper 3', L.pmtPage('past-papers/a-level-physics/edexcel-paper-3/')),
      r('pmt', 'notes', 'Core practicals (CP1–CP16) notes', L.pmtPage('physics-revision/a-level-edexcel/practical-skills/')),
      r('cog', 'notes', 'Cognito Edexcel Physics revision notes', L.cog('physics/edexcel/notes')),
      r('cog', 'cards', 'Cognito quizzes', L.cog('physics/edexcel/quiz')),
      r('cog', 'cards', 'Cognito flashcards', L.cog('physics/edexcel/flashcards')),
      r('cog', 'qs', 'Cognito exam questions', L.cog('physics/edexcel/exam-practice/structured')),
      r('cog', 'papers', 'Cognito past papers by year', L.cog('physics/edexcel/past-papers/by-year')),
      r('sme', 'notes', 'Save My Exams revision notes', L.sme('physics/edexcel/17/revision-notes/')),
      r('sme', 'qs', 'Save My Exams topic questions', L.sme('physics/edexcel/17/topic-questions/')),
      r('phyo', 'video', 'Physics Online video lessons', 'https://www.youtube.com/@PhysicsOnline/playlists'),
      r('isaac', 'qs', 'Isaac Physics problem practice', 'https://isaacphysics.org/practice'),
      r('pearson', 'other', 'Specification + data, formulae & relationships booklet', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/physics-2015.html')
    ],
    comps: [
      { id: 't1', name: 'Topic 1: Working as a Physicist', papers: ['p1', 'p2', 'p3'],
        res: topicPack(1, 'working-as-physicist', '01-Working-as-a-Physicist', 'Working as a Physicist', 'Working as a Physicist', '1-working-as-a-physicist')
          .concat([r('pmt', 'cards', 'Flashcards: Working as a Physicist', cards('working-as-physicist', 'working-as-a-physicist'))]),
        topics: [
          { id: 'units', name: 'SI units, prefixes & estimation', q: 'SI units base units',
            pts: ['Know the SI base units: kg, m, s, A, K, mol', 'Write derived units in base units (e.g. N = kg m s⁻²)', 'Use prefixes from pico (10⁻¹²) to tera (10¹²)', 'Check an equation is homogeneous (units match both sides)', 'Make order-of-magnitude estimates of physical quantities'],
            tip: 'Units questions are quick marks on every paper: always show the base-unit working line by line.' },
          { id: 'uncert', name: 'Uncertainties, errors & graphs', q: 'uncertainties practical skills',
            pts: ['Tell random errors from systematic errors (including zero errors)', 'Find absolute, fractional and percentage uncertainty', 'Combine uncertainties when adding, multiplying and raising to powers', 'Use precision, accuracy, resolution and repeatability correctly', 'Plot graphs, draw best-fit lines and find gradients and intercepts', 'Linearise relationships, including log–log and log–linear graphs'],
            tip: 'Paper 3 spends many marks on practical method and uncertainty. Learn the standard phrases word for word.' }
        ] },

      { id: 't2', name: 'Topic 2: Mechanics', papers: ['p1', 'p3'],
        res: topicPack(2, 'mechanics', '02-Mechanics', 'Mechanics', 'Mechanics', '2-mechanics'),
        topics: [
          { id: 'motion', name: 'Motion, vectors & SUVAT', q: 'SUVAT equations of motion',
            pts: ['Tell scalars from vectors; add vectors and resolve them into components', 'Use displacement–time, velocity–time and acceleration–time graphs (gradients and areas)', 'Use the SUVAT equations for uniform acceleration', 'Analyse projectile motion with independent horizontal and vertical motion', 'Describe Core Practical 1: measuring g by free fall'],
            res: [CP[1], r('pmt', 'cards', 'Flashcards: Motion and quantities', cards('mechanics', 'motion-and-quantities')), r('pmt', 'qs', 'Exam questions: Motion and kinematic quantities', topicQ('02-Mechanics', 'Set-N', 'Motion and Kinematic Quantities.pdf'))] },
          { id: 'forces', name: "Forces & Newton's laws", q: "Newton's laws of motion free body diagrams",
            pts: ['Draw free-body force diagrams', "Apply Newton's first and second laws (ΣF = ma)", "Identify Newton's third-law pairs", 'Use W = mg and centre of gravity', 'Resolve forces on slopes and in equilibrium'],
            res: [r('pmt', 'cards', "Flashcards: Newton's laws and momentum", cards('mechanics', 'newtons-laws-and-momentum')), r('pmt', 'qs', "Exam questions: Newton's laws and momentum", topicQ('02-Mechanics', 'Set-N', "Newton's Laws and Momentum.pdf"))] },
          { id: 'momentum', name: 'Momentum & its conservation', q: 'conservation of momentum',
            pts: ['Use p = mv', 'Apply conservation of linear momentum in one dimension', "Use Newton's second law as F = Δp/Δt", 'Solve collision and explosion problems'],
            res: [r('pmt', 'cards', "Flashcards: Newton's laws and momentum", cards('mechanics', 'newtons-laws-and-momentum'))] },
          { id: 'moments', name: 'Moments & equilibrium', q: 'moments principle of moments',
            pts: ['Calculate the moment of a force: moment = Fx', 'Apply the principle of moments to bodies in equilibrium', 'Find the centre of gravity of a body', 'Solve beam and see-saw problems with several forces'],
            res: [r('pmt', 'cards', 'Flashcards: Moments', cards('mechanics', 'moments')), r('pmt', 'qs', 'Exam questions: Moments', topicQ('02-Mechanics', 'Set-N', 'Moments.pdf'))] },
          { id: 'energy', name: 'Work, energy & power', q: 'work energy power efficiency',
            pts: ['Use ΔW = FΔs (force component along the motion)', 'Use ΔEgrav = mgΔh and Ek = ½mv²', 'Apply conservation of energy, including energy transferred by resistive forces', 'Use P = E/t = W/t', 'Calculate efficiency as useful output ÷ total input'],
            res: [r('pmt', 'cards', 'Flashcards: Energy and efficiency', cards('mechanics', 'energy-and-efficiency')), r('pmt', 'qs', 'Exam questions: Work, energy and power', topicQ('02-Mechanics', 'Set-N', 'Work, Energy and Power.pdf'))] }
        ] },

      { id: 't3', name: 'Topic 3: Electric Circuits', papers: ['p1', 'p3'],
        res: topicPack(3, 'electric-circuits', '03-Electric-Circuits', 'Electric circuits', 'Electric Circuits', '3-electric-circuits'),
        topics: [
          { id: 'current', name: 'Charge, current & potential difference', q: 'current charge drift velocity',
            pts: ['Use I = ΔQ/Δt and the idea of charge carriers', 'Use I = nqvA and explain drift velocity', 'Define potential difference as V = W/Q', 'Tell EMF from potential difference', 'Use conservation of charge and energy in circuits'],
            res: [r('pmt', 'cards', 'Flashcards: Electric circuits', cards('electric-circuits', 'electric-circuits'))] },
          { id: 'resist', name: 'Resistance, resistivity & I–V graphs', q: 'resistivity I-V characteristics',
            pts: ['Use R = V/I and state Ohm\'s law', 'Sketch and explain I–V graphs for a resistor, filament lamp and diode', 'Use R = ρl/A', 'Explain NTC thermistors and LDRs in terms of charge carriers', 'Describe Core Practical 2: measuring resistivity'],
            res: [CP[2], r('pmt', 'cards', 'Flashcards: Resistance and resistivity', cards('electric-circuits', 'resistance-and-resistivity'))] },
          { id: 'series', name: 'Series & parallel circuits, power', q: 'series and parallel circuits',
            pts: ['Find total resistance for resistors in series and parallel', 'Apply rules for current and p.d. in series and parallel circuits', 'Use P = VI = I²R = V²/R and W = VIt', 'Solve multi-loop problems using conservation of charge and energy'] },
          { id: 'potdiv', name: 'Potential dividers & sensors', q: 'potential divider circuits',
            pts: ['Use V_out = R₂/(R₁+R₂) × V_in', 'Explain how a thermistor or LDR changes a potential divider output', 'Design sensing circuits for temperature or light'],
            res: [CP[12]] },
          { id: 'emf', name: 'EMF & internal resistance', q: 'EMF internal resistance',
            pts: ['Use ε = I(R + r) and V = ε − Ir', 'Explain why terminal p.d. falls as current rises', 'Find ε and r from a V–I graph (intercept and gradient)', 'Describe Core Practical 3'],
            res: [CP[3]] }
        ] },

      { id: 't4', name: 'Topic 4: Materials', papers: ['p2', 'p3'],
        res: topicPack(4, 'materials', '04-Materials', 'Materials', 'Materials', '4-materials')
          .concat([r('pmt', 'cards', 'Flashcards: Materials', cards('materials', 'materials'))]),
        topics: [
          { id: 'fluids', name: 'Fluids: density, upthrust & viscosity', q: "Stokes' law viscosity upthrust",
            pts: ['Use ρ = m/V', 'Explain upthrust as the weight of fluid displaced (Archimedes)', 'Tell laminar from turbulent flow', "Use Stokes' law F = 6πηrv and explain terminal velocity", 'Explain how viscosity depends on temperature', 'Describe Core Practical 4: falling-ball viscometer'],
            res: [CP[4]] },
          { id: 'solids', name: "Solids: Hooke's law & Young modulus", q: "Young's modulus stress strain",
            pts: ["Use Hooke's law F = kΔx", 'Define stress, strain and the Young modulus E = σ/ε', 'Interpret force–extension and stress–strain graphs (limit of proportionality, elastic limit, yield point, breaking stress)', 'Tell elastic from plastic deformation', 'Use ΔE_el = ½FΔx and area under the graph', "Describe Core Practical 5: measuring Young's modulus"],
            res: [CP[5]] }
        ] },

      { id: 't5', name: 'Topic 5: Waves & Particle Nature of Light', papers: ['p2', 'p3'],
        res: topicPack(5, 'waves-and-particle-nature-of-light', '05-Waves-and-Particle-Nature-of-Light', 'Waves and Particle Nature of Light', 'Waves and Particle Nature of Light', '5-waves-and-particle-nature-of-light'),
        topics: [
          { id: 'waves', name: 'Progressive waves', q: 'progressive waves transverse longitudinal',
            pts: ['Tell transverse from longitudinal waves', 'Use v = fλ', 'Define amplitude, period, phase and path difference', 'Read displacement–distance and displacement–time graphs', 'Describe Core Practical 6: speed of sound'],
            res: [CP[6], r('pmt', 'cards', 'Flashcards: Progressive and stationary waves', cards('waves-and-particle-nature-of-light', 'progressive-and-stationary-waves'))] },
          { id: 'stationary', name: 'Superposition & stationary waves', q: 'stationary waves harmonics',
            pts: ['Apply the principle of superposition and coherence', 'Explain how stationary waves form, with nodes and antinodes', 'Find frequencies of harmonics on strings and in pipes', 'Use v = √(T/μ) for a string', 'Describe Core Practical 7: vibrating string'],
            res: [CP[7]] },
          { id: 'intensity', name: 'Intensity, polarisation & pulse-echo', q: 'polarisation intensity',
            pts: ['Use intensity I = P/A', 'Explain plane polarisation and its uses', 'Explain the pulse-echo technique and what limits its detail'] },
          { id: 'refraction', name: 'Refraction, TIR & lenses', q: 'refraction total internal reflection lenses',
            pts: ['Use n = c/v and n₁ sin θ₁ = n₂ sin θ₂', 'Use sin C = 1/n for total internal reflection', 'Use lens power P = 1/f and 1/u + 1/v = 1/f', 'Use magnification m = v/u', 'Draw ray diagrams for converging and diverging lenses; real and virtual images'],
            res: [r('pmt', 'cards', 'Flashcards: TIR and lenses', cards('waves-and-particle-nature-of-light', 'TIR-and-lenses'))] },
          { id: 'diffraction', name: 'Diffraction & the diffraction grating', q: 'diffraction grating',
            pts: ['Explain diffraction through gaps and around obstacles', 'Use nλ = d sin θ for a grating', 'Explain electron diffraction as evidence that particles behave as waves', 'Use the de Broglie wavelength λ = h/p', 'Describe Core Practical 8: wavelength of light'],
            res: [CP[8], r('pmt', 'cards', 'Flashcards: Diffraction and the nature of light', cards('waves-and-particle-nature-of-light', 'diffraction-and-the-nature-of-light'))] },
          { id: 'photons', name: 'Photons, photoelectric effect & energy levels', q: 'photoelectric effect',
            pts: ['Use E = hf and convert between joules and electronvolts', 'Explain the photoelectric effect as evidence for photons', 'Use hf = φ + ½mv²max and threshold frequency', 'Explain line spectra using atomic energy levels', 'Discuss wave–particle duality'] }
        ] },

      { id: 't6', name: 'Topic 6: Further Mechanics', papers: ['p1', 'p3'],
        res: topicPack(6, 'further-mechanics', '06-Further-Mechanics', 'Further Mechanics', 'Further Mechanics', '6-further-mechanics')
          .concat([r('pmt', 'cards', 'Flashcards: Further mechanics', cards('further-mechanics', 'further-mechanics'))]),
        topics: [
          { id: 'impulse', name: 'Impulse & collisions in 2D', q: 'impulse collisions two dimensions',
            pts: ['Use impulse FΔt = Δp and force–time graphs', 'Apply conservation of momentum in two dimensions', 'Tell elastic from inelastic collisions using kinetic energy', 'Use Ek = p²/2m', 'Describe Core Practicals 9 and 10'],
            res: [CP[9], CP[10]] },
          { id: 'circular', name: 'Circular motion', q: 'circular motion centripetal force',
            pts: ['Measure angles in radians; use ω = Δθ/Δt and v = ωr', 'Use T = 2π/ω', 'Use a = v²/r = rω² and F = mv²/r', 'Identify the real force that provides the centripetal force'] }
        ] },

      { id: 't7', name: 'Topic 7: Electric & Magnetic Fields', papers: ['p1', 'p3'],
        res: topicPack(7, 'electric-magnetic-fields', '07-Electric-and-Magnetic-Fields', 'Electric and Magnetic Fields', 'Electric and Magnetic Fields', '7-electric-and-magnetic-fields'),
        topics: [
          { id: 'efields', name: 'Electric fields & potential', q: 'electric fields potential',
            pts: ['Use E = F/Q and draw field lines', 'Use E = V/d for a uniform field', "Use Coulomb's law F = Q₁Q₂/4πε₀r² and E = Q/4πε₀r² for radial fields", 'Use V = Q/4πε₀r and draw equipotentials', 'Analyse charged particles moving in uniform electric fields'],
            res: [r('pmt', 'cards', 'Flashcards: Electric fields', cards('electric-magnetic-fields', 'electric-fields'))] },
          { id: 'capacitors', name: 'Capacitors', q: 'capacitor charging discharging',
            pts: ['Use C = Q/V', 'Use W = ½QV = ½CV² = ½Q²/C', 'Describe charging and discharging through a resistor', 'Use the time constant RC and Q = Q₀e^(−t/RC)', 'Use ln graphs to find the time constant', 'Describe Core Practical 11'],
            res: [CP[11], r('pmt', 'cards', 'Flashcards: Capacitors', cards('electric-magnetic-fields', 'capacitors'))] },
          { id: 'bfields', name: 'Magnetic fields & forces', q: 'magnetic flux density force on wire',
            pts: ['Define magnetic flux density B, flux Φ = BA and flux linkage NΦ', 'Use F = BIl sin θ and Fleming\'s left-hand rule', 'Use F = Bqv sin θ', 'Explain circular paths of charged particles in magnetic fields'],
            res: [r('pmt', 'cards', 'Flashcards: Magnetic fields', cards('electric-magnetic-fields', 'magnetic-fields'))] },
          { id: 'induction', name: 'Electromagnetic induction', q: "electromagnetic induction Faraday's law Lenz's law",
            pts: ["State Faraday's law: induced emf = rate of change of flux linkage", "Use Lenz's law to find the direction of induced current", 'Calculate emf for a conductor moving through a field', 'Sketch flux linkage and emf graphs for a rotating coil'] }
        ] },

      { id: 't8', name: 'Topic 8: Nuclear & Particle Physics', papers: ['p1', 'p3'],
        res: topicPack(8, 'nuclear-particle-physics', '08-Nuclear-and-Particle', 'Nuclear and Particle Physics', 'Nuclear and Particle Physics', '8-nuclear-and-particle-physics'),
        topics: [
          { id: 'atom', name: 'The nuclear atom & electron beams', q: 'alpha scattering nuclear atom',
            pts: ['Explain what alpha-particle scattering shows about the nucleus', 'Use nucleon number, proton number and isotopes', 'Explain thermionic emission and accelerating electrons through a p.d. (eV = ½mv²)'],
            res: [r('pmt', 'cards', 'Flashcards: Nuclear physics', cards('nuclear-particle-physics', 'nuclear-physics'))] },
          { id: 'accel', name: 'Particle accelerators & detectors', q: 'particle accelerators cyclotron',
            pts: ['Describe linear accelerators and cyclotrons', 'Use r = p/BQ for particles in detectors', 'Use E = mc² and units of MeV, GeV and MeV/c²', 'Explain why high energies are needed to probe and create particles'] },
          { id: 'standard', name: 'The standard model', q: 'standard model quarks leptons',
            pts: ['Classify hadrons (baryons, mesons) and leptons', 'Give quark structures and charges of common particles', 'Explain antiparticles and pair production/annihilation', 'Apply conservation of charge, baryon number and lepton number'],
            res: [r('pmt', 'cards', 'Flashcards: Particle physics', cards('nuclear-particle-physics', 'particle-physics'))] }
        ] },

      { id: 't9', name: 'Topic 9: Thermodynamics', papers: ['p2', 'p3'],
        res: topicPack(9, 'thermodynamics', '09-Thermodynamics', 'Thermodynamics', 'Thermodynamics', '9-thermodynamics'),
        topics: [
          { id: 'thermal', name: 'Heat capacity, latent heat & internal energy', q: 'specific heat capacity latent heat',
            pts: ['Use ΔE = mcΔθ', 'Use ΔE = LΔm for changes of state', 'Explain internal energy as random kinetic + potential energy', 'Explain absolute zero and the kelvin scale', 'Describe Core Practicals 12 and 13'],
            res: [CP[12], CP[13], r('pmt', 'cards', 'Flashcards: Thermal physics', cards('thermodynamics', 'thermal-physics'))] },
          { id: 'gases', name: 'Ideal gases & kinetic theory', q: 'ideal gas law kinetic theory',
            pts: ['Use pV = NkT and the gas laws', 'State the assumptions of kinetic theory', 'Use ½m⟨c²⟩ = 3/2 kT', 'Describe Core Practical 14: pressure and volume'],
            res: [CP[14], r('pmt', 'cards', 'Flashcards: Gas laws', cards('thermodynamics', 'gas-laws'))] }
        ] },

      { id: 't10', name: 'Topic 10: Space', papers: ['p2', 'p3'],
        res: topicPack(10, 'space', '10-Space', 'Space', 'Space', '10-space'),
        topics: [
          { id: 'distances', name: 'Astronomical distances', q: 'stellar parallax standard candles',
            pts: ['Use trigonometric parallax', 'Explain standard candles', 'Use I = L/4πd² to find distances', 'Use light-years and parsecs'],
            res: [r('pmt', 'cards', 'Flashcards: Space distances and stars', cards('space', 'space-distances-and-stars'))] },
          { id: 'stars', name: 'Stars, black bodies & the HR diagram', q: 'Hertzsprung-Russell diagram black body radiation',
            pts: ['Describe black-body radiation', 'Use the Stefan–Boltzmann law L = σAT⁴', "Use Wien's law λmax T = 2.898 × 10⁻³ m K", 'Read the Hertzsprung–Russell diagram', 'Describe the life cycle of stars of different masses'] },
          { id: 'cosmology', name: 'Redshift & the universe', q: "redshift Hubble's law",
            pts: ['Use z = Δλ/λ ≈ v/c', "Use Hubble's law v = H₀d and estimate the age of the universe", 'Explain evidence for dark matter', 'Discuss the possible fates of the universe'],
            res: [r('pmt', 'cards', 'Flashcards: Red shift and the universe', cards('space', 'red-shift-and-the-universe'))] }
        ] },

      { id: 't11', name: 'Topic 11: Nuclear Radiation', papers: ['p2', 'p3'],
        res: topicPack(11, 'nuclear-radiation', '11-Nuclear-Radiation', 'Nuclear Radiation', 'Nuclear Radiation', '11-nuclear-radiation'),
        topics: [
          { id: 'decay', name: 'Radioactive decay & radiation types', q: 'alpha beta gamma radiation',
            pts: ['Compare alpha, beta⁻, beta⁺ and gamma radiation', 'Balance nuclear equations', 'Account for background radiation in measurements', 'Describe Core Practical 15: gamma absorption by lead'],
            res: [CP[15], r('pmt', 'cards', 'Flashcards: Nuclear radiation', cards('nuclear-radiation', 'nuclear-radiation'))] },
          { id: 'halflife', name: 'Half-life & decay equations', q: 'half life decay constant',
            pts: ['Use A = λN and dN/dt = −λN', 'Use N = N₀e^(−λt) and A = A₀e^(−λt)', 'Use t½ = ln 2/λ', 'Use log graphs to find λ', 'Explain the random, spontaneous nature of decay'] },
          { id: 'binding', name: 'Binding energy, fission & fusion', q: 'binding energy per nucleon fission fusion',
            pts: ['Calculate mass deficit and binding energy (ΔE = c²Δm)', 'Interpret the binding energy per nucleon curve', 'Explain energy release in fission and fusion', 'Explain the conditions needed for fusion'],
            res: [r('pmt', 'cards', 'Flashcards: Nuclear energy', cards('nuclear-radiation', 'nuclear-energy'))] }
        ] },

      { id: 't12', name: 'Topic 12: Gravitational Fields', papers: ['p2', 'p3'],
        res: topicPack(12, 'gravitational-fields', '12-Gravitational-Fields', 'Gravitational Fields', 'Gravitational Fields', '12-gravitational-fields')
          .concat([r('pmt', 'cards', 'Flashcards: Gravitational fields', cards('gravitational-fields', 'gravitational-fields'))]),
        topics: [
          { id: 'gfields', name: 'Gravitational fields & potential', q: 'gravitational field strength potential',
            pts: ['Use g = F/m', "Use Newton's law of gravitation F = Gm₁m₂/r²", 'Use g = Gm/r² for radial fields', 'Use V_grav = −Gm/r and equipotentials', 'Compare gravitational and electric fields'] },
          { id: 'orbits', name: 'Orbits & satellites', q: 'orbits satellites geostationary',
            pts: ['Derive orbital speed and period for circular orbits', 'Show that T² ∝ r³', 'Explain geostationary orbits', 'Calculate energy changes moving between orbits'] }
        ] },

      { id: 't13', name: 'Topic 13: Oscillations', papers: ['p2', 'p3'],
        res: topicPack(13, 'oscillations', '13-Oscillations', 'Oscillations', 'Oscillations', '13-oscillations')
          .concat([r('pmt', 'cards', 'Flashcards: Oscillations', cards('oscillations', 'oscillations'))]),
        topics: [
          { id: 'shm', name: 'Simple harmonic motion', q: 'simple harmonic motion',
            pts: ['State the conditions for SHM: F = −kx and a = −ω²x', 'Use x = A cos ωt and v = −Aω sin ωt', 'Use T = 2π√(m/k) and T = 2π√(l/g)', 'Sketch energy exchange in SHM'] },
          { id: 'damping', name: 'Damping, forced oscillations & resonance', q: 'damping resonance forced oscillations',
            pts: ['Tell free from forced oscillations', 'Explain resonance and give examples', 'Describe light, heavy and critical damping', 'Describe Core Practical 16'],
            res: [CP[16]] }
        ] },

      { id: 'cp', name: 'Core Practicals (Paper 3)', papers: ['p3'],
        res: [r('pmt', 'notes', 'All core practicals on PMT', L.pmtPage('physics-revision/a-level-edexcel/practical-skills/'))],
        topics: [
          [1, 'Acceleration of free fall', 'free fall acceleration practical'],
          [2, 'Resistivity of a material', 'resistivity practical'],
          [3, 'EMF and internal resistance of a cell', 'internal resistance practical'],
          [4, 'Viscosity of a liquid (falling ball)', 'viscosity falling ball practical'],
          [5, "Young's modulus of a material", "Young's modulus practical"],
          [6, 'Speed of sound in air', 'speed of sound practical'],
          [7, 'Frequency of a vibrating string', 'vibrating string practical'],
          [8, 'Wavelength of light with a grating', 'diffraction grating practical'],
          [9, 'Change in momentum', 'momentum practical'],
          [10, 'Collisions between small spheres (ICT)', 'collisions practical'],
          [11, 'Capacitor charging and discharging', 'capacitor discharge practical'],
          [12, 'Calibrating a thermistor as a thermostat', 'thermistor calibration practical'],
          [13, 'Specific latent heat', 'specific latent heat practical'],
          [14, 'Pressure and volume of a gas', "Boyle's law practical"],
          [15, 'Absorption of gamma radiation by lead', 'gamma absorption practical'],
          [16, 'Mass from resonant frequencies', 'mass spring oscillation practical']
        ].map(function (c) {
          return { id: 'cp' + c[0], name: 'CP' + c[0] + ': ' + c[1], q: c[2],
            pts: ['Draw and label the apparatus', 'List the method in numbered steps, including how each variable is controlled', 'Know which graph to plot and how the gradient or intercept gives the answer', 'State the main sources of uncertainty and how to reduce them', 'Know the safety precautions'],
            res: [CP[c[0]]] };
        }) }
    ]
  });
})(window.RH = window.RH || {});
